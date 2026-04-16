const { SlashCommandBuilder } = require('discord.js');
const { getPlayer } = require('../utils/playerManager');
const { createInfoEmbed } = require('../utils/MusicPlayer');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Show information about the currently playing song'),

  async execute(interaction) {
    const player = getPlayer(interaction.guildId, interaction.channel);

    if (!player.currentSong) {
      return interaction.reply({ embeds: [createInfoEmbed('Not Playing', 'Nothing is currently playing.')] });
    }

    const embed = player.createNowPlayingEmbed();
    await interaction.reply({ embeds: [embed] });
  },
};
