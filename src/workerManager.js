const { exec } = require("child_process");
const storage = require("./storage");
const jobManager = require("./jobManager");
const dlq = require("./dlq");
const configModule = require("./config");
const chalk = require("chalk");

let workers = [];
let shuttingDown = false;

async function startWorkers(count = 1) {
  shuttingDown = false;
  for (let i = 0; i < count; i++) {
    const id = `worker-${Date.now()}-${i}`;
    const w = runWorkerLoop(id);
    workers.push({ id, promise: w });
  }
  return workers.map((w) => w.id);
}

async function runWorkerLoop(workerId) {
  const cfg = configModule.readConfig();
  while (!shuttingDown) {
    try {
      const job = storage.getAndLockNextPendingJob();
      if (!job) {
        await sleep(200);
        continue;
      }

      console.log(
        chalk.gray(`[${workerId}] picked job ${job.id} — ${job.command}`)
      );

      await executeCommand(job.command, workerId, job.id);
    } catch (e) {
      console.error("Worker loop error:", e);
      await sleep(200);
    }
  }
  console.log(chalk.yellow(`[${workerId}] shutting down gracefully`));
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

function executeCommand(command, workerId, jobId) {
  return new Promise((resolve) => {
    const child = exec(
      command,
      { timeout: 5 * 60 * 1000 },
      (error, stdout, stderr) => {
        if (!error) {
          storage.updateJob(jobId, {
            state: "completed",
            output: stdout,
            updated_at: new Date().toISOString(),
          });
          console.log(chalk.green(`[${workerId}] job ${jobId} completed`));
          resolve();
        } else {
          console.log(
            chalk.red(
              `[${workerId}] job ${jobId} failed: ${
                String(error.message).split("\n")[0]
              }`
            )
          );
          const res = jobManager.markFailedAndMaybeRetry(
            { ...storage.getAllJobs().find((j) => j.id === jobId) },
            error.message
          );
          if (res.movedToDLQ)
            console.log(chalk.red(`[${workerId}] job ${jobId} moved to DLQ`));
          else
            console.log(
              chalk.yellow(
                `[${workerId}] job ${jobId} scheduled for retry in ${Math.round(
                  res.delayMs / 1000
                )}s`
              )
            );
          resolve();
        }
      }
    );
  });
}

async function stopWorkers() {
  shuttingDown = true;

  await Promise.all(workers.map((w) => w.promise.catch(() => {})));
  workers = [];
}

function activeWorkerCount() {
  return workers.length;
}

module.exports = { startWorkers, stopWorkers, activeWorkerCount };
