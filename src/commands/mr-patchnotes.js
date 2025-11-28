// src/commands/mr-patchnotes.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const api = require("../utils/marvelHttpClient");

// Helper: strip HTML tags
function stripHtml(str = "") {
  return str.replace(/<[^>]*>/g, "");
}

// Helper: shorten long text for embeds
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

    // Visible to everyone
    await interaction.deferReply();

    let raw;
    try {
      // Ask for plenty, we'll sort and slice
      raw = await api.getPatchNotes(1, 25);
      console.log("mr-patchnotes raw response type:", typeof raw);
    } catch (err) {
      console.error("mr-patchnotes API error:", err);
      await interaction.editReply(
        "❌ Could not fetch patch notes from MarvelRivalsAPI right now."
      );
      return;
    }

    // Accept both:
    //  - an array: [ {...}, {...} ]
    //  - an object: { formatted_patches: [ {...}, {...} ], total_patches: N }
    let patches;
    if (Array.isArray(raw)) {
      patches = raw;
    } else if (raw && Array.isArray(raw.formatted_patches)) {
      patches = raw.formatted_patches;
    } else {
      patches = [];
    }

    console.log(
      "mr-patchnotes parsed patches length:",
      patches ? patches.length : 0
    );

    if (!patches || patches.length === 0) {
      await interaction.editReply("No patch notes were returned by the API.");
      return;
    }

        // Sort by date (newest first). If no date, push to end.
    patches.sort((a, b) => {
      const da = a.patchDate ? new Date(a.patchDate) : 0;
      const db = b.patchDate ? new Date(b.patchDate) : 0;

      // if either date is missing, keep the one with a date before the one without
      if (!da && !db) return 0;
      if (!da) return 1;   // a has no date -> after b
      if (!db) return -1;  // b has no date -> after a

      // newest first
      return da - db; // invert to get latest patches at the top
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
