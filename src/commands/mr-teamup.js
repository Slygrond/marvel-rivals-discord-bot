// src/commands/mr-teamup.js
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const { loadSettings, saveSettings } = require("../utils/teamupSettings");

const CATEGORY_CHOICES = [
  { name: "LFS", value: "lfs" },
  { name: "Matches", value: "matches" },
  { name: "Scrims", value: "scrims" },
  { name: "Time Off", value: "timeoff" },
  { name: "VODs", value: "vods" },
  { name: "All calendars", value: "all" },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mr-teamup")
    .setDescription("Configure Teamup calendar reminders")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName("channel")
        .setDescription("Set the channel where reminders are sent")
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("Channel for reminders")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("toggle")
        .setDescription("Enable or disable Teamup reminders")
        .addBooleanOption((opt) =>
          opt
            .setName("enabled")
            .setDescription("true = on, false = off")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("category")
        .setDescription("Choose which type of calendar events to remind about")
        .addStringOption((opt) =>
          opt
            .setName("type")
            .setDescription("Event category")
            .setRequired(true)
            .addChoices(...CATEGORY_CHOICES)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("lead")
        .setDescription(
          "Set how many minutes before an event the reminder triggers"
        )
        .addIntegerOption((opt) =>
          opt
            .setName("minutes")
            .setDescription("Lead time in minutes (e.g., 5, 10, 15, 30)")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(240)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("status").setDescription("Show current Teamup reminder status")
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    let settings = loadSettings() || {};

    if (sub === "channel") {
      const channel = interaction.options.getChannel("channel", true);
      settings.channelId = channel.id;
      saveSettings(settings);

      await interaction.reply(
        `✅ Reminders will be sent in ${channel} (id: \`${channel.id}\`).`
      );
      return;
    }

    if (sub === "toggle") {
      const enabled = interaction.options.getBoolean("enabled", true);
      settings.enabled = enabled;
      saveSettings(settings);

      await interaction.reply(
        `🔔 Teamup reminders are now **${enabled ? "ENABLED" : "DISABLED"}**.`
      );
      return;
    }

    if (sub === "category") {
      const type = interaction.options.getString("type", true);
      settings.category = type;
      saveSettings(settings);

      const friendly =
        CATEGORY_CHOICES.find((c) => c.value === type)?.name || type;

      await interaction.reply(`📅 Reminder category set to **${friendly}**.`);
      return;
    }

    if (sub === "lead") {
      const minutes = interaction.options.getInteger("minutes", true);
      settings.leadMinutes = minutes;
      saveSettings(settings);

      await interaction.reply(
        `⏰ Lead time set to **${minutes} minutes** before events.`
      );
      return;
    }

    if (sub === "status") {
      // fallbacks so we never get undefined / crash
      const enabled = settings.enabled ?? false;
      const leadMinutes = settings.leadMinutes ?? 15;

      const channelText = settings.channelId
        ? `<#${settings.channelId}> (\`${settings.channelId}\`)`
        : "`not set`";

      const friendlyCategory =
        CATEGORY_CHOICES.find((c) => c.value === settings.category)?.name ||
        settings.category ||
        "Matches";

      const embed = new EmbedBuilder()
        .setTitle("📊 Teamup reminder status")
        .setColor(0x00ae86)
        .addFields(
          {
            name: "Enabled",
            value: enabled ? "✅ Yes" : "🚫 No",
            inline: true,
          },
          {
            name: "Channel",
            value: channelText,
            inline: true,
          },
          {
            name: "Category",
            value: friendlyCategory,
            inline: true,
          },
          {
            name: "Lead time",
            value: `${leadMinutes} minutes`,
            inline: true,
          }
        );

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    await interaction.reply("Unknown subcommand.");
  },
};
