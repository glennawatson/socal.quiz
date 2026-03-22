import {
  AudioPlayer,
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
  VoiceConnectionStatus,
  type DiscordGatewayAdapterCreator,
  type VoiceConnection,
} from "@discordjs/voice";
import type { SoundboardStorage } from "../util/soundboardStorage.js";
import { Readable } from "node:stream";

/**
 * Manages voice channel connections and audio playback for the soundboard feature.
 * Maintains one connection per guild as a singleton during quiz sessions.
 */
export class SoundboardManager {
  private readonly connections = new Map<string, VoiceConnection>();
  private readonly players = new Map<string, AudioPlayer>();
  private readonly soundboardStorage: SoundboardStorage;

  /**
   * Creates a new SoundboardManager.
   *
   * @param soundboardStorage - The storage backend for downloading audio files.
   */
  constructor(soundboardStorage: SoundboardStorage) {
    this.soundboardStorage = soundboardStorage;
  }

  /**
   * Joins a voice channel in the specified guild.
   * If already connected to a different channel in the same guild, disconnects first.
   *
   * @param guildId - The ID of the guild.
   * @param channelId - The ID of the voice channel to join.
   * @param adapterCreator - The Discord gateway adapter creator for the voice connection.
   * @returns A promise that resolves when the channel is joined.
   */
  async joinChannel(
    guildId: string,
    channelId: string,
    adapterCreator: DiscordGatewayAdapterCreator,
  ): Promise<void> {
    // Disconnect existing connection if any
    const existing = this.connections.get(guildId);
    if (existing) {
      existing.destroy();
      this.connections.delete(guildId);
      this.players.delete(guildId);
    }

    const connection = joinVoiceChannel({
      channelId,
      guildId,
      adapterCreator,
      selfDeaf: true,
    });

    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 10_000);
    } catch {
      connection.destroy();
      throw new Error(`Failed to join voice channel ${channelId}`);
    }

    const player = createAudioPlayer();
    connection.subscribe(player);

    this.connections.set(guildId, connection);
    this.players.set(guildId, player);
  }

  /**
   * Plays a sound in the guild's voice channel.
   * Downloads the audio from blob storage and streams it.
   *
   * @param guildId - The ID of the guild whose voice connection to use.
   * @param soundBlobName - The blob storage name of the audio file to play.
   * @returns A promise that resolves when playback finishes.
   */
  async playSound(guildId: string, soundBlobName: string): Promise<void> {
    const player = this.players.get(guildId);
    if (!player) {
      console.error(`No audio player for guild ${guildId}`);
      return;
    }

    try {
      const audioBuffer =
        await this.soundboardStorage.downloadSound(soundBlobName);
      const stream = Readable.from(audioBuffer);
      const resource = createAudioResource(stream);

      player.play(resource);
      await entersState(player, AudioPlayerStatus.Idle, 30_000);
    } catch (error) {
      console.error(`Failed to play sound ${soundBlobName}: ${String(error)}`);
    }
  }

  /**
   * Disconnects from the voice channel in the specified guild and cleans up resources.
   *
   * @param guildId - The ID of the guild to disconnect from.
   */
  leaveChannel(guildId: string): void {
    const connection = this.connections.get(guildId);
    if (connection) {
      connection.destroy();
      this.connections.delete(guildId);
    }

    const player = this.players.get(guildId);
    if (player) {
      player.stop();
      this.players.delete(guildId);
    }
  }

  /**
   * Checks whether the bot is currently connected to a voice channel in this guild.
   *
   * @param guildId - The ID of the guild to check.
   * @returns `true` if the bot has an active, ready voice connection in the guild.
   */
  isConnected(guildId: string): boolean {
    const connection = this.connections.get(guildId);
    return (
      connection?.state.status === VoiceConnectionStatus.Ready
    );
  }
}
