// src/utils/teamupReminder.js
const https = require("node:https");
const { loadSettings } = require("./teamupSettings");

const TEAMUP_API_KEY = process.env.TEAMUP_API_KEY;
const TEAMUP_CALENDAR_ID = process.env.TEAMUP_CALENDAR_ID;
const POLL_SECONDS = Number(process.env.TEAMUP_DEFAULT_POLL_SECONDS) || 60;
// optional role to ping (e.g. 0-ONE)
const TEAMUP_PING_ROLE_ID = process.env.TEAMUP_PING_ROLE_ID || null;

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

    const path = `/${encodeURIComponent(
      TEAMUP_CALENDAR_ID
    )}/events?startDate=${encodeURIComponent(startISO)}&endDate=${encodeURIComponent(endISO)}`;

    console.log("[teamupReminder] Using path:", path);

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
          const events = json.events || [];
          console.log(
            `[teamupReminder] fetched ${events.length} events between ${startISO} and ${endISO}`
          );
          resolve(events);
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

    // --- debug: show current tick settings ---
    console.log("[teamupReminder] tick settings", {
      enabled: settings.enabled,
      category: settings.category,
      leadMinutes: settings.leadMinutes,
      channelId: settings.channelId,
    });

    if (!settings.enabled || !settings.channelId) {
      return;
    }

    const channel = await client.channels
      .fetch(settings.channelId)
      .catch(() => null);
    if (!channel) {
      console.warn(
        "[teamupReminder] Configured channel not found:",
        settings.channelId
      );
      return;
    }

    const now = new Date();
    const leadMinutes = Number(settings.leadMinutes) || 15;
    const windowEnd = new Date(now.getTime() + leadMinutes * 60 * 1000);

    const startISO = now.toISOString().slice(0, 10); // date only
    const endISO = windowEnd.toISOString().slice(0, 10); // date only

    let events;
    try {
      events = await fetchTeamupEvents(startISO, endISO);
    } catch (err) {
      console.error("[teamupReminder] Failed to fetch events:", err);
      return;
    }

    // Filter by category if not "all"
    const chosenCategory = (settings.category || "matches").toLowerCase();
    let allowedSubcalendarId = null;
    if (chosenCategory !== "all") {
      allowedSubcalendarId = CATEGORY_TO_ID[chosenCategory];
    }

    const upcoming = events.filter((ev) => {
      // Only future events within leadMinutes
      const start = new Date(
        ev.start_dt || ev.start_dt_local || ev.start_dt_utc
      );
      if (isNaN(start.getTime())) return false;

      if (start <= now || start > windowEnd) return false;

      // Category filter
      if (allowedSubcalendarId) {
        const subId = String(ev.subcalendar_id || "");
        if (subId !== String(allowedSubcalendarId)) return false;
      }

      return true;
    });

    console.log(
      `[teamupReminder] upcoming events to notify this tick: ${upcoming.length}`
    );

    for (const ev of upcoming) {
      const id = ev.id || ev.event_id;
      if (!id || notifiedEventIds.has(id)) continue;

      notifiedEventIds.add(id);

      const start = new Date(
        ev.start_dt || ev.start_dt_local || ev.start_dt_utc
      );
      const startStr = isNaN(start.getTime())
        ? "Unknown time"
        : start.toLocaleString("en-GB", { timeZone: "UTC" });

      const title = ev.title || "Untitled event";
      const where = ev.location || ev.who || "No location specified";
      const calName = ev.subcalendar_name || chosenCategory.toUpperCase();

      const lead = Math.round((start - now) / 60000);

      // optional role ping
      const rolePing = TEAMUP_PING_ROLE_ID
        ? `<@&${TEAMUP_PING_ROLE_ID}> `
        : "";

      const msg =
        `${rolePing}⏰ **Upcoming ${calName}** in ~${lead} minutes\n` +
        `**Title:** ${title}\n` +
        `**When (UTC):** ${startStr}\n` +
        `**Where:** ${where}`;

      await channel.send(msg).catch((err) => {
        console.error("[teamupReminder] Failed to send message:", err);
      });
    }
  }, intervalMs);
}

module.exports = {
  startTeamupReminder,
};
