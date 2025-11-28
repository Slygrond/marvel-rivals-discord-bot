// src/utils/marvelHttpClient.js
const https = require("https");

// You can override this in .env if docs say something else.
// Example: MARVEL_RIVALS_API_BASE=https://api.marvelrivalsapi.com
const API_BASE =
  process.env.MARVEL_RIVALS_API_BASE || "https://marvelrivalsapi.com/api/v1";

// Use the same key name you already have in .env
// e.g. MR_API_KEY=xxxxxxxxxxxx
const API_KEY = process.env.MR_API_KEY;

/**
 * Simple GET helper for MarvelRivalsAPI.
 * path should start with `/`, e.g. `/heroes`
 */
function get(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);

    const options = {
      method: "GET",
      headers: {
        Accept: "application/json"
      }
    };

    // If the API expects a key, we send it. Adjust header name if docs say so.
    if (API_KEY) {
      // Many APIs use either Authorization: Bearer <key>
      // or x-api-key: <key>. Start with Bearer; change if docs differ.
      options.headers.Authorization = "Bearer " + API_KEY;
      // options.headers["x-api-key"] = API_KEY; // alternative if needed
    }

    const req = https.request(url, options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        // Non-2xx HTTP status → log and fail gracefully
        if (res.statusCode < 200 || res.statusCode >= 300) {
          console.error(
            "[Marvel API] Non-2xx status",
            res.statusCode,
            "for",
            url.toString(),
            "body snippet:",
            data.slice(0, 200)
          );
          return reject(
            new Error(`HTTP ${res.statusCode} from Marvel Rivals API`)
          );
        }

        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (err) {
          console.error(
            "[Marvel API] JSON parse error for",
            url.toString(),
            "body snippet:",
            data.slice(0, 200)
          );
          reject(new Error("Failed to parse Marvel Rivals API JSON response"));
        }
      });
    });

    req.on("error", (err) => {
      console.error("[Marvel API] Request error for", path, err);
      reject(err);
    });

    req.end();
  });
}

// Convenience helpers used by your commands
function getHeroes() {
  return get("/heroes");
}

function getHero(query) {
  return get("/heroes/hero/" + encodeURIComponent(query));
}

function getHeroLeaderboard(query) {
  return get(
    "/heroes/hero/" + encodeURIComponent(query) + "/leaderboard"
  );
}

function getNews() {
  return get("/news");
}

function getEvents() {
  return get("/events");
}

function getPlayer(username, platform) {
  let path = "/player/" + encodeURIComponent(username);
  if (platform) {
    path += "?platform=" + encodeURIComponent(platform);
  }
  return get(path);
}

module.exports = {
  get,
  getHeroes,
  getHero,
  getHeroLeaderboard,
  getNews,
  getEvents,
  getPlayer
};
