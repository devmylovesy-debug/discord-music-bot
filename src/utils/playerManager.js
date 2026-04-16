const { MusicPlayer } = require('./MusicPlayer');

const players = new Map();

function getPlayer(guildId, textChannel) {
  if (!players.has(guildId)) {
    players.set(guildId, new MusicPlayer(guildId, textChannel));
  } else if (textChannel) {
    players.get(guildId).textChannel = textChannel;
  }
  return players.get(guildId);
}

function deletePlayer(guildId) {
  players.delete(guildId);
}

module.exports = { getPlayer, deletePlayer };
