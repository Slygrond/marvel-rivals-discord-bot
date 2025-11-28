// src/commands/mr-patchnotes.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const api = require("../utils/marvelHttpClient");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mr-patchnotes")
    .setDescription("Shows the latest Marvel Rivals patch notes from MarvelRivalsAPI.")
    .addIntegerOption((opt) =>
      opt
        .setName("count")
        .setDescription("How many patch notes to show (1–5)")
        .setMinValue(1)
        .setMaxValue(5)
    ),

  async execute(interaction) {
    const count = interaction.options.getInteger("count") || 3;

    // Public reply so others can see the patch notes
    await interaction.deferReply({ ephemeral: false });

    let patchNotes;
    try {
      // New helper (see marvelHttpClient.js)
      patchNotes = await api.getPatchNotes();
    } catch (err) {
      console.error("mr-patchnotes error:", err);
      await interaction.editReply(
        "❌ Could not fetch patch notes from MarvelRivalsAPI right now."
      );
      return;
    }

    if (
      !patchNotes ||
      !Array.isArray(patchNotes.formatted_patches) ||
      patchNotes.formatted_patches.length === 0
    ) {
      await interaction.editReply("No patch notes found right now.");
      return;
    }

    const slice = patchNotes.formatted_patches.slice(0, count);

    const embed = new EmbedBuilder()
      .setTitle("📝 Marvel Rivals — Latest Patch Notes")
      .setColor(0xffaa00)
      .setTimestamp(new Date());

    slice.forEach((item, index) => {
      const title = item.patchTitle || "Untitled Patch";
      const date = item.patchDate || "Unknown date";
      const type = item.patchType || "Patch Notes";
      const preview = (item.previewText || "No summary provided.").slice(0, 200);

      embed.addFields({
        name: `${index + 1}. ${title} (${date})`,
        value: `${type}\n${preview}${preview.length === 200 ? "..." : ""}`
      });
    });

    await interaction.editReply({ embeds: [embed] });
  }
};
