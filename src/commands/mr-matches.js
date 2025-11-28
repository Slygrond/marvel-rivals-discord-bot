// src/commands/mr-matches.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const https = require("node:https");

/**
 * Call MarvelRivalsAPI: Player match history v2
 * GET /api/v2/player/{query}/match-history
 */
function fetchMatchHistory(player, limit = 5) {
  const encodedPlayer = encodeURIComponent(player);

  const options = {
    hostname: "marvelrivalsapi.com",
    path: `/api/v2/player/${encodedPlayer}/match-history?limit=${limit}`,
    method: "GET",
    headers: {
      Accept: "application/json",
      "x-api-key": process.env.MARVEL_RIVALS_API_KEY,
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
              `HTTP ${res.statusCode} from MarvelRivalsAPI: ${body.slice(0, 200)}`
            )
          );
        }

        try {
          const json = JSON.parse(body);
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

      const hero = mp.hero_name || "Unknown hero";
      const kills = mp.kills ?? 0;
      const deaths = mp.deaths ?? 0;
      const assists = mp.assists ?? 0;

      const mapId = m.map_name || m.match_map_id || "Unknown map";
      const duration = m.match_play_duration || "Unknown duration";
      const season = m.match_season || "Unknown season";

      const playerSide = mp.player_side;
      const winningSide = m.match_winner_side;
      let result = "Unknown result";
      if (
        typeof playerSide === "number" &&
        typeof winningSide === "number"
      ) {
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
          `Map: ${mapId} | Season: ${season}\n` +
          `K/D/A: ${kills}/${deaths}/${assists}\n` +
          `Duration: ${duration} | Time (UTC): ${time}`,
      });
    });

    await interaction.editReply({ embeds: [embed] });
  },
};
