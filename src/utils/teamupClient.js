// src/utils/teamupClient.js
const https = require("node:https");

const CALENDAR_KEY = process.env.TEAMUP_CALENDAR_KEY;
const TEAMUP_API_KEY = process.env.TEAMUP_API_KEY;

if (!CALENDAR_KEY || !TEAMUP_API_KEY) {
  console.warn(
    "[teamupClient] TEAMUP_CALENDAR_KEY or TEAMUP_API_KEY not set; Teamup integration disabled."
  );
}

/**
 * Fetch Teamup events between two dates.
 * startDate & endDate are JS Date objects.
 */
function fetchEventsBetween(startDate, endDate) {
  if (!CALENDAR_KEY || !TEAMUP_API_KEY) {
    return Promise.resolve([]);
  }

  const startStr = startDate.toISOString().slice(0, 10); // YYYY-MM-DD
  const endStr = endDate.toISOString().slice(0, 10);

  const query = new URLSearchParams({
    startDate: startStr,
    endDate: endStr,
  }).toString();

  const options = {
    hostname: "api.teamup.com",
    path: `/${CALENDAR_KEY}/events?${query}`,
    method: "GET",
    headers: {
      "Teamup-Token": TEAMUP_API_KEY,
      Accept: "application/json",
      "User-Agent": "0-ONE-MarvelRivalsDiscordBot/1.0",
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = "";

      res.on("data", (chunk) => {
        body += chunk;
      });

      res.on("end", () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          console.error(
            `[teamupClient] HTTP ${res.statusCode} from Teamup: ${body.slice(
              0,
              200
            )}`
          );
          return resolve([]);
        }

        try {
          const json = JSON.parse(body);
          const events = Array.isArray(json.events) ? json.events : [];
          return resolve(events);
        } catch (err) {
          console.error("[teamupClient] JSON parse error:", err);
          return resolve([]);
        }
      });
    });

    req.on("error", (err) => {
      console.error("[teamupClient] Request error:", err);
      reject(err);
    });

    req.end();
  });
}

module.exports = {
  fetchEventsBetween,
};
