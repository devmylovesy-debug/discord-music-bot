const { SlashCommandBuilder } = require('discord.js');
const { getPlayer, deletePlayer } = require('../utils/playerManager');
const { createErrorEmbed, createSuccessEmbed } = require('../utils/MusicPlayer');
const { sameVoiceChannelCheck } = require('../utils/voiceGuard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Disconnect the bot from the voice channel'),

  async execute(interaction) {
    const player = getPlayer(interaction.guildId, interaction.channel);
    const guardError = sameVoiceChannelCheck(interaction, player);
    if (guardError) {
      return interaction.reply({ embeds: [guardError], ephemeral: true });
    }
    const connection = player.getConnection();

    if (!connection) {
      return interaction.reply({ embeds: [createErrorEmbed('I am not in a voice channel.')], ephemeral: true });
    }

    player.leave();
    deletePlayer(interaction.guildId);

    await interaction.reply({ embeds: [createSuccessEmbed('Disconnected from the voice channel.')] });
  },
};
