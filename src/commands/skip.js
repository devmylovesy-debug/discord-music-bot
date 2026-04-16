const { SlashCommandBuilder } = require('discord.js');
const { getPlayer } = require('../utils/playerManager');
const { createErrorEmbed, createSuccessEmbed } = require('../utils/MusicPlayer');
const { sameVoiceChannelCheck } = require('../utils/voiceGuard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip the currently playing song'),

  async execute(interaction) {
    const player = getPlayer(interaction.guildId, interaction.channel);
    const guardError = sameVoiceChannelCheck(interaction, player);
    if (guardError) {
      return interaction.reply({ embeds: [guardError], ephemeral: true });
    }

    if (!player.currentSong) {
      return interaction.reply({ embeds: [createErrorEmbed('Nothing is currently playing.')], ephemeral: true });
    }

    const skippedTitle = player.currentSong.title;
    const skipped = player.skip();
    if (skipped) {
      await interaction.reply({ embeds: [createSuccessEmbed(`Skipped **${skippedTitle}**.`)] });
    } else {
      await interaction.reply({ embeds: [createErrorEmbed('Could not skip the current song.')] });
    }
  },
};
