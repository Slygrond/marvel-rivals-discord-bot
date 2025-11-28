const BASE_URL = "https://marvelrivalsapi.com/api/v1";

/**
 * Fetch player stats by username or UID.
 * `query` can be name or uid, but docs say uid is more reliable.
 */
async function fetchPlayerStats(query) {
  if (!process.env.MR_API_KEY) {
    throw new Error("MR_API_KEY is not set in .env");
  }

  const url = `${BASE_URL}/player/${encodeURIComponent(query)}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "x-api-key": process.env.MR_API_KEY
    }
  });

  if (res.status === 404) {
    return null; // player not found
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data;
}

module.exports = {
  fetchPlayerStats
};
