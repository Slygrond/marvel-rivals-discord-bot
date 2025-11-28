// src/utils/marvelHttpClient.js
const https = require("https");

// Origin (no /api/v1 here)
const API_ORIGIN =
  process.env.MARVEL_RIVALS_API_ORIGIN || "https://marvelrivalsapi.com";

// Path prefix for the actual API
const API_PREFIX =
  process.env.MARVEL_RIVALS_API_PREFIX || "/api/v1";

// Use same key name as your other Marvel API usage
const API_KEY = process.env.MR_API_KEY;

/**
 * Generic GET helper.
 * `path` should start with `/`, e.g. `/news`, `/heroes`, `/player/...`
 */
function get(path) {
  return new Promise((resolve, reject) => {
    const fullPath = API_PREFIX.replace(/\/$/, "") + path; // "/api/v1" + "/news" = "/api/v1/news"
    const url = new URL(fullPath, API_ORIGIN); // -> https://marvelrivalsapi.com/api/v1/news

    const options = {
      method: "GET",
      headers: {
        Accept: "application/json"
      }
    };

    if (API_KEY) {
      // Adjust header name if MarvelRivalsAPI docs say something else
      options.headers["x-api-key"] = API_KEY;
      // or: options.headers.Authorization = "Bearer " + API_KEY;
    }

    const req = https.request(url, options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        const snippet = data.slice(0, 200);

        // Non-2xx → log + reject
        if (res.statusCode < 200 || res.statusCode >= 300) {
          console.error(
            "[Marvel API] Non-2xx status",
            res.statusCode,
            "for",
            url.toString(),
            "body snippet:",
            snippet
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
            snippet
          );
          reject(
            new Error("Failed to parse Marvel Rivals API JSON response")
          );
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
  return get("/heroes/hero/" + encodeURIComponent(query) + "/leaderboard");
}

function getPatchNotes(page = 1, limit = 10) {
  // MarvelRivalsAPI: GET /api/v1/patch-notes
  return httpGetJson(`/api/v1/patch-notes?page=${page}&limit=${limit}`);
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
  getPatchNotes,
  getEvents,
  getPlayer
};
