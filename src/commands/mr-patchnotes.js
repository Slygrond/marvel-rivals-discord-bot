// src/commands/mr-patchnotes.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const https = require("https");

// Small helper to GET JSON over HTTPS
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch (err) {
            reject(err);
          }
        });
      })
      .on("error", (err) => reject(err));
  });
}

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

    let apiData;
    try {
      apiData = await fetchJson(
        "https://marvelrivalsapi.com/api/v1/patch-notes?page=1&limit=20"
      );
    } catch (err) {
      console.error("mr-patchnotes error (request failed):", err);
      await interaction.editReply(
        "❌ Could not fetch patch notes from MarvelRivalsAPI right now."
      );
      return;
    }

    // Log a summary of what we actually got (for debugging in pm2 logs)
    try {
      console.log("[mr-patchnotes] top-level keys:", Object.keys(apiData || {}));
    } catch (_) {}

    // Try several possible shapes to find an array of patches
    const candidates = [
      apiData?.formatted_patches,
      apiData?.patch_notes,
      apiData?.patches,
      apiData?.data?.formatted_patches,
      apiData?.data?.patch_notes,
      apiData?.data?.patches,
      apiData, // in case it's already an array at root
    ];

    let patches = [];
    for (const c of candidates) {
      if (Array.isArray(c) && c.length > 0) {
        patches = c;
        break;
      }
    }

    if (!patches.length) {
      console.warn("[mr-patchnotes] no patches array found in API response:", apiData);
      await interaction.editReply("No patch notes were returned by the API.");
      return;
    }

    // Sort newest first using patchDate (YYYY-MM-DD if present)
    patches.sort((a, b) => {
      const da = a.patchDate ? Date.parse(a.patchDate) : 0;
      const db = b.patchDate ? Date.parse(b.patchDate) : 0;
      return db - da;
    });

    const slice = patches.slice(0, count);

    const embed = new EmbedBuilder()
      .setTitle("📄 Marvel Rivals — Latest Patch Notes")
      .setColor(0xffaa00)
      .setTimestamp(new Date());

    slice.forEach((item, index) => {
      const title =
        item.patchTitle || item.title || item.name || "Untitled Patch";
      const date =
        item.patchDate || item.date || item.released_at || "Unknown date";
      const type = item.patchType || item.type || "Patch Notes";

      const summarySource =
        item.previewText ||
        item.shortDescription ||
        item.short_description ||
        item.description ||
        "";

      const summary =
        summarySource && summarySource.trim().length > 0
          ? summarySource
          : "No summary provided.";

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
