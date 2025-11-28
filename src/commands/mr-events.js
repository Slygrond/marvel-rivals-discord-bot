// src/commands/mr-events.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const api = require("../utils/marvelHttpClient");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mr-events")
    .setDescription("Shows current or upcoming Marvel Rivals events."),

  async execute(interaction) {
    await interaction.deferReply();

    let events;
    try {
      events = await api.getEvents();
    } catch (err) {
      console.error("mr-events error:", err);
      await interaction.editReply(
        "❌ Could not fetch events from MarvelRivalsAPI right now."
      );
      return;
    }

    if (!Array.isArray(events) || events.length === 0) {
      await interaction.editReply("No events found right now.");
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("🎉 Marvel Rivals — Events")
      .setColor(0x00bfff)
      .setTimestamp(new Date());

    events.slice(0, 5).forEach((ev) => {
      const name = ev.name || ev.title || "Unnamed event";
      const desc =
        ev.description ||
        ev.summary ||
        "No description provided.";
      const url = ev.url || ev.link || "https://marvelrivalsapi.com/";
      const start = ev.startDate || ev.start || ev.begin || "";
      const end = ev.endDate || ev.end || "";

      let dates = "";
      if (start && end) {
        dates = "`" + start + " → " + end + "`";
      } else if (start) {
        dates = "`Starts: " + start + "`";
      }

      embed.addFields({
        name: "• " + name,
        value: (dates ? dates + "\n" : "") +
          desc.slice(0, 120) +
          (desc.length > 120 ? "..." : "") +
          "\n" +
          url
      });
    });

    await interaction.editReply({ embeds: [embed] });
  }
};
