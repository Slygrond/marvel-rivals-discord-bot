// src/commands/mr-teamup.js
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require("discord.js");
const {
  getGuildSettings,
  setGuildSettings,
} = require("../utils/teamupSettings");

const reminderMinutes = Number(process.env.TEAMUP_REMINDER_MINUTES || "15");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mr-teamup")
    .setDescription("Configure Teamup calendar reminders.")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName("set-channel")
        .setDescription("Set the channel where reminders will be sent.")
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("Text channel for reminders")
            .addChannelTypes(
              ChannelType.GuildText,
              ChannelType.GuildAnnouncement
            )
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("enable").setDescription("Enable Teamup reminders.")
    )
    .addSubcommand((sub) =>
      sub.setName("disable").setDescription("Disable Teamup reminders.")
    )
    .addSubcommand((sub) =>
      sub.setName("status").setDescription("Show current Teamup reminder status.")
    ),

  async execute(interaction) {
    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({
        content: "This command can only be used in a server.",
        ephemeral: true,
      });
      return;
    }

    const guildId = guild.id;
    const sub = interaction.options.getSubcommand();

    if (sub === "set-channel") {
      const channel = interaction.options.getChannel("channel", true);

      const settings = setGuildSettings(guildId, {
        channelId: channel.id,
      });

      await interaction.reply({
        content: `✅ Teamup reminders channel set to ${channel}.`,
        ephemeral: true,
      });
    } else if (sub === "enable") {
      const settings = setGuildSettings(guildId, {
        enabled: true,
      });

      const where = settings.channelId
        ? `<#${settings.channelId}>`
        : "no channel set yet";

      await interaction.reply({
        content: `✅ Teamup reminders **enabled**. Current channel: ${where}.`,
        ephemeral: true,
      });
    } else if (sub === "disable") {
      setGuildSettings(guildId, { enabled: false });

      await interaction.reply({
        content: "⏹️ Teamup reminders **disabled** for this server.",
        ephemeral: true,
      });
    } else if (sub === "status") {
      const settings = getGuildSettings(guildId) || {};
      const enabled = settings.enabled ? "ON ✅" : "OFF ⛔";
      const channel =
        settings.channelId ? `<#${settings.channelId}>` : "not set";

      await interaction.reply({
        content:
          `📊 **Teamup status**\n` +
          `• Reminders: ${enabled}\n` +
          `• Channel: ${channel}\n` +
          `• Lead time: ${reminderMinutes} minutes`,
        ephemeral: true,
      });
    }
  },
};
