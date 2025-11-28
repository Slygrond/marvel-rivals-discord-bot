// src/commands/mr-matches.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const https = require("node:https");

// Support both names just in case
const API_KEY =
  process.env.MR_API_KEY ||
  process.env.MARVEL_RIVALS_API_KEY ||
  process.env.MARVEL_RIVALS_APIKEY || // extra safety
  null;

/**
 * Call MarvelRivalsAPI: Player match history v2
 * GET /api/v2/player/{query}/match-history
 */
function fetchMatchHistory(player, limit = 5) {
  if (!API_KEY) {
    // Don't even try to hit the API without a key
    throw new Error(
      "Marvel Rivals API key is missing. Set MR_API_KEY in your .env file."
    );
  }

  const encodedPlayer = encodeURIComponent(player);

  const options = {
    hostname: "marvelrivalsapi.com",
    path: `/api/v2/player/${encodedPlayer}/match-history?limit=${limit}`,
    method: "GET",
    headers: {
      Accept: "application/json",
      "x-api-key": API_KEY,
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
          return reject(
            new Error(
              `HTTP ${res.statusCode} from MarvelRivalsAPI: ${body.slice(
                0,
                200
              )}`
            )
          );
        }

        try {
          const json = JSON.parse(body);

          // tiny debug log – just for you
          if (Array.isArray(json.match_history) && json.match_history[0]) {
            const mp = json.match_history[0].match_player || {};
            console.log("[mr-matches] sample match keys:", Object.keys(json.match_history[0]));
            console.log("[mr-matches] sample match_player keys:", Object.keys(mp));
          }

          resolve(json);
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on("error", (err) => reject(err));
    req.end();
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mr-matches")
    .setDescription("Show recent Marvel Rivals matches for a player.")
    .addStringOption((opt) =>
      opt
        .setName("player")
        .setDescription("Player UID or username")
        .setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt
        .setName("count")
        .setDescription("How many matches to show (1–5)")
        .setMinValue(1)
        .setMaxValue(5)
    ),

  async execute(interaction) {
    const player = interaction.options.getString("player", true);
    const count = interaction.options.getInteger("count") ?? 3;

    await interaction.deferReply(); // public reply

    let apiResponse;
    try {
      apiResponse = await fetchMatchHistory(player, count);
    } catch (err) {
      console.error("mr-matches error:", err);
      await interaction.editReply(
        "❌ Could not fetch match history from MarvelRivalsAPI right now."
      );
      return;
    }

    const matches = Array.isArray(apiResponse.match_history)
      ? apiResponse.match_history.slice(0, count)
      : [];

    if (matches.length === 0) {
      await interaction.editReply("No matches found for that player.");
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`🎮 Recent matches for ${player}`)
      .setColor(0x00aeff)
      .setTimestamp(new Date());

    matches.forEach((m, idx) => {
      const mp = m.match_player || {};

      // Try multiple possible field names for hero
      const hero =
        mp.hero_name ||
        mp.hero ||
        mp.heroId ||
        mp.hero_id ||
        "Unknown hero";

      const kills = mp.kills ?? 0;
      const deaths = mp.deaths ?? 0;
      const assists = mp.assists ?? 0;

      // Map info – show name if API ever adds it, otherwise ID
      const map =
        m.map_name ||
        m.map ||
        m.map_full_name ||
        m.match_map_id ||
        "Unknown map";

      const season = m.match_season || m.season || "Unknown season";

      // Duration: the API example shows "match_play_duration": "8m 59s"
      const duration =
        m.match_play_duration ||
        m.duration ||
        (m.match_duration ? `${m.match_duration}s` : "Unknown duration");

      // Result (win/loss), try several possible field names for player team
      const playerSide =
        mp.player_side ??
        mp.player_team ??
        mp.team_id ??
        mp.side ??
        null;
      const winningSide = m.match_winner_side ?? m.winner_side ?? null;

      let result = "Unknown result";
      if (typeof playerSide === "number" && typeof winningSide === "number") {
        result = winningSide === playerSide ? "WIN" : "LOSS";
      }

      const time =
        m.match_time_stamp != null
          ? new Date(m.match_time_stamp * 1000).toLocaleString("en-GB", {
              timeZone: "UTC",
            })
          : "Unknown time";

      embed.addFields({
        name: `${idx + 1}. ${result} as ${hero}`,
        value:
          `Map: ${map} | Season: ${season}\n` +
          `K/D/A: ${kills}/${deaths}/${assists}\n` +
          `Duration: ${duration} | Time (UTC): ${time}`,
      });
    });

    await interaction.editReply({ embeds: [embed] });
  },
};
