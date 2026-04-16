const { SlashCommandBuilder } = require('discord.js');
const { getPlayer } = require('../utils/playerManager');
const { createInfoEmbed } = require('../utils/MusicPlayer');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Display the current music queue')
    .addIntegerOption(option =>
      option.setName('page')
        .setDescription('Page number of the queue')
        .setMinValue(1)
    ),

  async execute(interaction) {
    const player = getPlayer(interaction.guildId, interaction.channel);

    if (!player.currentSong && player.queue.length === 0) {
      return interaction.reply({ embeds: [createInfoEmbed('Queue Empty', 'There are no songs in the queue.')] });
    }

    const page = interaction.options.getInteger('page') || 1;
    const embed = player.createQueueEmbed(page);
    await interaction.reply({ embeds: [embed] });
  },
};
