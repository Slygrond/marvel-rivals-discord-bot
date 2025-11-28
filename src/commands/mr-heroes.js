// src/commands/mr-heroes.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const api = require("../utils/marvelHttpClient");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mr-heroes")
    .setDescription("Look up info about a Marvel Rivals hero.")
    .addStringOption((opt) =>
      opt
        .setName("hero")
        .setDescription("Hero name or ID")
        .setRequired(true)
    ),

  async execute(interaction) {
    const query = interaction.options.getString("hero");

    await interaction.deferReply();

    let hero;
    try {
      hero = await api.getHero(query);
    } catch (err) {
      console.error("mr-heroes error:", err);
      await interaction.editReply(
        "❌ Could not fetch hero `" + query + "` from the API."
      );
      return;
    }

    // Depending on API, hero might be an object or { hero: {...} }
    const h = hero.hero || hero;

    if (!h || !h.name) {
      await interaction.editReply(
        "I couldn't find a hero that matches `" + query + "`."
      );
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("🦸 " + h.name)
      .setColor(0xff5555);

    const role = h.role || h.class || h.type || "Unknown role";
    const difficulty = h.difficulty || "N/A";
    const desc =
      h.description ||
      h.lore ||
      "No description / lore available.";

    embed.setDescription(desc);

    embed.addFields(
      { name: "Role", value: role.toString(), inline: true },
      { name: "Difficulty", value: difficulty.toString(), inline: true }
    );

    // If API gives you an icon or image URL, you can set it here:
    if (h.image || h.icon) {
      embed.setThumbnail(h.image || h.icon);
    }

    await interaction.editReply({ embeds: [embed] });
  }
};
