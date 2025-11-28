const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mr-ping")
    .setDescription("Check if the Marvel Rivals bot is alive."),
  async execute(interaction) {
    await interaction.reply("Marvel Rivals bot online ✅");
  }
};
