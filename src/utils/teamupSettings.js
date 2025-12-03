// src/utils/teamupSettings.js
const fs = require("node:fs");
const path = require("node:path");

const SETTINGS_PATH = path.join(__dirname, "..", "..", "data", "teamupSettings.json");

function readAll() {
  try {
    const raw = fs.readFileSync(SETTINGS_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeAll(all) {
  fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(all, null, 2), "utf8");
}

function getGuildSettings(guildId) {
  const all = readAll();
  return all[guildId] || null;
}

function setGuildSettings(guildId, partial) {
  const all = readAll();
  const current = all[guildId] || {};
  const updated = { ...current, ...partial };
  all[guildId] = updated;
  writeAll(all);
  return updated;
}

function getAllGuildSettings() {
  return readAll();
}

module.exports = {
  getGuildSettings,
  setGuildSettings,
  getAllGuildSettings,
};
