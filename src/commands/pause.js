const { SlashCommandBuilder } = require('discord.js');
const { getPlayer } = require('../utils/playerManager');
const { createErrorEmbed, createSuccessEmbed } = require('../utils/MusicPlayer');
const { sameVoiceChannelCheck } = require('../utils/voiceGuard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause the currently playing song'),

  async execute(interaction) {
    const player = getPlayer(interaction.guildId, interaction.channel);
    const guardError = sameVoiceChannelCheck(interaction, player);
    if (guardError) {
      return interaction.reply({ embeds: [guardError], ephemeral: true });
    }
    const paused = player.pause();

    if (paused) {
      await interaction.reply({ embeds: [createSuccessEmbed('Paused the music.')] });
    } else {
      await interaction.reply({ embeds: [createErrorEmbed('Nothing is currently playing or the music is already paused.')], ephemeral: true });
    }
  },
};
