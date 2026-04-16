const { SlashCommandBuilder } = require('discord.js');
const { getPlayer } = require('../utils/playerManager');
const { createErrorEmbed, createSuccessEmbed } = require('../utils/MusicPlayer');
const { sameVoiceChannelCheck } = require('../utils/voiceGuard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resume the paused song'),

  async execute(interaction) {
    const player = getPlayer(interaction.guildId, interaction.channel);
    const guardError = sameVoiceChannelCheck(interaction, player);
    if (guardError) {
      return interaction.reply({ embeds: [guardError], ephemeral: true });
    }
    const resumed = player.resume();

    if (resumed) {
      await interaction.reply({ embeds: [createSuccessEmbed('Resumed the music.')] });
    } else {
      await interaction.reply({ embeds: [createErrorEmbed('The music is not paused.')], ephemeral: true });
    }
  },
};
