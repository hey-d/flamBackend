const fse = require("fs-extra");
const path = require("path");
const DLQ_PATH = path.resolve(__dirname, "..", "dlq.json");

function loadDLQ() {
  try {
    return fse.readJsonSync(DLQ_PATH);
  } catch (e) {
    fse.writeJsonSync(DLQ_PATH, []);
    return [];
  }
}

function saveDLQ(arr) {
  fse.writeJsonSync(DLQ_PATH + ".tmp", arr, { spaces: 2 });
  fse.moveSync(DLQ_PATH + ".tmp", DLQ_PATH, { overwrite: true });
}

function pushToDLQ(job) {
  const list = loadDLQ();
  list.push(job);
  saveDLQ(list);
}

function listDLQ() {
  return loadDLQ();
}

function popFromDLQ(jobId) {
  const list = loadDLQ();
  const idx = list.findIndex((j) => j.id === jobId);
  if (idx === -1) return null;
  const job = list.splice(idx, 1)[0];
  saveDLQ(list);
  return job;
}

module.exports = { pushToDLQ, listDLQ, popFromDLQ };
