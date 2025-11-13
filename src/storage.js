const fse = require("fs-extra");
const path = require("path");
const QUEUE_PATH = path.resolve(__dirname, "..", "queue.json");

function loadJobs() {
  try {
    return fse.readJsonSync(QUEUE_PATH);
  } catch (e) {
    fse.writeJsonSync(QUEUE_PATH, []);
    return [];
  }
}

function saveJobs(jobs) {
  fse.writeJsonSync(QUEUE_PATH + ".tmp", jobs, { spaces: 2 });
  fse.moveSync(QUEUE_PATH + ".tmp", QUEUE_PATH, { overwrite: true });
}

function addJob(job) {
  const jobs = loadJobs();
  jobs.push(job);
  saveJobs(jobs);
}

function updateJob(jobId, patch) {
  const jobs = loadJobs();
  const idx = jobs.findIndex((j) => j.id === jobId);
  if (idx === -1) return null;
  jobs[idx] = { ...jobs[idx], ...patch };
  jobs[idx].updated_at = new Date().toISOString();
  saveJobs(jobs);
  return jobs[idx];
}

function getAllJobs() {
  return loadJobs();
}

function getAndLockNextPendingJob() {
  const jobs = loadJobs();
  const now = Date.now();
  const idx = jobs.findIndex(
    (j) => j.state === "pending" && (!j.available_at || j.available_at <= now)
  );
  if (idx === -1) return null;

  jobs[idx].state = "processing";
  jobs[idx].updated_at = new Date().toISOString();
  saveJobs(jobs);
  return jobs[idx];
}

module.exports = {
  loadJobs,
  saveJobs,
  addJob,
  updateJob,
  getAllJobs,
  getAndLockNextPendingJob,
};
