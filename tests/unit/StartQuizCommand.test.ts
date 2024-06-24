import { beforeEach, describe, expect, it, vi } from "vitest";
import { DiscordBotService } from "../../src/handlers/discordBotService";
import { StartQuizCommand } from "../../src/handlers/actions/startQuizCommand";
import {
  createEphemeralResponse,
  generateErrorResponse,
  generateOptionMissingErrorResponse,
} from "../../src/util/interactionHelpers";
import {
  APIChatInputApplicationCommandInteraction,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ChannelType,
  GuildMemberFlags,
} from "discord-api-types/v10";

describe("StartQuizCommand", () => {
  let discordBotServiceMock: DiscordBotService;
  let startQuizCommand: StartQuizCommand;

  beforeEach(() => {
    discordBotServiceMock = {
      getQuizManager: vi.fn(),
    } as unknown as DiscordBotService;

    startQuizCommand = new StartQuizCommand(discordBotServiceMock);
  });

  describe("data", () => {
    it("should return the correct command data", () => {
      const commandData = startQuizCommand.data();
      expect(commandData.name).toBe("start_quiz");
    });
  });

  describe("execute", () => {
    it("should start the quiz and return a confirmation message", async () => {
      const quizManagerMock = {
        startQuiz: vi
          .fn()
          .mockResolvedValue(createEphemeralResponse("Quiz started")),
      };

      discordBotServiceMock.getQuizManager = vi
        .fn()
        .mockResolvedValue(quizManagerMock);

      const interaction: APIChatInputApplicationCommandInteraction =
        generateBankOptions("123", "sampleBank");

      const response = await startQuizCommand.execute(interaction);

      expect(quizManagerMock.startQuiz).toHaveBeenCalledWith(
        "123",
        "channel-id",
        "sampleBank",
      );
      expect(response).toEqual(createEphemeralResponse("Quiz started"));
    });

    it("should return an error if the guild id or bank name is missing", async () => {
      const response = await startQuizCommand.execute(
        generateBankOptions("", ""),
      );

      expect(response).toEqual(generateOptionMissingErrorResponse("guild_id"));

      const response2 = await startQuizCommand.execute(
        generateBankOptions("123", ""),
      );

      expect(response2).toEqual(generateOptionMissingErrorResponse("bankname"));
    });

    it("should return a generic error response if an exception occurs", async () => {
      const quizManagerMock = {
        startQuiz: vi.fn().mockRejectedValue(new Error("Some error")),
      };

      discordBotServiceMock.getQuizManager = vi
        .fn()
        .mockResolvedValue(quizManagerMock);

      const interaction: APIChatInputApplicationCommandInteraction =
        generateBankOptions("123", "sampleBank");

      const response = await startQuizCommand.execute(interaction);

      expect(response).toEqual(generateErrorResponse(new Error("Some error")));
    });
  });
});

// Helper function to generate interaction options
function generateBankOptions(
  userId: string,
  bankName: string,
): APIChatInputApplicationCommandInteraction {
  return {
    app_permissions: "",
    authorizing_integration_owners: {},
    channel: { id: "channel-id", type: ChannelType.GuildVoice },
    entitlements: [],
    locale: "en-US",
    version: 1,
    type: 2,
    data: {
      id: "command-id",
      name: "start_quiz",
      options: [
        {
          name: "bankname",
          type: ApplicationCommandOptionType.String,
          value: bankName,
        },
      ],
      resolved: {},
      type: ApplicationCommandType.ChatInput,
    },
    guild_id: userId,
    channel_id: "channel-id",
    member: {
      user: {
        id: userId,
        username: "username",
        discriminator: "0001",
        avatar: "avatar-hash",
        global_name: userId,
      },
      roles: [],
      premium_since: null,
      permissions: "0",
      pending: false,
      mute: false,
      deaf: false,
      joined_at: "",
      flags: GuildMemberFlags.CompletedOnboarding,
    },
    token: "interaction-token",
    id: "interaction-id",
    application_id: "application-id",
  };
}
