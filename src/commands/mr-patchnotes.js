// src/commands/mr-patchnotes.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const api = require("../utils/marvelHttpClient");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mr-patchnotes")
    .setDescription("Show latest Marvel Rivals patch notes.")
    .addIntegerOption((opt) =>
      opt
        .setName("count")
        .setDescription("How many patch notes to show (1–5)")
        .setMinValue(1)
        .setMaxValue(5)
    ),

  async execute(interaction) {
    const count = interaction.options.getInteger("count") ?? 3;

    await interaction.deferReply({ ephemeral: false });

    try {
      // page 1, limit = count
      const data = await api.getPatchNotes(1, count);

      // API returns { total_patches, formatted_patches: [...] }
      const patches = Array.isArray(data?.formatted_patches)
        ? data.formatted_patches
        : Array.isArray(data)
        ? data
        : [];

      if (!patches.length) {
        await interaction.editReply("No patch notes found right now.");
        return;
      }

      const slice = patches.slice(0, count);

      const embed = new EmbedBuilder()
        .setTitle("📑 Marvel Rivals — Latest Patch Notes")
        .setColor(0xffaa00)
        .setTimestamp(new Date());

      slice.forEach((patch, idx) => {
        const title = patch.patchTitle || patch.title || "Untitled Patch";
        const date = patch.patchDate || patch.date || "Unknown date";
        const type = patch.patchType || "Patch Notes";
        const summary =
          patch.previewText ||
          patch.summary ||
          patch.description ||
          "No summary provided.";

        embed.addFields({
          name: `${idx + 1}. ${title} (${date})`,
          value:
            `${type}\n` +
            summary.slice(0, 200) +
            (summary.length > 200 ? "…" : "")
        });
      });

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error("mr-patchnotes error:", err);
      await interaction.editReply(
        "❌ Could not fetch patch notes from MarvelRivalsAPI right now."
      );
    }
  }
};
