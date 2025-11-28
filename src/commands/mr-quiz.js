// src/commands/mr-quiz.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const api = require("../utils/marvelHttpClient");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mr-quiz")
    .setDescription("Small hero role quiz (answer hidden as spoiler)."),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    let heroes;
    try {
      heroes = await api.getHeroes();
    } catch (err) {
      console.error("mr-quiz error:", err);
      await interaction.editReply(
        "❌ Could not fetch heroes from the API."
      );
      return;
    }

    if (!Array.isArray(heroes) || heroes.length === 0) {
      await interaction.editReply("No heroes available for quiz.");
      return;
    }

    const hero = heroes[Math.floor(Math.random() * heroes.length)];
    const name = hero.name || "Unknown Hero";
    const role = hero.role || hero.class || "Unknown role";

    const embed = new EmbedBuilder()
      .setTitle("❓ Hero Quiz")
      .setDescription(
        "What is the **role** of **" +
          name +
          "**?\n\nAnswer: ||" +
          role +
          "||"
      )
      .setColor(0xe67e22);

    await interaction.editReply({ embeds: [embed] });
  }
};
