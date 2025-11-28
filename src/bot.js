require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const { Client, GatewayIntentBits, Collection, ActivityType, Events } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Load commands from src/commands
client.commands = new Collection();
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.warn(
      `[WARN] Command at ${file} is missing "data" or "execute" property.`
    );
  }
}

client.once(Events.ClientReady, (c) => {
  console.log(`✅ Logged in as ${c.user.tag}`);

  // Set status: Playing with 0-ONE
  c.user.setPresence({
    activities: [
      {
        // Discord will show this as "Playing with 0-ONE"
        name: "with 0-ONE",
        type: ActivityType.Playing
      }
    ],
    status: "online"
  });
});

// Handle slash commands
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({
          content: "There was an error while executing this command!",
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: "There was an error while executing this command!",
          ephemeral: true
        });
      }
    } catch (e) {
      console.error("Failed to send error reply:", e);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
