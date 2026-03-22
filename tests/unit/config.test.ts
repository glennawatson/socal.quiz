import { beforeEach, describe, expect, it, vi } from "vitest";
import { Config } from "@src/util/config.js";
import { DiscordBotService } from "@src/handlers/discordBotService.js";
import { QuestionStorage } from "@src/util/questionStorage.js";
import { GuildStorage } from "@src/util/guildStorage.js";
import { throwError } from "@src/util/errorHelpers.js";
import { CommandManager } from "@src/handlers/actions/commandManager.js";
import { REST } from "@discordjs/rest";
import { QuizImageStorage } from "@src/util/quizImageStorage.js";
import { QuizManagerFactoryManager } from "@src/handlers/quizManagerFactoryManager.js";
import { DurableClient } from "durable-functions";
import { DurableQuizManager } from "@src/handlers/durableQuizManager.js";
import { GuildQuizConfigStorage } from "@src/util/guildQuizConfigStorage.js";
import { OAuth2Relay } from "@src/util/oauth2Relay.js";

vi.mock("@discordjs/rest");
vi.mock("@src/handlers/discordBotService");
vi.mock("@src/util/questionStorage");
vi.mock("@src/util/quizImageStorage");
vi.mock("@src/util/guildStorage");
vi.mock("@src/util/guildQuizConfigStorage");
vi.mock("@src/util/oauth2Relay");
vi.mock("@src/util/errorHelpers", () => ({
  throwError: vi.fn((msg: string): never => {
    throw new Error(msg);
  }),
}));

const mockedThrowError = vi.mocked(throwError);

describe("Config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Config["_initialized"] = false;
    Config["_initializePromise"] = null;

    process.env.DISCORD_BOT_TOKEN = "test-bot-token";
    process.env.DISCORD_CLIENT_ID = "test-client-id";
    process.env.DISCORD_PUBLIC_KEY = "test-public-key";
    process.env.DISCORD_CLIENT_SECRET = "test-client-secret";
    process.env.AZURE_STORAGE_CONNECTION_STRING = "test-connection-string";
    process.env.AZURE_STORAGE_ACCOUNT_KEY = "test-account-key";
    process.env.AZURE_STORAGE_ACCOUNT_NAME = "test-account-name";
  });

  it("should use provided quizManagerFactory when provided", async () => {
    const mockQuizManagerFactory = new QuizManagerFactoryManager(
      () =>
        new DurableQuizManager(
          new REST(),
          new QuestionStorage(
            new QuizImageStorage(
              "mock-connection-string",
              "mock-key",
              "mock-name",
            ),
          ),
          {} as DurableClient,
          new GuildQuizConfigStorage(),
        ),
    );

    await Config.initialize(
      undefined,
      "mockToken",
      "mockClientId",
      "mockPublicKey",
      new QuestionStorage(
        new QuizImageStorage("mock-connection-string", "mock-key", "mock-name"),
      ),
      new GuildStorage(),
      new QuizImageStorage("mock-connection-string", "mock-key", "mock-name"),
      mockQuizManagerFactory,
      new DiscordBotService(
        new GuildStorage(),
        mockQuizManagerFactory,
        new CommandManager(
          mockQuizManagerFactory,
          new QuestionStorage(
            new QuizImageStorage(
              "mock-connection-string",
              "mock-key",
              "mock-name",
            ),
          ),
          "mockClientId",
          new REST(),
        ),
      ),
    );

    expect(Config.quizManagerFactory).toBe(mockQuizManagerFactory);
  });

  it("should throw error when durableClient is not provided", async () => {
    mockedThrowError.mockImplementation((message: string) => {
      throw new Error(message);
    });

    // const mockQuizImageStorageClient = new QuizImageStorage(
    //     "mock-connection-string",
    //     "mock-key",
    //     "mock-name"
    // );
    // const mockQuestionStorage = new QuestionStorage(mockQuizImageStorageClient);

    await expect(async () => {
      await Config.initialize(
        undefined, // No durableClient provided
        "mockToken",
        "mockClientId",
        "mockPublicKey",
      );

      await Config.quizManagerFactory.getQuizManager("123");
    }).rejects.toThrow("must have valid durable client");
  });

  it("should create new QuizManagerFactoryManager when not provided", async () => {
    const mockDurableClient = {} as DurableClient;
    const mockQuizImageStorageClient = new QuizImageStorage(
      "mock-connection-string",
      "mock-key",
      "mock-name",
    );
    const mockQuestionStorage = new QuestionStorage(mockQuizImageStorageClient);

    await Config.initialize(
      mockDurableClient,
      "mockToken",
      "mockClientId",
      "mockPublicKey",
      mockQuestionStorage,
      new GuildStorage(),
      mockQuizImageStorageClient,
      undefined,
      new DiscordBotService(
        new GuildStorage(),
        new QuizManagerFactoryManager(
          () =>
            new DurableQuizManager(
              new REST(),
              mockQuestionStorage,
              mockDurableClient,
            ),
        ),
        new CommandManager(
          new QuizManagerFactoryManager(
            () =>
              new DurableQuizManager(
                new REST(),
                mockQuestionStorage,
                mockDurableClient,
                new GuildQuizConfigStorage(),
              ),
          ),
          mockQuestionStorage,
          "mockClientId",
          new REST(),
        ),
      ),
    );

    expect(Config.quizManagerFactory).toBeInstanceOf(QuizManagerFactoryManager);
  });

  it("should initialize with provided values", async () => {
    const mockRest = new REST();
    const mockToken = "mockToken";
    const mockClientId = "mockClientId";
    const mockPublicKey = "mockPublicKey";
    const mockQuizImageStorageClient = new QuizImageStorage(
      "mock-connection-string",
      "mock-key",
      "mock-name",
    );
    const mockQuestionStorage = new QuestionStorage(mockQuizImageStorageClient);
    const mockGuildStorage = new GuildStorage();
    const mockQuizManagerFactory = new QuizManagerFactoryManager(
      () =>
        new DurableQuizManager(
          mockRest,
          mockQuestionStorage,
          {} as DurableClient,
          new GuildQuizConfigStorage(),
        ),
    );
    const mockCommandManager = new CommandManager(
      mockQuizManagerFactory,
      mockQuestionStorage,
      mockClientId,
      mockRest,
    );
    const mockDiscordBotService = new DiscordBotService(
      mockGuildStorage,
      mockQuizManagerFactory,
      mockCommandManager,
    );

    await Config.initialize(
      undefined,
      mockToken,
      mockClientId,
      mockPublicKey,
      mockQuestionStorage,
      mockGuildStorage,
      mockQuizImageStorageClient,
      mockQuizManagerFactory,
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

    const originalEnv = { ...process.env };
    delete process.env.DISCORD_BOT_TOKEN;

    await expect(Config.initialize()).rejects.toThrow(
      "Environment variable DISCORD_BOT_TOKEN is missing.",
    );

    process.env = originalEnv;
  });

  it("should throw error if DISCORD_CLIENT_ID environment variable is missing", async () => {
    mockedThrowError.mockImplementation((message: string) => {
      throw new Error(message);
    });

    const originalEnv = { ...process.env };
    delete process.env.DISCORD_CLIENT_ID;

    await expect(Config.initialize()).rejects.toThrow(
      "Environment variable DISCORD_CLIENT_ID is missing.",
    );

    process.env = originalEnv;
  });

  it("should throw error if DISCORD_PUBLIC_KEY environment variable is missing", async () => {
    mockedThrowError.mockImplementation((message: string) => {
      throw new Error(message);
    });

    const originalEnv = { ...process.env };
    delete process.env.DISCORD_PUBLIC_KEY;

    await expect(Config.initialize()).rejects.toThrow(
      "Environment variable DISCORD_PUBLIC_KEY is missing.",
    );

    process.env = originalEnv;
  });

  it("should not reinitialize if already initialized", async () => {
    const mockToken = "mockToken";
    const mockClientId = "mockClientId";
    const mockPublicKey = "mockPublicKey";
    const mockQuizImageStorageClient = new QuizImageStorage(
      "mock-connection-string",
      "mock-key",
      "mock-name",
    );
    const mockQuestionStorage = new QuestionStorage(mockQuizImageStorageClient);
    const mockGuildStorage = new GuildStorage();
    const mockQuizManagerFactory = new QuizManagerFactoryManager(
      () =>
        new DurableQuizManager(
          new REST(),
          mockQuestionStorage,
          {} as DurableClient,
        ),
    );
    const mockCommandManager = new CommandManager(
      mockQuizManagerFactory,
      mockQuestionStorage,
      mockClientId,
      new REST(),
    );
    const mockDiscordBotService = new DiscordBotService(
      mockGuildStorage,
      mockQuizManagerFactory,
      mockCommandManager,
    );

    await Config.initialize(
      undefined,
      mockToken,
      mockClientId,
      mockPublicKey,
      mockQuestionStorage,
      mockGuildStorage,
      mockQuizImageStorageClient,
      mockQuizManagerFactory,
      mockDiscordBotService,
    );
    const initialConfig = Config["_initializePromise"];

    await Config.initialize(
      undefined,
      mockToken,
      mockClientId,
      mockPublicKey,
      mockQuestionStorage,
      mockGuildStorage,
      mockQuizImageStorageClient,
      mockQuizManagerFactory,
      mockDiscordBotService,
    );
    const subsequentConfig = Config["_initializePromise"];

    expect(initialConfig).toBe(subsequentConfig);
  });

  it("should resolve existing instance if already initialized", async () => {
    Config["_initialized"] = true;
    const instance = await Config.initialize();
    expect(instance).toBeInstanceOf(Config);
  });

  it("should initialize discordBotService with new instance when not provided", async () => {
    const mockToken = "mockToken";
    const mockClientId = "mockClientId";
    const mockPublicKey = "mockPublicKey";
    const mockQuizImageStorageClient = new QuizImageStorage(
      "mock-connection-string",
      "mock-key",
      "mock-name",
    );
    const mockQuestionStorage = new QuestionStorage(mockQuizImageStorageClient);
    const mockGuildStorage = new GuildStorage();
    const mockQuizManagerFactory = new QuizManagerFactoryManager(
      () =>
        new DurableQuizManager(
          new REST(),
          mockQuestionStorage,
          {} as DurableClient,
        ),
    );

    await Config.initialize(
      undefined,
      mockToken,
      mockClientId,
      mockPublicKey,
      mockQuestionStorage,
      mockGuildStorage,
      mockQuizImageStorageClient,
      mockQuizManagerFactory,
    );

    expect(Config.discordBotService).toBeInstanceOf(DiscordBotService);
    expect(DiscordBotService).toHaveBeenCalledTimes(1);
    const callArgs = vi.mocked(DiscordBotService).mock.calls[0];
    expect(callArgs).toHaveLength(4);
    expect(callArgs?.[0]).toBe(mockGuildStorage);
    expect(callArgs?.[1]).toBe(mockQuizManagerFactory);
  });
});
