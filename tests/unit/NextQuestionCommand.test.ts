import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextQuestionCommand } from "../../src/handlers/actions/nextQuestionCommand.js";
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
import { QuizManagerFactoryManager } from "../../src/handlers/quizManagerFactoryManager.js";

describe("NextQuestionCommand", () => {
  let quizManagerFactoryManagerMock: QuizManagerFactoryManager;
  let nextQuestionCommand: NextQuestionCommand;

  beforeEach(() => {
    quizManagerFactoryManagerMock = {
      getQuizManager: vi.fn(),
    } as unknown as QuizManagerFactoryManager;

    nextQuestionCommand = new NextQuestionCommand(
      quizManagerFactoryManagerMock,
    );
  });

  describe("data", () => {
    it("should return the correct command data", () => {
      const commandData = nextQuestionCommand.data();
      expect(commandData.name).toBe("next_question");
    });
  });

  describe("execute", () => {
    it("should show the next question and return a confirmation message", async () => {
      const quizManagerMock = {
        nextQuizQuestion: vi.fn(),
      };

      quizManagerFactoryManagerMock.getQuizManager = vi
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

      const response = await nextQuestionCommand.execute(interaction);

      expect(quizManagerMock.nextQuizQuestion).toHaveBeenCalledWith(
        "guild-id",
        "channel-id",
      );
      expect(response).toEqual(
        createEphemeralResponse("Showing next question."),
      );
    });

    it("should return an error if the guild id is missing", async () => {
      const interaction = {
        guild_id: null,
      } as unknown as APIChatInputApplicationCommandInteraction;

      const response = await nextQuestionCommand.execute(interaction);

      expect(response).toEqual(generateOptionMissingErrorResponse("guild id"));
    });

    it("should return an error if the quiz manager is not found", async () => {
      quizManagerFactoryManagerMock.getQuizManager = vi
        .fn()
        .mockResolvedValue(null);

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

      const response = await nextQuestionCommand.execute(interaction);

      expect(response).toEqual(
        generateOptionMissingErrorResponse("invalid quiz manager"),
      );
    });

    it("should return a generic error response if an exception occurs", async () => {
      quizManagerFactoryManagerMock.getQuizManager = vi
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

      const response = await nextQuestionCommand.execute(interaction);

      expect(response).toEqual(generateErrorResponse(new Error("Some error")));
    });
  });
});
