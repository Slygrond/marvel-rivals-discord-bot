// src/commands/mr-patchnotes.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const api = require("../utils/marvelHttpClient");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mr-patchnotes")
    .setDescription("Shows latest Marvel Rivals patch notes from MarvelRivalsAPI.")
    .addIntegerOption((opt) =>
      opt
        .setName("count")
        .setDescription("How many patch notes to show (1–5)")
        .setMinValue(1)
        .setMaxValue(5)
    ),

  async execute(interaction) {
    const count = interaction.options.getInteger("count") || 5;

    await interaction.deferReply({ ephemeral: false });

    let patches;
    try {
      patches = await api.getPatchNotes();
    } catch (err) {
      console.error("mr-patchnotes error:", err);
      await interaction.editReply(
        "❌ Could not fetch patch notes from MarvelRivalsAPI right now."
      );
      return;
    }

    if (!Array.isArray(patches) || patches.length === 0) {
      await interaction.editReply("No patch notes were returned by the API.");
      return;
    }

    // ✅ Sort by date: newest first
    patches.sort((a, b) => {
      const da = a.patchDate ? new Date(a.patchDate).getTime() : 0;
      const db = b.patchDate ? new Date(b.patchDate).getTime() : 0;
      return db - da; // bigger (newer) date first
    });

    const slice = patches.slice(0, count);

    const embed = new EmbedBuilder()
      .setTitle("📄 Marvel Rivals — Latest Patch Notes")
      .setColor(0xffaa00)
      .setTimestamp(new Date());

    slice.forEach((item, index) => {
      const title = item.patchTitle || "Untitled Patch";
      const date = item.patchDate || "Unknown date";
      const type = item.patchType || "Patch Notes";
      const summary =
        item.previewText ||
        item.shortDescription ||
        item.short_description ||
        item.description ||
        "No summary provided.";

      embed.addFields({
        name: `${index + 1}. ${title} (${date})`,
        value: `${type}\n${summary.slice(0, 200)}${
          summary.length > 200 ? "..." : ""
        }`,
      });
    });

    await interaction.editReply({ embeds: [embed] });
  },
};
