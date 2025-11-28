// src/commands/mr-build-my-team.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const api = require("../utils/marvelHttpClient");

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mr-build-my-team")
    .setDescription("Suggests a fun 3-hero team comp."),

  async execute(interaction) {
    await interaction.deferReply();

    let heroes;
    try {
      heroes = await api.getHeroes();
    } catch (err) {
      console.error("mr-build-my-team error:", err);
      await interaction.editReply(
        "❌ Could not fetch heroes from the API."
      );
      return;
    }

    if (!Array.isArray(heroes) || heroes.length < 3) {
      await interaction.editReply("Not enough heroes received from the API.");
      return;
    }

    // Very simple role-based logic: try to pick Frontline / Vanguard / Support
    const front = [];
    const damage = [];
    const support = [];

    heroes.forEach((h) => {
      const role = (h.role || h.class || "").toString().toLowerCase();
      if (role.indexOf("tank") !== -1 || role.indexOf("front") !== -1) {
        front.push(h);
      } else if (role.indexOf("support") !== -1 || role.indexOf("heal") !== -1) {
        support.push(h);
      } else {
        damage.push(h);
      }
    });

    const team = [];
    if (front.length > 0) team.push(pickRandom(front));
    if (damage.length > 0) team.push(pickRandom(damage));
    if (support.length > 0) team.push(pickRandom(support));

    // If we still have < 3 heroes (roles were weird), just fill from the full list
    while (team.length < 3) {
      const candidate = pickRandom(heroes);
      if (!team.includes(candidate)) team.push(candidate);
    }

    const embed = new EmbedBuilder()
      .setTitle("🧩 Suggested Team")
      .setColor(0x1abc9c);

    team.forEach((h, i) => {
      const name = h.name || "Hero " + (i + 1);
      const role = h.role || h.class || "Unknown role";
      embed.addFields({
        name: "Slot " + (i + 1),
        value: "**" + name + "** – " + role
      });
    });

    await interaction.editReply({ embeds: [embed] });
  }
};
