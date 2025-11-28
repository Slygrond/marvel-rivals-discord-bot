// src/commands/mr-matches.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const api = require("../utils/marvelHttpClient");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mr-matches")
    .setDescription("Shows your recent Marvel Rivals matches.")
    .addStringOption((opt) =>
      opt
        .setName("username")
        .setDescription("Player username")
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("platform")
        .setDescription("steam / epic / xbox / psn (optional)")
    ),

  async execute(interaction) {
    const username = interaction.options.getString("username");
    const platform = interaction.options.getString("platform") || "";

    await interaction.deferReply();

    let data;
    try {
      data = await api.getPlayer(username, platform);
    } catch (err) {
      console.error("mr-matches error:", err);
      await interaction.editReply(
        "❌ Could not fetch player data for `" + username + "`."
      );
      return;
    }

    // TODO: adjust this based on actual JSON:
    // console.log(JSON.stringify(data, null, 2));
    const matches =
      data.matches ||
      data.recentMatches ||
      data.matchHistory ||
      [];

    if (!matches.length) {
      await interaction.editReply("No matches found for `" + username + "`.");
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("📊 Recent Matches — " + username)
      .setColor(0x3498db);

    matches.slice(0, 5).forEach((m, i) => {
      const map = m.map || m.mapName || "Unknown map";
      const hero = m.hero || m.heroName || "Unknown hero";
      const result = m.result || m.outcome || "Unknown";
      const kills = m.kills != null ? m.kills : "?";
      const deaths = m.deaths != null ? m.deaths : "?";
      const assists = m.assists != null ? m.assists : "?";

      embed.addFields({
        name: "Match " + (i + 1),
        value:
          "**" +
          result +
          "** as **" +
          hero +
          "** on **" +
          map +
          "** — K/D/A: " +
          kills +
          "/" +
          deaths +
          "/" +
          assists
      });
    });

    await interaction.editReply({ embeds: [embed] });
  }
};
