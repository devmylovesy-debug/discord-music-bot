const { SlashCommandBuilder } = require('discord.js');
const { getPlayer } = require('../utils/playerManager');
const { createErrorEmbed, createSuccessEmbed } = require('../utils/MusicPlayer');
const { sameVoiceChannelCheck } = require('../utils/voiceGuard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop the music and clear the queue'),

  async execute(interaction) {
    const player = getPlayer(interaction.guildId, interaction.channel);
    const guardError = sameVoiceChannelCheck(interaction, player);
    if (guardError) {
      return interaction.reply({ embeds: [guardError], ephemeral: true });
    }

    if (!player.currentSong && player.queue.length === 0) {
      return interaction.reply({ embeds: [createErrorEmbed('Nothing is playing and the queue is empty.')], ephemeral: true });
    }

    player.stop();
    await interaction.reply({ embeds: [createSuccessEmbed('Stopped the music and cleared the queue.')] });
  },
};
