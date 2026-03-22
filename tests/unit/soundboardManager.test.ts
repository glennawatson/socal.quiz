import { describe, it, expect, vi, beforeEach } from "vitest";
import { SoundboardManager } from "../../src/handlers/soundboardManager.js";
import type { SoundboardStorage } from "../../src/util/soundboardStorage.js";

// Mock @discordjs/voice
const mockDestroy = vi.fn();
const mockSubscribe = vi.fn();
const mockPlay = vi.fn();
const mockStop = vi.fn();

const VoiceConnectionStatus = {
  Ready: "ready" as const,
  Connecting: "connecting" as const,
  Destroyed: "destroyed" as const,
};

const AudioPlayerStatus = {
  Idle: "idle" as const,
  Playing: "playing" as const,
};

const mockConnection = {
  destroy: mockDestroy,
  subscribe: mockSubscribe,
  state: { status: VoiceConnectionStatus.Ready },
};

const mockPlayer = {
  play: mockPlay,
  stop: mockStop,
};

vi.mock("@discordjs/voice", () => ({
  joinVoiceChannel: vi.fn(() => mockConnection),
  createAudioPlayer: vi.fn(() => mockPlayer),
  createAudioResource: vi.fn((stream: unknown) => ({ stream })),
  entersState: vi.fn(async () => {}),
  VoiceConnectionStatus: {
    Ready: "ready",
    Connecting: "connecting",
    Destroyed: "destroyed",
  },
  AudioPlayerStatus: {
    Idle: "idle",
    Playing: "playing",
  },
}));

// Import after mocking
const voice = await import("@discordjs/voice");

describe("SoundboardManager", () => {
  let manager: SoundboardManager;
  let mockStorage: SoundboardStorage;

  beforeEach(() => {
    vi.clearAllMocks();

    mockConnection.state = { status: VoiceConnectionStatus.Ready };

    mockStorage = {
      downloadSound: vi.fn().mockResolvedValue(Buffer.from("audio-data")),
    } as unknown as SoundboardStorage;

    manager = new SoundboardManager(mockStorage);
  });

  describe("constructor", () => {
    it("should create a SoundboardManager with the given storage", () => {
      const storage = {} as SoundboardStorage;
      const mgr = new SoundboardManager(storage);
      expect(mgr).toBeInstanceOf(SoundboardManager);
    });
  });

  describe("joinChannel", () => {
    it("should join a voice channel successfully", async () => {
      const adapterCreator = {} as any;

      await manager.joinChannel("guild1", "channel1", adapterCreator);

      expect(voice.joinVoiceChannel).toHaveBeenCalledWith({
        channelId: "channel1",
        guildId: "guild1",
        adapterCreator,
        selfDeaf: true,
      });
      expect(voice.entersState).toHaveBeenCalledWith(
        mockConnection,
        VoiceConnectionStatus.Ready,
        10_000,
      );
      expect(voice.createAudioPlayer).toHaveBeenCalled();
      expect(mockSubscribe).toHaveBeenCalledWith(mockPlayer);
      expect(manager.isConnected("guild1")).toBe(true);
    });

    it("should replace an existing connection when joining a new channel", async () => {
      const adapterCreator = {} as any;

      // Join first channel
      await manager.joinChannel("guild1", "channel1", adapterCreator);

      // Clear mocks to track second call
      vi.clearAllMocks();
      mockConnection.state = { status: VoiceConnectionStatus.Ready };

      // Join second channel - should destroy the first
      await manager.joinChannel("guild1", "channel2", adapterCreator);

      // The existing connection should have been destroyed
      expect(mockDestroy).toHaveBeenCalledTimes(1);
      expect(voice.joinVoiceChannel).toHaveBeenCalledWith(
        expect.objectContaining({ channelId: "channel2" }),
      );
    });

    it("should throw and clean up on timeout failure", async () => {
      const adapterCreator = {} as any;
      vi.mocked(voice.entersState).mockRejectedValueOnce(
        new Error("Timed out"),
      );

      await expect(
        manager.joinChannel("guild1", "channel1", adapterCreator),
      ).rejects.toThrow("Failed to join voice channel channel1");

      // The connection should have been destroyed on failure
      expect(mockDestroy).toHaveBeenCalled();
      expect(manager.isConnected("guild1")).toBe(false);
    });
  });

  describe("playSound", () => {
    it("should play a sound successfully", async () => {
      const adapterCreator = {} as any;
      await manager.joinChannel("guild1", "channel1", adapterCreator);

      await manager.playSound("guild1", "sound.mp3");

      expect(mockStorage.downloadSound).toHaveBeenCalledWith("sound.mp3");
      expect(voice.createAudioResource).toHaveBeenCalled();
      expect(mockPlay).toHaveBeenCalled();
      expect(voice.entersState).toHaveBeenCalledWith(
        mockPlayer,
        AudioPlayerStatus.Idle,
        30_000,
      );
    });

    it("should log error and return when no player exists for guild", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await manager.playSound("nonexistent-guild", "sound.mp3");

      expect(consoleSpy).toHaveBeenCalledWith(
        "No audio player for guild nonexistent-guild",
      );
      expect(mockStorage.downloadSound).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should catch and log errors during playback", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const adapterCreator = {} as any;
      await manager.joinChannel("guild1", "channel1", adapterCreator);

      vi.mocked(mockStorage.downloadSound).mockRejectedValueOnce(
        new Error("Download failed"),
      );

      await manager.playSound("guild1", "sound.mp3");

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to play sound sound.mp3"),
      );
      consoleSpy.mockRestore();
    });
  });

  describe("leaveChannel", () => {
    it("should disconnect and clean up when connected", async () => {
      const adapterCreator = {} as any;
      await manager.joinChannel("guild1", "channel1", adapterCreator);

      manager.leaveChannel("guild1");

      expect(mockDestroy).toHaveBeenCalled();
      expect(mockStop).toHaveBeenCalled();
      expect(manager.isConnected("guild1")).toBe(false);
    });

    it("should do nothing when not connected", () => {
      // Should not throw
      manager.leaveChannel("nonexistent-guild");
      expect(mockDestroy).not.toHaveBeenCalled();
      expect(mockStop).not.toHaveBeenCalled();
    });
  });

  describe("isConnected", () => {
    it("should return true when connection status is Ready", async () => {
      const adapterCreator = {} as any;
      await manager.joinChannel("guild1", "channel1", adapterCreator);

      mockConnection.state = { status: VoiceConnectionStatus.Ready };
      expect(manager.isConnected("guild1")).toBe(true);
    });

    it("should return false when connection status is not Ready", async () => {
      const adapterCreator = {} as any;
      await manager.joinChannel("guild1", "channel1", adapterCreator);

      mockConnection.state = { status: VoiceConnectionStatus.Connecting };
      expect(manager.isConnected("guild1")).toBe(false);
    });

    it("should return false when no connection exists", () => {
      expect(manager.isConnected("nonexistent-guild")).toBe(false);
    });
  });
});
