import { describe, it, expect, beforeEach, vi } from "vitest";
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

describe("DiscordBotService", () => {
  let token: string;
  let clientId: string;
  let guildStorageMock: GuildStorage;
  let questionStorageMock: QuestionStorage;
  let restMock: REST;
  let commandManagerMock: CommandManager;
  let quizManagerMock: QuizManager;
  let discordBotService: DiscordBotService;

  beforeEach(() => {
    token = "test-token";
    clientId = "test-client-id";

    guildStorageMock = {
      markGuildAsRegistered: vi.fn(),
      isGuildRegistered: vi.fn(),
    } as unknown as GuildStorage;

    questionStorageMock = {
      getQuestions: vi.fn(),
      addQuestion: vi.fn(),
      deleteQuestion: vi.fn(),
      deleteQuestionBank: vi.fn(),
    } as unknown as QuestionStorage;

    restMock = {
      setToken: vi.fn().mockReturnThis(),
      post: vi.fn(),
    } as unknown as REST;

    commandManagerMock = {
      registerDefaultCommands: vi.fn(),
      handleInteraction: vi.fn(),
    } as unknown as CommandManager;

    quizManagerMock = {
      handleAnswer: vi.fn(),
    } as unknown as QuizManager;

    discordBotService = new DiscordBotService(
      token,
      clientId,
      guildStorageMock,
      questionStorageMock,
      restMock,
      commandManagerMock,
    );
  });

  describe("start", () => {
    it("should register default commands and mark the guild as registered", async () => {
      await discordBotService.start("guild-id");

      expect(commandManagerMock.registerDefaultCommands).toHaveBeenCalledWith(
        "guild-id",
      );
      expect(guildStorageMock.markGuildAsRegistered).toHaveBeenCalledWith(
        "guild-id",
      );
    });
  });

  describe("getQuizManager", () => {
    it("should return an existing QuizManager", async () => {
      const guildId = "guild-id";
      discordBotService["quizManagers"].set(
        guildId,
        Promise.resolve(quizManagerMock),
      );

      const result = await discordBotService.getQuizManager(guildId);

      expect(result).toBe(quizManagerMock);
    });

    it("should create a new QuizManager if one does not exist", async () => {
      const guildId = "guild-id";
      const result = await discordBotService.getQuizManager(guildId);

      expect(result).toBeInstanceOf(QuizManager);
    });
  });

  describe("handleInteraction", () => {
    it("should handle interactions outside a guild with an ephemeral response", async () => {
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
      commandManagerMock.handleInteraction = vi.fn().mockResolvedValue(null);

      await discordBotService.handleInteraction(interaction);

      expect(commandManagerMock.registerDefaultCommands).toHaveBeenCalledWith(
        "guild-id",
      );
      expect(guildStorageMock.markGuildAsRegistered).toHaveBeenCalledWith(
        "guild-id",
      );
    });

    it("should delegate answer interactions to the QuizManager", async () => {
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
      quizManagerMock.handleAnswer = vi
        .fn()
        .mockResolvedValue(createEphemeralResponse("Answer handled"));

      discordBotService["quizManagers"].set(
        "guild-id",
        Promise.resolve(quizManagerMock),
      );

      const response = await discordBotService.handleInteraction(interaction);

      expect(response).toEqual(createEphemeralResponse("Answer handled"));
    });

    it("should delegate other interactions to the CommandManager", async () => {
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
      commandManagerMock.handleInteraction = vi
        .fn()
        .mockResolvedValue(createEphemeralResponse("Command handled"));

      const response = await discordBotService.handleInteraction(interaction);

      expect(response).toEqual(createEphemeralResponse("Command handled"));
    });

    it("should handle errors gracefully", async () => {
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
      commandManagerMock.handleInteraction = vi.fn().mockRejectedValue(error);

      const response = await discordBotService.handleInteraction(interaction);

      expect(response).toEqual(generateErrorResponse(error));
    });
  });
});
