// src/utils/teamupSettings.js
const fs = require("node:fs");
const path = require("node:path");

const SETTINGS_PATH = path.join(__dirname, "..", "..", "teamup-settings.json");

const DEFAULT_SETTINGS = {
  enabled: false,
  channelId: null,
  leadMinutes: Number(process.env.TEAMUP_DEFAULT_LEAD_MINUTES) || 15,
  category: "matches", // one of: lfs, matches, scrims, timeoff, vods, all
};

function loadSettings() {
  try {
    if (!fs.existsSync(SETTINGS_PATH)) {
      return { ...DEFAULT_SETTINGS };
    }
    const raw = fs.readFileSync(SETTINGS_PATH, "utf8");
    const parsed = JSON.parse(raw);

    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
    };
  } catch (err) {
    console.error("[teamupSettings] Failed to load settings:", err);
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings) {
  try {
    fs.writeFileSync(
      SETTINGS_PATH,
      JSON.stringify(settings, null, 2),
      "utf8"
    );
  } catch (err) {
    console.error("[teamupSettings] Failed to save settings:", err);
  }
}

module.exports = {
  SETTINGS_PATH,
  loadSettings,
  saveSettings,
  DEFAULT_SETTINGS,
};
