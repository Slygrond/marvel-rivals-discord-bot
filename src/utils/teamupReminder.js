// src/utils/teamupReminder.js
const { fetchEventsBetween } = require("./teamupClient");
const { getAllGuildSettings } = require("./teamupSettings");

const reminderMinutes = Number(process.env.TEAMUP_REMINDER_MINUTES || "15");

// guildId -> Set(eventKey) so we don't spam the same event
const notifiedPerGuild = new Map();

function startTeamupReminderLoop(client) {
  console.log(
    `[teamupReminder] Starting reminder loop (lead: ${reminderMinutes} minutes)`
  );

  async function checkOnce() {
    const settingsByGuild = getAllGuildSettings();
    const activeGuilds = Object.entries(settingsByGuild).filter(
      ([, s]) => s.enabled && s.channelId
    );

    if (activeGuilds.length === 0) return;

    const now = new Date();
    const windowEnd = new Date(now.getTime() + reminderMinutes * 60 * 1000);

    let events;
    try {
      events = await fetchEventsBetween(now, windowEnd);
    } catch (err) {
      console.error("[teamupReminder] Failed to fetch events:", err);
      return;
    }

    if (!Array.isArray(events) || events.length === 0) return;

    for (const [guildId, settings] of activeGuilds) {
      let notified = notifiedPerGuild.get(guildId);
      if (!notified) {
        notified = new Set();
        notifiedPerGuild.set(guildId, notified);
      }

      const channel = await client.channels
        .fetch(settings.channelId)
        .catch(() => null);

      if (!channel) {
        console.warn(
          `[teamupReminder] Could not fetch channel ${settings.channelId} for guild ${guildId}`
        );
        continue;
      }

      for (const ev of events) {
        if (!ev.start_dt) continue;

        const start = new Date(ev.start_dt);
        const minutesUntil = (start - now) / 60000;

        if (minutesUntil < 0 || minutesUntil > reminderMinutes) continue;

        const key = `${ev.id}:${ev.start_dt}`;
        if (notified.has(key)) continue;
        notified.add(key);

        const title = ev.title || "Untitled event";
        const where = ev.location || "";
        const who = ev.who || "";

        const whenLocal = start.toLocaleString("en-GB", {
          timeZone: "Europe/Istanbul",
          hour12: false,
        });

        let msg = `⏰ **${title}** starts in ~${Math.round(
          minutesUntil
        )} minutes (${whenLocal}).`;
        if (where) msg += `\n📍 ${where}`;
        if (who) msg += `\n👥 ${who}`;

        await channel.send(msg);
      }
    }
  }

  // run once immediately, then every minute
  checkOnce().catch(() => {});
  setInterval(() => {
    checkOnce().catch(() => {});
  }, 60 * 1000);
}

module.exports = { startTeamupReminderLoop };
