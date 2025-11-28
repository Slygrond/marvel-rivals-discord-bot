// src/commands/mr-patchnotes.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const api = require("../utils/marvelHttpClient");

// Small helper to strip any HTML the API might send
function stripHtml(str = "") {
  return str.replace(/<[^>]*>/g, "");
}

// Limit text length for Discord embeds
function shorten(text, max = 250) {
  if (!text) return "";
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + "...";
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mr-patchnotes")
    .setDescription("Show the latest Marvel Rivals patch notes.")
    .addIntegerOption((opt) =>
      opt
        .setName("count")
        .setDescription("How many patch notes to show (1–5)")
        .setMinValue(1)
        .setMaxValue(5)
    ),

  async execute(interaction) {
    const count = interaction.options.getInteger("count") || 3;

    // We want this visible to everyone so no ephemeral here
    await interaction.deferReply();

    let patches;
    try {
      // Get a bunch, then we’ll sort and slice
      patches = await api.getPatchNotes(1, 25); // page 1, limit 25
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

    // Sort by date (newest first) – if patchDate is missing we push them to the end
    patches.sort((a, b) => {
      const da = a.patchDate ? new Date(a.patchDate) : 0;
      const db = b.patchDate ? new Date(b.patchDate) : 0;
      return db - da;
    });

    const slice = patches.slice(0, count);

    const embed = new EmbedBuilder()
      .setTitle("📄 Marvel Rivals — Latest Patch Notes")
      .setColor(0xffaa00)
      .setTimestamp(new Date());

    slice.forEach((p, index) => {
      const title = p.patchTitle || `Patch ${index + 1}`;
      const datePart = p.patchDate ? ` (${p.patchDate})` : "";
      const type = p.patchType || "Patch Notes";

      const rawSummary =
        p.previewText ||
        p.fullContent ||
        "No summary provided by the API.";

      const summary = shorten(stripHtml(rawSummary), 250);

      embed.addFields({
        name: `${index + 1}. ${title}${datePart}`,
        value: `${type}\n${summary}`
      });
    });

    await interaction.editReply({ embeds: [embed] });
  }
};
