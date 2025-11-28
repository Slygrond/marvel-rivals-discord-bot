// src/commands/mr-hero-roulette.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const api = require("../utils/marvelHttpClient");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mr-hero-roulette")
    .setDescription("Gives you a random hero to play!"),

  async execute(interaction) {
    await interaction.deferReply();

    let heroes;
    try {
      heroes = await api.getHeroes();
    } catch (err) {
      console.error("mr-hero-roulette error:", err);
      await interaction.editReply(
        "❌ Could not fetch heroes from the API."
      );
      return;
    }

    if (!Array.isArray(heroes) || heroes.length === 0) {
      await interaction.editReply("I couldn't get the hero list.");
      return;
    }

    const randomIndex = Math.floor(Math.random() * heroes.length);
    const hero = heroes[randomIndex];

    const name = hero.name || "Unknown Hero";
    const role = hero.role || hero.class || "Unknown role";

    const embed = new EmbedBuilder()
      .setTitle("🎰 Hero Roulette")
      .setDescription("You should play **" + name + "**!")
      .setColor(0x9b59b6)
      .addFields({ name: "Role", value: role.toString(), inline: true });

    if (hero.image || hero.icon) {
      embed.setThumbnail(hero.image || hero.icon);
    }

    await interaction.editReply({ embeds: [embed] });
  }
};
