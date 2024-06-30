import {beforeEach, describe, expect, it, vi} from "vitest";
import {Config} from "../../src/util/config.js";
import {DiscordBotService} from "../../src/handlers/discordBotService.js";
import {QuestionStorage} from "../../src/util/questionStorage.js";
import {GuildStorage} from "../../src/util/guildStorage.js";
import {throwError} from "../../src/util/errorHelpers.js";
import {StateManager} from "../../src/handlers/stateManager.js";
import {CommandManager} from "../../src/handlers/actions/commandManager.js";
import {REST} from "@discordjs/rest";
import {QuizImageStorage} from "../../src/util/quizImageStorage.js";
import {QuizManagerFactoryManager} from "../../src/handlers/quizManagerFactoryManager.js";
import {DurableClient} from "durable-functions";
import {DurableQuizManager} from "../../src/handlers/durableQuizManager.js";

vi.mock("@discordjs/rest");
vi.mock("../../src/handlers/discordBotService");
vi.mock("../../src/util/questionStorage");
vi.mock("../../src/util/quizImageStorage");
vi.mock("../../src/util/guildStorage");
vi.mock("../../src/handlers/stateManager");
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
        const mockRest = new REST();
        const mockToken = "mockToken";
        const mockClientId = "mockClientId";
        const mockPublicKey = "mockPublicKey";
        const mockQuizImageStorageClient = new QuizImageStorage("mock-connection-string", "mock-key", "mock-name");
        const mockQuestionStorage = new QuestionStorage(mockQuizImageStorageClient);
        const mockGuildStorage = new GuildStorage();
        const mockStateManager = new StateManager();
        const mockQuizManagerFactory = new QuizManagerFactoryManager(() => new DurableQuizManager(mockRest, mockQuestionStorage, {} as DurableClient));
        const mockCommandManager = new CommandManager(mockQuizManagerFactory, mockQuestionStorage, mockClientId, mockRest);
        const mockDiscordBotService = new DiscordBotService(mockGuildStorage, mockQuizManagerFactory, mockCommandManager);

        await Config.initialize(
            undefined,
            mockToken,
            mockClientId,
            mockPublicKey,
            mockQuestionStorage,
            mockGuildStorage,
            mockQuizImageStorageClient,
            mockStateManager,
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
        const mockQuizImageStorageClient = new QuizImageStorage("mock-connection-string", "mock-key", "mock-name");
        const mockQuestionStorage = new QuestionStorage(mockQuizImageStorageClient);
        const mockGuildStorage = new GuildStorage();
        const mockStateManager = new StateManager();
        const mockQuizManagerFactory = new QuizManagerFactoryManager(() => new DurableQuizManager(new REST(), mockQuestionStorage, {} as DurableClient));
        const mockCommandManager = new CommandManager(mockQuizManagerFactory, mockQuestionStorage, mockClientId, new REST());
        const mockDiscordBotService = new DiscordBotService(mockGuildStorage, mockQuizManagerFactory, mockCommandManager);

        await Config.initialize(
            undefined,
            mockToken,
            mockClientId,
            mockPublicKey,
            mockQuestionStorage,
            mockGuildStorage,
            mockQuizImageStorageClient,
            mockStateManager,
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
            mockStateManager,
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
        const mockQuizImageStorageClient = new QuizImageStorage("mock-connection-string", "mock-key", "mock-name");
        const mockQuestionStorage = new QuestionStorage(mockQuizImageStorageClient);
        const mockGuildStorage = new GuildStorage();
        const mockStateManager = new StateManager();
        const mockQuizManagerFactory = new QuizManagerFactoryManager(() => new DurableQuizManager(new REST(), mockQuestionStorage, {} as DurableClient));

        await Config.initialize(
            undefined,
            mockToken,
            mockClientId,
            mockPublicKey,
            mockQuestionStorage,
            mockGuildStorage,
            mockQuizImageStorageClient,
            mockStateManager,
            mockQuizManagerFactory,
        );

        expect(Config.discordBotService).toBeInstanceOf(DiscordBotService);
        expect(DiscordBotService).toHaveBeenCalledWith(
            mockGuildStorage,
            mockQuizManagerFactory,
            expect.any(CommandManager),
        );
    });
});