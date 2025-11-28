// src/utils/marvelHttpClient.js
const https = require("node:https");

const BASE_URL = "https://marvelrivalsapi.com";
const API_KEY = process.env.MR_API_KEY;

/**
 * Low-level helper: GET JSON from MarvelRivalsAPI.
 * `path` must start with `/`, for example `/api/v1/patch-notes?page=1&limit=5`
 */
function httpGetJson(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);

    const options = {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    };

    if (API_KEY) {
      // If docs say something else, change header name here
      options.headers["x-api-key"] = API_KEY;
    }

    const req = https.request(url, options, (res) => {
      let rawData = "";

      res.on("data", (chunk) => {
        rawData += chunk;
      });

      res.on("end", () => {
        const snippet = rawData.slice(0, 200);

        // Non-2xx => log and reject
        if (res.statusCode < 200 || res.statusCode >= 300) {
          console.error(
            `[Marvel API] Non-2xx status ${res.statusCode} for ${url.toString()} body snippet: ${snippet}`
          );
          return reject(
            new Error(`HTTP ${res.statusCode} from Marvel Rivals API`)
          );
        }

        try {
          const json = JSON.parse(rawData);
          resolve(json);
        } catch (err) {
          console.error(
            `[Marvel API] JSON parse error for ${url.toString()} body snippet: ${snippet}`
          );
          reject(err);
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

/**
 * PATCH NOTES
 * MarvelRivalsAPI docs: GET /api/v1/patch-notes?page=1&limit=10
 */
function getPatchNotes(page = 1, limit = 5) {
  return httpGetJson(`/api/v1/patch-notes?page=${page}&limit=${limit}`);
}

/**
 * HEROES (endpoints guessed – adjust paths if docs differ)
 */
function getHeroes() {
  return httpGetJson("/api/v1/heroes");
}

function getHero(query) {
  return httpGetJson(`/api/v1/heroes/hero/${encodeURIComponent(query)}`);
}

function getHeroLeaderboard(query) {
  return httpGetJson(
    `/api/v1/heroes/hero/${encodeURIComponent(query)}/leaderboard`
  );
}

/**
 * PLAYER (for future, if commands use it)
 */
function getPlayer(username, platform) {
  let path = `/api/v1/player/${encodeURIComponent(username)}`;
  if (platform) {
    path += `?platform=${encodeURIComponent(platform)}`;
  }
  return httpGetJson(path);
}

function getMatchesByUid(uid, platform) {
  let path = `/api/v1/matches/${encodeURIComponent(uid)}`;
  if (platform) {
    path += `?platform=${encodeURIComponent(platform)}`;
  }
  return httpGetJson(path);
}

module.exports = {
  httpGetJson,
  getPatchNotes,
  getHeroes,
  getHero,
  getHeroLeaderboard,
  getPlayer,
  getMatchesByUid,
};
