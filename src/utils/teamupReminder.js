// src/utils/teamupReminder.js
const https = require("node:https");
const { EmbedBuilder } = require("discord.js");
const { loadSettings } = require("./teamupSettings");

const TEAMUP_API_KEY = process.env.TEAMUP_API_KEY;
const TEAMUP_CALENDAR_ID = process.env.TEAMUP_CALENDAR_ID;
const TEAMUP_PING_ROLE_ID = process.env.TEAMUP_PING_ROLE_ID; // role to ping (0-ONE)

const POLL_SECONDS = Number(process.env.TEAMUP_DEFAULT_POLL_SECONDS) || 60;

// Map friendly category names -> subcalendar IDs from .env
const CATEGORY_TO_ID = {
  lfs: process.env.TEAMUP_LFS_ID,
  matches: process.env.TEAMUP_MATCHES_ID,
  scrims: process.env.TEAMUP_SCRIMS_ID,
  timeoff: process.env.TEAMUP_TIME_OFF_ID,
  vods: process.env.TEAMUP_VODS_ID,
};

// keep track of what we already pinged so we don’t spam
const notifiedEventIds = new Set();

/**
 * Fetch events from Teamup between startISO and endISO.
 */
function fetchTeamupEvents(startISO, endISO) {
  return new Promise((resolve, reject) => {
    if (!TEAMUP_API_KEY || !TEAMUP_CALENDAR_ID) {
      return reject(
        new Error(
          "TEAMUP_API_KEY or TEAMUP_CALENDAR_ID missing from environment"
        )
      );
    }

    // startDate / endDate are date-only, Teamup expects YYYY-MM-DD
    const path = `/k/${TEAMUP_CALENDAR_ID}/events?startDate=${encodeURIComponent(
      startISO
    )}&endDate=${encodeURIComponent(endISO)}`;

    const options = {
      hostname: "api.teamup.com",
      path,
      method: "GET",
      headers: {
        "Teamup-Token": TEAMUP_API_KEY,
        "Content-Type": "application/json",
      },
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          console.error(
            "[teamupReminder] Non-2xx from Teamup:",
            res.statusCode,
            body.slice(0, 200)
          );
          return reject(
            new Error(`Teamup HTTP ${res.statusCode}: ${body.slice(0, 200)}`)
          );
        }

        try {
          const json = JSON.parse(body);
          resolve(json.events || []);
        } catch (err) {
          console.error("[teamupReminder] JSON parse error:", err, body);
          reject(err);
        }
      });
    });

    req.on("error", (err) => {
      console.error("[teamupReminder] Request error:", err);
      reject(err);
    });

    req.end();
  });
}

/**
 * Start periodic reminder loop.
 * Reads latest settings before each check so changes via slash commands
 * are picked up automatically.
 */
function startTeamupReminder(client) {
  console.log(
    `[teamupReminder] Starting reminder loop (poll: ${POLL_SECONDS}s)`
  );

  const intervalMs = POLL_SECONDS * 1000;

  setInterval(async () => {
    const settings = loadSettings();
    console.log("[teamupReminder] tick settings", settings);

    if (!settings.enabled || !settings.channelId) {
      return;
    }

    const channel = await client.channels
      .fetch(settings.channelId)
      .catch(() => null);
    if (!channel) {
      return;
    }

    const now = new Date();
    const leadMinutes = Number(settings.leadMinutes) || 15;
    const windowEnd = new Date(now.getTime() + leadMinutes * 60 * 1000);

    const startISO = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const endISO = windowEnd.toISOString().slice(0, 10); // YYYY-MM-DD

    let events;
    try {
      events = await fetchTeamupEvents(startISO, endISO);
    } catch (err) {
      console.error("[teamupReminder] Failed to fetch events:", err);
      return;
    }

    const chosenCategory = (settings.category || "matches").toLowerCase();
    let allowedSubcalendarId = null;
    if (chosenCategory !== "all") {
      allowedSubcalendarId = CATEGORY_TO_ID[chosenCategory];
    }

    const upcoming = events.filter((ev) => {
      const start = new Date(
        ev.start_dt || ev.start_dt_local || ev.start_dt_utc
      );
      if (isNaN(start.getTime())) return false;
      if (start <= now || start > windowEnd) return false;

      if (allowedSubcalendarId) {
        const subId = String(ev.subcalendar_id || "");
        if (subId !== String(allowedSubcalendarId)) return false;
      }
      return true;
    });

    for (const ev of upcoming) {
      const id = ev.id || ev.event_id;
      if (!id || notifiedEventIds.has(id)) continue;
      notifiedEventIds.add(id);

      const start = new Date(
        ev.start_dt || ev.start_dt_local || ev.start_dt_utc
      );
      const startStr = isNaN(start.getTime())
        ? "Unknown time"
        : start.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");

      const title = ev.title || "Untitled event";

      // Try to figure out calendar name (LFS, Matches, etc.)
      let calName =
        ev.subcalendar_name ||
        (ev.subcalendar && (ev.subcalendar.name || ev.subcalendar.title));
      if (!calName) {
        if (chosenCategory !== "all") calName = chosenCategory.toUpperCase();
        else calName = "Event";
      }

      // Build optional "Where" line: only if we have something
      const whereParts = [];
      if (ev.location) whereParts.push(ev.location);
      if (ev.who) whereParts.push(ev.who);
      const where = whereParts.join(" – ");

      const lead = Math.round((start - now) / 60000);

      const embed = new EmbedBuilder()
        .setTitle(`⏰ Upcoming ${calName}`)
        .setDescription(`Starts in ~${lead} minutes`)
        .addFields(
          { name: "Title", value: title, inline: false },
          { name: "When (UTC)", value: startStr, inline: false },
          ...(where
            ? [{ name: "Where", value: where, inline: false }]
            : [])
        )
        .setColor(0xffc857)
        .setTimestamp(start);

      const content = TEAMUP_PING_ROLE_ID
        ? `<@&${TEAMUP_PING_ROLE_ID}>`
        : undefined;

      await channel
        .send({
          content,
          embeds: [embed],
        })
        .catch((err) => {
          console.error("[teamupReminder] Failed to send message:", err);
        });
    }
  }, intervalMs);
}

module.exports = {
  startTeamupReminder,
};
