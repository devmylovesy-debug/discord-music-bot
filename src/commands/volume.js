const { SlashCommandBuilder } = require('discord.js');
const { getPlayer } = require('../utils/playerManager');
const { createErrorEmbed, createSuccessEmbed } = require('../utils/MusicPlayer');
const { sameVoiceChannelCheck } = require('../utils/voiceGuard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Set the playback volume (1–100)')
    .addIntegerOption(option =>
      option.setName('level')
        .setDescription('Volume level from 1 to 100')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    ),

  async execute(interaction) {
    const level = interaction.options.getInteger('level');
    const player = getPlayer(interaction.guildId, interaction.channel);
    const guardError = sameVoiceChannelCheck(interaction, player);
    if (guardError) {
      return interaction.reply({ embeds: [guardError], ephemeral: true });
    }

    player.setVolume(level);
    await interaction.reply({ embeds: [createSuccessEmbed(`Volume set to **${level}%**.`)] });
  },
};
