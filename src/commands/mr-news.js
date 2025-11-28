// src/commands/mr-news.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const api = require("../utils/marvelHttpClient");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mr-news")
    .setDescription("Shows latest Marvel Rivals news from MarvelRivalsAPI.")
    .addIntegerOption((opt) =>
      opt
        .setName("count")
        .setDescription("How many news items to show (1–5)")
        .setMinValue(1)
        .setMaxValue(5)
    ),

  async execute(interaction) {
    const count = interaction.options.getInteger("count") || 3;

    await interaction.deferReply({ ephemeral: false });

    let news;
    try {
      news = await api.getNews();
    } catch (err) {
      console.error("mr-news error:", err);
      await interaction.editReply(
        "❌ Could not fetch news from MarvelRivalsAPI right now."
      );
      return;
    }

    if (!Array.isArray(news) || news.length === 0) {
      await interaction.editReply("No news found right now.");
      return;
    }

    const slice = news.slice(0, count);

    const embed = new EmbedBuilder()
      .setTitle("📰 Marvel Rivals — Latest News")
      .setColor(0xffaa00)
      .setTimestamp(new Date());

    slice.forEach((item, index) => {
      const title = item.title || item.name || "Untitled";
      const url = item.url || item.link || "https://marvelrivalsapi.com/";
      const desc =
        item.summary ||
        item.description ||
        item.short_description ||
        "No description provided.";

      embed.addFields({
        name: (index + 1) + ". " + title,
        value: desc.slice(0, 150) + (desc.length > 150 ? "..." : "") + "\n" + url
      });
    });

    await interaction.editReply({ embeds: [embed] });
  }
};
