const {
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  joinVoiceChannel,
  getVoiceConnection,
  NoSubscriberBehavior,
  StreamType,
} = require('@discordjs/voice');
const playdl = require('play-dl');
const ytdl = require('@distube/ytdl-core');
const { EmbedBuilder } = require('discord.js');

class Song {
  constructor({ title, url, duration, durationSec, thumbnail, requestedBy }) {
    this.title = title;
    this.url = url;
    this.duration = duration;
    this.durationSec = durationSec || 0;
    this.thumbnail = thumbnail;
    this.requestedBy = requestedBy;
  }
}

class MusicPlayer {
  constructor(guildId, textChannel) {
    this.guildId = guildId;
    this.textChannel = textChannel;
    this.queue = [];
    this.currentSong = null;
    this.audioPlayer = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Pause },
    });
    this.volume = 100;
    this.isPlaying = false;

    this.audioPlayer.on(AudioPlayerStatus.Idle, () => {
      this._playNext();
    });

    this.audioPlayer.on('error', (error) => {
      console.error(`AudioPlayer error for guild ${guildId}:`, error.message);
      this._playNext();
    });
  }

  getConnection() {
    return getVoiceConnection(this.guildId);
  }

  async join(voiceChannel) {
    const existing = this.getConnection();
    if (existing && existing.state.status !== VoiceConnectionStatus.Destroyed) {
      try {
        await entersState(existing, VoiceConnectionStatus.Ready, 5_000);
        return existing;
      } catch {
        existing.destroy();
      }
    }

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      selfDeaf: true,
      selfMute: false,
    });

    connection.on('stateChange', (oldState, newState) => {
      console.log(`Voice connection: ${oldState.status} -> ${newState.status}`);
    });

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch {
        if (connection.state.status !== VoiceConnectionStatus.Destroyed) {
          connection.destroy();
        }
      }
    });

    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
    } catch (err) {
      console.error('Voice connection failed. Final state:', connection.state.status, err.message);
      connection.destroy();
      throw new Error('Failed to join voice channel within 30 seconds.');
    }

    connection.subscribe(this.audioPlayer);
    return connection;
  }

  async addSong(query, requestedBy) {
    let songInfo;

    const isUrl = playdl.yt_validate(query) === 'video';
    const url = isUrl ? query : await (async () => {
      const results = await playdl.search(query, { limit: 1, source: { youtube: 'video' } });
      if (!results || results.length === 0) throw new Error('No results found for your search query.');
      return results[0].url;
    })();

    const ytdlOptions = {};
    if (process.env.YOUTUBE_COOKIE) {
      ytdlOptions.requestOptions = { headers: { cookie: process.env.YOUTUBE_COOKIE } };
    }

    const info = await ytdl.getInfo(url, ytdlOptions);
    const details = info.videoDetails;
    songInfo = new Song({
      title: details.title,
      url: details.video_url || url,
      duration: formatDuration(parseInt(details.lengthSeconds)),
      durationSec: parseInt(details.lengthSeconds) || 0,
      thumbnail: details.thumbnails?.[0]?.url || null,
      requestedBy,
    });

    this.queue.push(songInfo);
    return songInfo;
  }

  async play(voiceChannel) {
    const connection = this.getConnection();
    if (!connection) {
      await this.join(voiceChannel);
    }

    if (this.audioPlayer.state.status === AudioPlayerStatus.Idle) {
      await this._playNext();
    }
  }

  async _playNext() {
    if (this.queue.length === 0) {
      this.currentSong = null;
      this.isPlaying = false;
      if (this.textChannel) {
        this.textChannel.send({ embeds: [createInfoEmbed('Queue finished', 'No more songs in the queue.')] }).catch(() => {});
      }
      return;
    }

    this.currentSong = this.queue.shift();
    this.isPlaying = true;
    this.songStartedAt = Date.now();

    try {
      const ytdlOptions = {
        filter: 'audioonly',
        quality: 'highestaudio',
        highWaterMark: 1 << 25,
      };
      if (process.env.YOUTUBE_COOKIE) {
        ytdlOptions.requestOptions = { headers: { cookie: process.env.YOUTUBE_COOKIE } };
      }

      const stream = ytdl(this.currentSong.url, ytdlOptions);
      const resource = createAudioResource(stream, {
        inputType: StreamType.Arbitrary,
        inlineVolume: true,
      });

      resource.volume?.setVolume(this.volume / 100);
      this.currentResource = resource;
      this.audioPlayer.play(resource);

      if (this.textChannel) {
        this.textChannel.send({ embeds: [this.createNowPlayingEmbed()] }).catch(() => {});
      }
    } catch (error) {
      console.error('Error playing song:', error.message);
      if (this.textChannel) {
        this.textChannel.send({ embeds: [createErrorEmbed(`Failed to play: ${this.currentSong.title}`)] }).catch(() => {});
      }
      await this._playNext();
    }
  }

  skip() {
    if (!this.currentSong) return false;
    this.audioPlayer.stop(true);
    return true;
  }

  stop() {
    this.queue = [];
    this.currentSong = null;
    this.isPlaying = false;
    this.audioPlayer.stop(true);
  }

  pause() {
    if (this.audioPlayer.state.status === AudioPlayerStatus.Playing) {
      this.audioPlayer.pause();
      return true;
    }
    return false;
  }

  resume() {
    if (this.audioPlayer.state.status === AudioPlayerStatus.Paused) {
      this.audioPlayer.unpause();
      return true;
    }
    return false;
  }

  setVolume(vol) {
    this.volume = vol;
    if (this.currentResource?.volume) {
      this.currentResource.volume.setVolume(vol / 100);
    }
  }

  leave() {
    this.stop();
    const connection = this.getConnection();
    if (connection) {
      connection.destroy();
    }
  }

  createNowPlayingEmbed() {
    const song = this.currentSong;
    if (!song) return createInfoEmbed('Not Playing', 'Nothing is currently playing.');

    const elapsedSec = this.songStartedAt ? Math.floor((Date.now() - this.songStartedAt) / 1000) : 0;
    const progressBar = buildProgressBar(elapsedSec, song.durationSec);

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('Now Playing')
      .setDescription(`**[${song.title}](${song.url})**\n${progressBar}\n\`${formatDuration(elapsedSec)} / ${song.duration}\``)
      .addFields(
        { name: 'Requested by', value: song.requestedBy.toString(), inline: true },
        { name: 'Volume', value: `${this.volume}%`, inline: true },
      )
      .setFooter({ text: `${this.queue.length} song(s) in queue` });

    if (song.thumbnail) embed.setThumbnail(song.thumbnail);
    return embed;
  }

  createQueueEmbed(page = 1) {
    const pageSize = 10;
    const totalPages = Math.ceil(this.queue.length / pageSize) || 1;
    page = Math.min(Math.max(page, 1), totalPages);

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const songs = this.queue.slice(start, end);

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('Music Queue')
      .setFooter({ text: `Page ${page}/${totalPages} • ${this.queue.length} song(s) in queue` });

    if (this.currentSong) {
      embed.setDescription(`**Now Playing:** [${this.currentSong.title}](${this.currentSong.url}) (${this.currentSong.duration})`);
    } else {
      embed.setDescription('Nothing is currently playing.');
    }

    if (songs.length > 0) {
      const list = songs
        .map((song, i) => `**${start + i + 1}.** [${song.title}](${song.url}) — ${song.duration} | ${song.requestedBy}`)
        .join('\n');
      embed.addFields({ name: 'Up Next', value: list });
    } else if (!this.currentSong) {
      embed.addFields({ name: 'Up Next', value: 'The queue is empty.' });
    }

    return embed;
  }
}

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return 'Unknown';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function buildProgressBar(elapsedSec, totalSec, length = 20) {
  if (!totalSec || totalSec <= 0) return '`[──────────────────────]`';
  const progress = Math.min(elapsedSec / totalSec, 1);
  const filled = Math.round(progress * length);
  const empty = length - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `\`[${bar}]\``;
}

function createInfoEmbed(title, description) {
  return new EmbedBuilder().setColor(0x5865F2).setTitle(title).setDescription(description);
}

function createErrorEmbed(description) {
  return new EmbedBuilder().setColor(0xED4245).setTitle('Error').setDescription(description);
}

function createSuccessEmbed(description) {
  return new EmbedBuilder().setColor(0x57F287).setTitle('Success').setDescription(description);
}

module.exports = { MusicPlayer, createInfoEmbed, createErrorEmbed, createSuccessEmbed };
