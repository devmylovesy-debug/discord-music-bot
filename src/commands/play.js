const { SlashCommandBuilder } = require('discord.js');
const { getPlayer } = require('../utils/playerManager');
const { createErrorEmbed, createInfoEmbed } = require('../utils/MusicPlayer');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song from YouTube (URL or search query)')
    .addStringOption(option =>
      option.setName('query')
        .setDescription('YouTube URL or search query')
        .setRequired(true)
    ),

  async execute(interaction) {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.reply({ embeds: [createErrorEmbed('You must be in a voice channel to use this command.')], ephemeral: true });
    }

    const botMember = interaction.guild.members.me;
    const perms = voiceChannel.permissionsFor(botMember);
    if (!perms.has('Connect') || !perms.has('Speak')) {
      return interaction.reply({ embeds: [createErrorEmbed('I need **Connect** and **Speak** permissions for that voice channel.')], ephemeral: true });
    }

    await interaction.deferReply();

    const query = interaction.options.getString('query');
    const player = getPlayer(interaction.guildId, interaction.channel);

    try {
      const song = await player.addSong(query, interaction.user);
      await player.play(voiceChannel);

      if (player.isPlaying && player.currentSong?.url !== song.url) {
        await interaction.editReply({
          embeds: [
            createInfoEmbed('Added to Queue', `**[${song.title}](${song.url})**\nDuration: ${song.duration} | Requested by: ${interaction.user}`),
          ],
        });
      } else {
        await interaction.editReply({ content: 'Starting playback...' });
      }
    } catch (error) {
      console.error('Play command error:', error);
      await interaction.editReply({ embeds: [createErrorEmbed(`Failed to play: ${error.message}`)] });
    }
  },
};
