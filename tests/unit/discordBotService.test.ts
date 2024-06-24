import { beforeEach, describe, expect, it, vi } from "vitest";
import { REST } from "@discordjs/rest";
import { APIInteraction, InteractionType } from "discord-api-types/v10";
import { GuildStorage } from "../../src/util/guildStorage";
import { QuestionStorage } from "../../src/util/questionStorage";
import { CommandManager } from "../../src/handlers/actions/commandManager";
import { DiscordBotService } from "../../src/handlers/discordBotService";
import { QuizManager } from "../../src/handlers/quizManager";
import {
  createEphemeralResponse,
  generateErrorResponse,
} from "../../src/util/interactionHelpers";
import { StateManager } from "../../src/util/stateManager";

// Define mock implementations
const mockCommandManager = {
  registerDefaultCommands: vi.fn(),
  handleInteraction: vi.fn(),
};

const mockQuizManager = {
  handleAnswer: vi.fn(),
};

const mockRest = {
  setToken: vi.fn().mockReturnThis(),
  post: vi.fn(),
};

const mockGuildStorage = {
  markGuildAsRegistered: vi.fn(),
  isGuildRegistered: vi.fn(),
};

const mockQuestionStorage = {
  getQuestions: vi.fn(),
  addQuestion: vi.fn(),
  deleteQuestion: vi.fn(),
  deleteQuestionBank: vi.fn(),
};

const mockStateManager = {
  getState: vi.fn(),
  setState: vi.fn(),
};

describe("DiscordBotService", () => {
  let token: string;
  let clientId: string;
  let guildStorageMock: GuildStorage;
  let questionStorageMock: QuestionStorage;
  let stateManagerMock: StateManager;
  let restMock: REST;
  let discordBotService: DiscordBotService;

  beforeEach(() => {
    token = "test-token";
    clientId = "test-client-id";

    guildStorageMock = mockGuildStorage as unknown as GuildStorage;
    questionStorageMock = mockQuestionStorage as unknown as QuestionStorage;
    restMock = mockRest as unknown as REST;
    stateManagerMock = mockStateManager as unknown as StateManager;
  });

  describe("constructor", () => {
    it("should create a new CommandManager if one is not provided", () => {
      discordBotService = new DiscordBotService(
        token,
        clientId,
        guildStorageMock,
        questionStorageMock,
        stateManagerMock,
        restMock,
      );

      expect(discordBotService["commandManager"]).toBeInstanceOf(
        CommandManager,
      );
    });
  });

  describe("start", () => {
    it("should register default commands and mark the guild as registered", async () => {
      discordBotService = new DiscordBotService(
        token,
        clientId,
        guildStorageMock,
        questionStorageMock,
        stateManagerMock,
        restMock,
        mockCommandManager as unknown as CommandManager,
      );

      await discordBotService.start("guild-id");

      expect(mockCommandManager.registerDefaultCommands).toHaveBeenCalledWith(
        "guild-id",
      );
      expect(guildStorageMock.markGuildAsRegistered).toHaveBeenCalledWith(
        "guild-id",
      );
    });
  });

  describe("getQuizManager", () => {
    it("should return an existing QuizManager", async () => {
      discordBotService = new DiscordBotService(
        token,
        clientId,
        guildStorageMock,
        questionStorageMock,
        stateManagerMock,
        restMock,
        mockCommandManager as unknown as CommandManager,
      );

      const guildId = "guild-id";
      discordBotService["quizManagers"].set(
        guildId,
        Promise.resolve(mockQuizManager as unknown as QuizManager),
      );

      const result = await discordBotService.getQuizManager(guildId);

      expect(result).toBe(mockQuizManager);
    });

    it("should create a new QuizManager if one does not exist", async () => {
      discordBotService = new DiscordBotService(
        token,
        clientId,
        guildStorageMock,
        questionStorageMock,
        stateManagerMock,
        restMock,
        mockCommandManager as unknown as CommandManager,
      );

      const guildId = "guild-id";
      const result = await discordBotService.getQuizManager(guildId);

      expect(result).toBeInstanceOf(QuizManager);
    });
  });

  describe("handleInteraction", () => {
    it("should handle interactions outside a guild with an ephemeral response", async () => {
      discordBotService = new DiscordBotService(
        token,
        clientId,
        guildStorageMock,
        questionStorageMock,
        stateManagerMock,
        restMock,
        mockCommandManager as unknown as CommandManager,
      );

      const interaction: APIInteraction = {
        type: InteractionType.Ping,
        id: "interaction-id",
        application_id: "app-id",
        data: {},
        guild_id: null,
        channel_id: "channel-id",
        member: null,
        user: null,
        token: "interaction-token",
        version: 1,
        locale: "en-US",
        app_permissions: "",
      } as unknown as APIInteraction;

      const response = await discordBotService.handleInteraction(interaction);

      expect(response).toEqual(
        createEphemeralResponse(
          "This interaction must be performed within a guild.",
        ),
      );
    });

    it("should register commands for a guild if not already registered", async () => {
      discordBotService = new DiscordBotService(
        token,
        clientId,
        guildStorageMock,
        questionStorageMock,
        stateManagerMock,
        restMock,
        mockCommandManager as unknown as CommandManager,
      );

      const interaction: APIInteraction = {
        type: InteractionType.ApplicationCommand,
        id: "interaction-id",
        application_id: "app-id",
        data: {},
        guild_id: "guild-id",
        channel_id: "channel-id",
        member: null,
        user: null,
        token: "interaction-token",
        version: 1,
        locale: "en-US",
        app_permissions: "",
      } as unknown as APIInteraction;

      guildStorageMock.isGuildRegistered = vi.fn().mockResolvedValue(false);
      mockCommandManager.handleInteraction = vi.fn().mockResolvedValue(null);

      await discordBotService.handleInteraction(interaction);

      expect(mockCommandManager.registerDefaultCommands).toHaveBeenCalledWith(
        "guild-id",
      );
      expect(guildStorageMock.markGuildAsRegistered).toHaveBeenCalledWith(
        "guild-id",
      );
    });

    it("should delegate answer interactions to the QuizManager", async () => {
      discordBotService = new DiscordBotService(
        token,
        clientId,
        guildStorageMock,
        questionStorageMock,
        stateManagerMock,
        restMock,
        mockCommandManager as unknown as CommandManager,
      );

      const interaction: APIInteraction = {
        type: InteractionType.MessageComponent,
        id: "interaction-id",
        application_id: "app-id",
        data: {
          custom_id: "answer_123",
        },
        guild_id: "guild-id",
        channel_id: "channel-id",
        member: null,
        user: null,
        token: "interaction-token",
        version: 1,
        locale: "en-US",
        app_permissions: "",
      } as unknown as APIInteraction;

      guildStorageMock.isGuildRegistered = vi.fn().mockResolvedValue(true);
      mockQuizManager.handleAnswer = vi
        .fn()
        .mockResolvedValue(createEphemeralResponse("Answer handled"));

      discordBotService["quizManagers"].set(
        "guild-id",
        Promise.resolve(mockQuizManager as unknown as QuizManager),
      );

      const response = await discordBotService.handleInteraction(interaction);

      expect(response).toEqual(createEphemeralResponse("Answer handled"));
    });

    it("should delegate other interactions to the CommandManager", async () => {
      discordBotService = new DiscordBotService(
        token,
        clientId,
        guildStorageMock,
        questionStorageMock,
        stateManagerMock,
        restMock,
        mockCommandManager as unknown as CommandManager,
      );

      const interaction: APIInteraction = {
        type: InteractionType.ApplicationCommand,
        id: "interaction-id",
        application_id: "app-id",
        data: {},
        guild_id: "guild-id",
        channel_id: "channel-id",
        member: null,
        user: null,
        token: "interaction-token",
        version: 1,
        locale: "en-US",
        app_permissions: "",
      } as unknown as APIInteraction;

      guildStorageMock.isGuildRegistered = vi.fn().mockResolvedValue(true);
      mockCommandManager.handleInteraction = vi
        .fn()
        .mockResolvedValue(createEphemeralResponse("Command handled"));

      const response = await discordBotService.handleInteraction(interaction);

      expect(response).toEqual(createEphemeralResponse("Command handled"));
    });

    it("should handle errors gracefully", async () => {
      discordBotService = new DiscordBotService(
        token,
        clientId,
        guildStorageMock,
        questionStorageMock,
        stateManagerMock,
        restMock,
        mockCommandManager as unknown as CommandManager,
      );

      const interaction: APIInteraction = {
        type: InteractionType.ApplicationCommand,
        id: "interaction-id",
        application_id: "app-id",
        data: {},
        guild_id: "guild-id",
        channel_id: "channel-id",
        member: null,
        user: null,
        token: "interaction-token",
        version: 1,
        locale: "en-US",
        app_permissions: "",
      } as unknown as APIInteraction;

      const error = new Error("Test error");
      mockCommandManager.handleInteraction = vi.fn().mockRejectedValue(error);

      const response = await discordBotService.handleInteraction(interaction);

      expect(response).toEqual(generateErrorResponse(error));
    });
  });
});
