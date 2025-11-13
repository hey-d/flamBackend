const { execSync } = require("child_process");
const fse = require("fs-extra");
const path = require("path");
const CLI = path.resolve(__dirname, "..", "src", "cli.js");
const storage = require("../src/storage");
const workerManager = require("../src/workerManager");
const { v4: uuidv4 } = require("uuid");

async function main() {
  fse.writeJsonSync(path.resolve(__dirname, "..", "queue.json"), []);
  fse.writeJsonSync(path.resolve(__dirname, "..", "dlq.json"), []);

  const JOBS = 30;
  const WORKERS = 6;

  console.log(`Enqueuing ${JOBS} jobs`);
  for (let i = 0; i < JOBS; i++) {
    const job = {
      id: uuidv4(),
      command: "node -e \"setTimeout(()=>console.log('done'), 1000)\"",
      state: "pending",
      attempts: 0,
      max_retries: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    storage.addJob(job);
  }

  console.log("Starting workers...");
  const start = Date.now();
  await workerManager.startWorkers(WORKERS);

  while (true) {
    const all = storage.loadJobs();
    const remaining = all.filter(
      (j) => j.state === "pending" || j.state === "processing"
    );
    if (remaining.length === 0) break;
    await new Promise((r) => setTimeout(r, 500));
  }

  const end = Date.now();
  console.log("All done. Time (s):", ((end - start) / 1000).toFixed(2));

  const jobs = storage.loadJobs();
  const completed = jobs.filter((j) => j.state === "completed").length;
  const dead = jobs.filter((j) => j.state === "dead").length;
  console.log({ total: JOBS, completed, dead });

  await workerManager.stopWorkers();
}

main().catch((e) => console.error(e));
