const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mr-coinflip")
    .setDescription("Flip a coin — heads or tails?")
    .addUserOption((option) =>
      option
        .setName("opponent")
        .setDescription("Optional opponent to @ for fun.")
        .setRequired(false)
    ),
  async execute(interaction) {
    const opponent = interaction.options.getUser("opponent");
    const result = Math.random() < 0.5 ? "Heads" : "Tails";

    let text = `🪙 Coin flip result: **${result}**!`;
    if (opponent) {
      text += `\nYou vs ${opponent} — destiny has spoken.`;
    }

    await interaction.reply(text);
  }
};
