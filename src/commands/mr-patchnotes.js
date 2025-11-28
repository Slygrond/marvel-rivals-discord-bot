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

    let data;
    try {
      // This returns an object like:
      // { total_patches: 50, formatted_patches: [ ... ] }
      data = await api.getPatchNotes();
    } catch (err) {
      console.error("mr-patchnotes error (request failed):", err);
      await interaction.editReply(
        "❌ Could not fetch patch notes from MarvelRivalsAPI right now."
      );
      return;
    }

    // Safely extract the array of patches
    const patches = Array.isArray(data)
      ? data
      : Array.isArray(data?.formatted_patches)
      ? data.formatted_patches
      : [];

    if (!patches.length) {
      console.warn("mr-patchnotes: no patches in API response:", data);
      await interaction.editReply("No patch notes were returned by the API.");
      return;
    }

    // ✅ Sort by date: newest first
    patches.sort((a, b) => {
      const da = a.patchDate ? Date.parse(a.patchDate) : 0;
      const db = b.patchDate ? Date.parse(b.patchDate) : 0;
      return db - da; // newer date first
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
