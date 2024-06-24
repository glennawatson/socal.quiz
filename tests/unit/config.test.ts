import { beforeEach, describe, expect, it, vi } from "vitest";
import { Config } from "../../src/functions/config";
import { DiscordBotService } from "../../src/handlers/discordBotService";
import { QuestionStorage } from "../../src/util/questionStorage";
import { GuildStorage } from "../../src/util/guildStorage";
import { throwError } from "../../src/util/errorHelpers";
import { StateManager } from "../../src/util/stateManager";

vi.mock("../../src/handlers/discordBotService");
vi.mock("../../src/util/questionStorage");
vi.mock("../../src/util/guildStorage");
vi.mock("../../src/util/stateManager");
vi.mock("../../src/util/errorHelpers", () => ({
  throwError: vi.fn(),
}));

const mockedThrowError = vi.mocked(throwError);

describe("Config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Config["_initialized"] = false;
    Config["_initializePromise"] = null;
  });

  it("should initialize with provided values", async () => {
    const mockToken = "mockToken";
    const mockClientId = "mockClientId";
    const mockPublicKey = "mockPublicKey";
    const mockQuestionStorage = new QuestionStorage();
    const mockGuildStorage = new GuildStorage();
    const mockStateManager = new StateManager();
    const mockDiscordBotService = new DiscordBotService(
      mockToken,
      mockClientId,
      mockGuildStorage,
      mockQuestionStorage,
      mockStateManager,
    );

    await Config.initialize(
      mockToken,
      mockClientId,
      mockPublicKey,
      mockQuestionStorage,
      mockGuildStorage,
      mockStateManager,
      mockDiscordBotService,
    );

    expect(Config.token).toBe(mockToken);
    expect(Config.clientId).toBe(mockClientId);
    expect(Config.publicKey).toBe(mockPublicKey);
    expect(Config.questionStorage).toBe(mockQuestionStorage);
    expect(Config.guildStorage).toBe(mockGuildStorage);
    expect(Config.discordBotService).toBe(mockDiscordBotService);
  });

  it("should throw error if DISCORD_BOT_TOKEN environment variable is missing", async () => {
    mockedThrowError.mockImplementation((message: string) => {
      throw new Error(message);
    });

    // Temporarily clear environment variable for this test
    const originalEnv = { ...process.env };
    delete process.env.DISCORD_BOT_TOKEN;

    await expect(Config.initialize()).rejects.toThrow(
      "Environment variable DISCORD_BOT_TOKEN is missing.",
    );

    // Restore original environment variables
    process.env = originalEnv;
  });

  it("should throw error if DISCORD_CLIENT_ID environment variable is missing", async () => {
    mockedThrowError.mockImplementation((message: string) => {
      throw new Error(message);
    });

    // Temporarily clear environment variable for this test
    const originalEnv = { ...process.env };
    delete process.env.DISCORD_CLIENT_ID;

    await expect(Config.initialize()).rejects.toThrow(
      "Environment variable DISCORD_CLIENT_ID is missing.",
    );

    // Restore original environment variables
    process.env = originalEnv;
  });

  it("should throw error if DISCORD_PUBLIC_KEY environment variable is missing", async () => {
    mockedThrowError.mockImplementation((message: string) => {
      throw new Error(message);
    });

    // Temporarily clear environment variable for this test
    const originalEnv = { ...process.env };
    delete process.env.DISCORD_PUBLIC_KEY;

    await expect(Config.initialize()).rejects.toThrow(
      "Environment variable DISCORD_PUBLIC_KEY is missing.",
    );

    // Restore original environment variables
    process.env = originalEnv;
  });

  it("should not reinitialize if already initialized", async () => {
    const mockToken = "mockToken";
    const mockClientId = "mockClientId";
    const mockPublicKey = "mockPublicKey";
    const mockQuestionStorage = new QuestionStorage();
    const mockGuildStorage = new GuildStorage();
    const mockStorage = new StateManager();
    const mockStateManager = new StateManager();
    const mockDiscordBotService = new DiscordBotService(
      mockToken,
      mockClientId,
      mockGuildStorage,
      mockQuestionStorage,
      mockStorage,
    );

    await Config.initialize(
      mockToken,
      mockClientId,
      mockPublicKey,
      mockQuestionStorage,
      mockGuildStorage,
      mockStateManager,
      mockDiscordBotService,
    );
    const initialConfig = Config["_initializePromise"];

    await Config.initialize(
      mockToken,
      mockClientId,
      mockPublicKey,
      mockQuestionStorage,
      mockGuildStorage,
      mockStateManager,
      mockDiscordBotService,
    );
    const subsequentConfig = Config["_initializePromise"];

    expect(initialConfig).toBe(subsequentConfig);
  });

  // Additional test cases to cover uncovered blocks

  it("should resolve existing instance if already initialized", async () => {
    Config["_initialized"] = true;
    const instance = await Config.initialize();
    expect(instance).toBeInstanceOf(Config);
  });

  it("should initialize discordBotService with new instance when not provided", async () => {
    const mockToken = "mockToken";
    const mockClientId = "mockClientId";
    const mockPublicKey = "mockPublicKey";
    const mockQuestionStorage = new QuestionStorage();
    const mockGuildStorage = new GuildStorage();
    const mockStateManager = new StateManager();

    await Config.initialize(
      mockToken,
      mockClientId,
      mockPublicKey,
      mockQuestionStorage,
      mockGuildStorage,
      mockStateManager,
    );

    expect(Config.discordBotService).toBeInstanceOf(DiscordBotService);
    expect(DiscordBotService).toHaveBeenCalledWith(
      mockToken,
      mockClientId,
      mockGuildStorage,
      mockQuestionStorage,
      mockStateManager,
    );
  });
});
