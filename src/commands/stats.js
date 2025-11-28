const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { fetchPlayerStats } = require("../utils/marvelApi");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mr-stats")
    .setDescription("Show Marvel Rivals stats for a player.")
    .addStringOption((option) =>
      option
        .setName("player")
        .setDescription("Player UID or username (UID is more reliable).")
        .setRequired(true)
    ),
  async execute(interaction) {
    const query = interaction.options.getString("player", true);

    await interaction.deferReply(); // in case API is a bit slow

    try {
      const data = await fetchPlayerStats(query);

      if (!data) {
        await interaction.editReply(
          `❌ No player found for \`${query}\`. Try using the **UID** instead of username if possible.`
        );
        return;
      }

      // The API response structure (simplified):
      // - data.player (basic profile)
      // - data.overall_stats.ranked / .unranked (totals):contentReference[oaicite:3]{index=3}
      const player = data.player ?? {};
      const stats = data.overall_stats ?? {};
      const ranked = stats.ranked ?? {};
      const unranked = stats.unranked ?? {};

      const name = player.name ?? data.name ?? query;
      const uid = data.uid ?? player.uid ?? "Unknown";

      const totalMatches = stats.total_matches ?? ranked.total_matches ?? 0;
      const totalWins = stats.total_wins ?? ranked.total_wins ?? 0;
      const winRate =
        totalMatches > 0
          ? ((totalWins / totalMatches) * 100).toFixed(1)
          : "0.0";

      const kills = ranked.total_kills ?? 0;
      const deaths = ranked.total_deaths ?? 0;
      const assists = ranked.total_assists ?? 0;
      const kd =
        deaths > 0 ? (kills / deaths).toFixed(2) : kills > 0 ? "∞" : "0.00";

      const rankObj = player.rank ?? {};
      const rankName = rankObj.rank ?? "Unknown";

      const embed = new EmbedBuilder()
        .setTitle(`Marvel Rivals Stats – ${name}`)
        .setDescription(
          `UID: \`${uid}\`\nRank: **${rankName}**\nPlatform: \`${
            player.info?.login_os ?? "Unknown"
          }\``
        )
        .addFields(
          {
            name: "Overall",
            value: [
              `Matches: **${totalMatches}**`,
              `Wins: **${totalWins}**`,
              `Win rate: **${winRate}%**`
            ].join("\n"),
            inline: true
          },
          {
            name: "Ranked Totals",
            value: [
              `Kills: **${kills}**`,
              `Deaths: **${deaths}**`,
              `Assists: **${assists}**`,
              `K/D: **${kd}**`
            ].join("\n"),
            inline: true
          },
          {
            name: "Time Played (Ranked)",
            value:
              ranked.total_time_played ??
              `${ranked.total_time_played_raw ?? 0}s`,
            inline: true
          }
        )
        .setFooter({
          text: "Data via MarvelRivalsAPI.com"
        })
        .setTimestamp();

      if (data.isPrivate) {
        embed.setFooter({
          text: "Player profile is marked as private — some stats may be hidden. Data via MarvelRivalsAPI.com"
        });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error("mr-stats error:", err);
      await interaction.editReply(
        "⚠️ There was an error contacting the Marvel Rivals API. Try again later."
      );
    }
  }
};
