const fse = require("fs-extra");
const path = require("path");
const CONFIG_PATH = path.resolve(__dirname, "..", "config.json");

function readConfig() {
  try {
    return fse.readJsonSync(CONFIG_PATH);
  } catch (e) {
    const defaultConf = { maxRetries: 3, backoffBase: 2 };
    fse.writeJsonSync(CONFIG_PATH, defaultConf, { spaces: 2 });
    return defaultConf;
  }
}

function setConfig(key, value) {
  const cfg = readConfig();
  if (!(key in cfg)) throw new Error("Unknown config key: " + key);

  const parsed = isNaN(value) ? value : Number(value);
  cfg[key] = parsed;
  fse.writeJsonSync(CONFIG_PATH, cfg, { spaces: 2 });
  return cfg;
}

module.exports = { readConfig, setConfig };
