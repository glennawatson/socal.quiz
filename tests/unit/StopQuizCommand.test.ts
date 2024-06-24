import { describe, it, expect, vi, beforeEach } from "vitest";
import { DiscordBotService } from "../../src/handlers/discordBotService.js";
import { StopQuizCommand } from "../../src/handlers/actions/stopQuizCommand.js";
import {
  APIChatInputApplicationCommandInteraction,
  ApplicationCommandType,
  ChannelType,
  InteractionType,
} from "discord-api-types/v10";
import {
  createEphemeralResponse,
  generateErrorResponse,
  generateOptionMissingErrorResponse,
} from "../../src/util/interactionHelpers.js";

describe("StopQuizCommand", () => {
  let discordBotServiceMock: DiscordBotService;
  let stopQuizCommand: StopQuizCommand;

  beforeEach(() => {
    const mockRest = {
      request: vi.fn(),
      get: vi.fn(),
    };

    discordBotServiceMock = {
      rest: mockRest,

      handleInteraction: vi.fn(),
      start: vi.fn(),
      getQuizManager: vi.fn(),
    } as unknown as DiscordBotService;

    stopQuizCommand = new StopQuizCommand(discordBotServiceMock);
  });

  describe("data", () => {
    it("should return the correct command data", () => {
      const commandData = stopQuizCommand.data();
      expect(commandData.name).toBe("stop_quiz");
    });
  });

  describe("execute", () => {
    it("should stop the quiz and return a confirmation message", async () => {
      const quizManagerMock = {
        stopQuiz: vi.fn(),
      };

      discordBotServiceMock.getQuizManager = vi
        .fn()
        .mockResolvedValue(quizManagerMock);

      const interaction: APIChatInputApplicationCommandInteraction = {
        guild_id: "guild-id",
        channel_id: "channel-id",
        channel: { id: "channel-id", type: ChannelType.GuildVoice },
        id: "next_question",
        application_id: "",
        type: InteractionType.ApplicationCommand,
        token: "",
        version: 1,
        app_permissions: "",
        locale: "en-US",
        entitlements: [],
        authorizing_integration_owners: {},
        data: { id: "data", type: ApplicationCommandType.ChatInput, name: "" },
      };

      const response = await stopQuizCommand.execute(interaction);

      expect(quizManagerMock.stopQuiz).toHaveBeenCalledWith(
        "guild-id",
        "channel-id",
      );
      expect(response).toEqual(createEphemeralResponse("Stopped quiz"));
    });

    it("should return an error if the guild id is missing", async () => {
      const interaction = {
        guild_id: null,
      } as unknown as APIChatInputApplicationCommandInteraction;

      const response = await stopQuizCommand.execute(interaction);

      expect(response).toEqual(generateOptionMissingErrorResponse("guild id"));
    });

    it("should return a generic error response if an exception occurs", async () => {
      discordBotServiceMock.getQuizManager = vi
        .fn()
        .mockRejectedValue(new Error("Some error"));

      const interaction: APIChatInputApplicationCommandInteraction = {
        guild_id: "guild-id",
        channel_id: "channel-id",
        channel: { id: "channel-id", type: ChannelType.GuildVoice },
        id: "next_question",
        application_id: "",
        type: InteractionType.ApplicationCommand,
        token: "",
        version: 1,
        app_permissions: "",
        locale: "en-US",
        entitlements: [],
        authorizing_integration_owners: {},
        data: { id: "data", type: ApplicationCommandType.ChatInput, name: "" },
      };

      const response = await stopQuizCommand.execute(interaction);

      expect(response).toEqual(generateErrorResponse(new Error("Some error")));
    });
  });
});
