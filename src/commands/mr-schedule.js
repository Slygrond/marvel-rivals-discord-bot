// src/commands/mr-schedule.js
const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mr-schedule")
    .setDescription("Shows the 0-ONE Marvel Rivals schedule link (only you can see it)."),

  async execute(interaction) {
    const link = "https://teamup.com/ksrxy8a5bfgjxffxd7";

    await interaction.reply({
      content: "🗓️ 0-ONE schedule: " + link,
      ephemeral: true
    });
  }
};
