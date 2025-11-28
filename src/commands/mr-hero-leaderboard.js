// src/commands/mr-hero-leaderboard.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const api = require("../utils/marvelHttpClient");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mr-hero-leaderboard")
    .setDescription("Shows a leaderboard for a specific hero.")
    .addStringOption((opt) =>
      opt
        .setName("hero")
        .setDescription("Hero name or ID")
        .setRequired(true)
    ),

  async execute(interaction) {
    const heroName = interaction.options.getString("hero");

    await interaction.deferReply();

    let data;
    try {
      data = await api.getHeroLeaderboard(heroName);
    } catch (err) {
      console.error("mr-hero-leaderboard error:", err);
      await interaction.editReply(
        "❌ Could not fetch leaderboard for `" + heroName + "`."
      );
      return;
    }

    // console.log(JSON.stringify(data, null, 2));
    const list = data.leaderboard || data.players || data || [];

    if (!Array.isArray(list) || list.length === 0) {
      await interaction.editReply("No leaderboard data found.");
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("🏆 " + heroName + " — Leaderboard (Top 10)")
      .setColor(0xf1c40f);

    list.slice(0, 10).forEach((p, i) => {
      const name = p.username || p.name || "Player";
      const rank = p.rank || p.position || (i + 1);
      const rating = p.rating || p.mmr || p.score || "?";

      embed.addFields({
        name: "#" + rank + " " + name,
        value: "Rating: **" + rating + "**"
      });
    });

    await interaction.editReply({ embeds: [embed] });
  }
};
