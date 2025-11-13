#!/usr/bin/env node
const { program } = require("commander");
const chalk = require("chalk");
const jobManager = require("./jobManager");
const storage = require("./storage");
const dlq = require("./dlq");
const workerManager = require("./workerManager");
const configModule = require("./config");

program
  .name("queuectl")
  .description("QueueCTL - simple job queue CLI")
  .version("0.1.0");

program
  .command("enqueue <jobJson>")
  .description("Add a new job using JSON string (must include command)")
  .action((jobJson) => {
    try {
      const job = jobManager.createJobFromInput(jobJson);
      console.log(chalk.green("Enqueued job:"), job.id);
    } catch (e) {
      console.error(chalk.red("Error enqueuing job:"), e.message);
    }
  });

program
  .command("worker start")
  .option("--count <n>", "Number of workers", "1")
  .description("Start worker(s)")
  .action(async (opts) => {
    const n = Number(opts.count || 1);
    const ids = await workerManager.startWorkers(n);
    console.log(chalk.green("Started workers:"), ids.join(", "));
    console.log(
      chalk.gray(
        "Press Ctrl+C to stop. Or run `queuectl worker stop` from another shell."
      )
    );
  });

program
  .command("worker stop")
  .description("Stop workers gracefully")
  .action(async () => {
    await workerManager.stopWorkers();
    console.log(chalk.yellow("Workers stopped"));
  });

program
  .command("status")
  .description("Show job state counts and active workers")
  .action(() => {
    const jobs = storage.getAllJobs();
    const counts = jobs.reduce((acc, j) => {
      acc[j.state] = (acc[j.state] || 0) + 1;
      return acc;
    }, {});
    console.log("Job counts:", counts);
    console.log("Active workers:", workerManager.activeWorkerCount());
  });

program
  .command("list")
  .option("--state <state>", "Filter by state")
  .description("List jobs (optionally filter)")
  .action((opts) => {
    const arr = jobManager.listJobsByState(opts.state);
    console.table(
      arr.map((j) => ({
        id: j.id,
        cmd: j.command,
        state: j.state,
        attempts: j.attempts,
      }))
    );
  });

program
  .command("dlq list")
  .description("List DLQ jobs")
  .action(() => {
    const list = dlq.listDLQ();
    console.table(
      list.map((j) => ({
        id: j.id,
        cmd: j.command,
        attempts: j.attempts,
        error: j.error,
      }))
    );
  });

program
  .command("dlq retry <jobId>")
  .description("Retry a job in DLQ (moves it back to queue)")
  .action((jobId) => {
    const job = jobManager.retryDLQJob(jobId);
    if (!job) console.log(chalk.red("Job not found in DLQ"));
    else console.log(chalk.green("Re-enqueued job from DLQ:"), job.id);
  });

program
  .command("config set <key> <value>")
  .description("Set config key")
  .action((key, value) => {
    try {
      const cfg = configModule.setConfig(key, value);
      console.log(chalk.green("Config updated:"), cfg);
    } catch (e) {
      console.error(chalk.red("Config error:"), e.message);
    }
  });

program.parse(process.argv);
