// src/utils/marvelHttpClient.js
const https = require("https");

const API_HOST = "marvelrivalsapi.com";
const API_BASE = "/api/v1";

/**
 * Simple GET helper for MarvelRivalsAPI.
 * path should start with `/`, e.g. `/heroes`.
 */
function get(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_HOST,
      path: API_BASE + path,
      method: "GET",
      headers: {
        // If your plan needs a key, keep this. If not, you can remove it.
        Authorization: "Bearer " + process.env.MARVEL_RIVALS_API_KEY,
        Accept: "application/json"
      }
    };

    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on("error", reject);
    req.end();
  });
}

// Convenience helpers
function getHeroes() {
  return get("/heroes");
}

function getHero(query) {
  // By name or ID
  return get("/heroes/hero/" + encodeURIComponent(query));
}

function getHeroLeaderboard(query) {
  // Endpoint name is my best guess; adjust if docs differ
  return get("/heroes/hero/" + encodeURIComponent(query) + "/leaderboard");
}

function getNews() {
  return get("/news");
}

function getEvents() {
  return get("/events");
}

function getPlayer(username, platform) {
  // Same player endpoint the docs mention
  var path = "/player/" + encodeURIComponent(username);
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
