const { createErrorEmbed } = require('./MusicPlayer');

function sameVoiceChannelCheck(interaction, player) {
  const userChannel = interaction.member.voice.channel;
  if (!userChannel) {
    return createErrorEmbed('You must be in a voice channel to use this command.');
  }

  const connection = player.getConnection();
  if (connection && connection.joinConfig.channelId !== userChannel.id) {
    return createErrorEmbed('You must be in the same voice channel as the bot to use this command.');
  }

  return null;
}

module.exports = { sameVoiceChannelCheck };
