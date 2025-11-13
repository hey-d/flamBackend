const { v4: uuidv4 } = require("uuid");
const storage = require("./storage");
const dlq = require("./dlq");
const configModule = require("./config");

function createJobFromInput(inputJson) {
  const obj = typeof inputJson === "string" ? JSON.parse(inputJson) : inputJson;
  if (!obj.command) throw new Error("job must include command");
  const cfg = configModule.readConfig();
  const now = new Date().toISOString();
  const job = {
    id: obj.id || uuidv4(),
    command: obj.command,
    state: obj.state || "pending",
    attempts: obj.attempts || 0,
    max_retries: obj.max_retries || cfg.maxRetries || 3,
    created_at: obj.created_at || now,
    updated_at: obj.updated_at || now,

    available_at: obj.available_at || null,
  };
  storage.addJob(job);
  return job;
}

function listJobsByState(state) {
  const jobs = storage.getAllJobs();
  if (!state) return jobs;
  return jobs.filter((j) => j.state === state);
}

function markFailedAndMaybeRetry(job, err) {
  const cfg = configModule.readConfig();
  const attempts = (job.attempts || 0) + 1;
  if (attempts > job.max_retries) {
    const dead = {
      ...job,
      state: "dead",
      attempts,
      error: String(err),
      updated_at: new Date().toISOString(),
    };
    storage.updateJob(job.id, dead);
    dlq.pushToDLQ(dead);
    return { movedToDLQ: true, job: dead };
  } else {
    const base = cfg.backoffBase || 2;
    const delayMs = Math.pow(base, attempts) * 1000; // seconds
    const available_at = Date.now() + delayMs;
    const updated = {
      ...job,
      state: "pending",
      attempts,
      available_at,
      updated_at: new Date().toISOString(),
    };
    storage.updateJob(job.id, updated);
    return { retried: true, job: updated, delayMs };
  }
}

function retryDLQJob(jobId) {
  const job = dlq.popFromDLQ(jobId);
  if (!job) return null;

  const reset = { ...job };
  delete reset.error;
  reset.attempts = 0;
  reset.state = "pending";
  reset.available_at = null;
  storage.addJob(reset);
  return reset;
}

module.exports = {
  createJobFromInput,
  listJobsByState,
  markFailedAndMaybeRetry,
  retryDLQJob,
};
