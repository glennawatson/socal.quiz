import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  APIChatInputApplicationCommandInteraction,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ChannelType,
  GuildMemberFlags,
} from "discord-api-types/v10";
import { QuestionStorage } from "../../src/util/questionStorage.js";
import { DeleteQuestionBankCommand } from "../../src/handlers/actions/deleteQuestionBankCommand.js";
import {
  createEphemeralResponse,
  generateErrorResponse,
  generateOptionMissingErrorResponse,
} from "../../src/util/interactionHelpers.js";

describe("DeleteQuestionBankCommand", () => {
  let questionStorageMock: QuestionStorage;
  let deleteQuestionBankCommand: DeleteQuestionBankCommand;

  beforeEach(() => {
    questionStorageMock = {
      deleteQuestionBank: vi.fn(),
    } as unknown as QuestionStorage;

    deleteQuestionBankCommand = new DeleteQuestionBankCommand(
      questionStorageMock,
    );
  });

  describe("data", () => {
    it("should return the correct command data", () => {
      const commandData = deleteQuestionBankCommand.data();
      expect(commandData.name).toBe("delete_question_bank");
    });
  });

  describe("execute", () => {
    it("should delete a question bank and return a confirmation message", async () => {
      const interaction: APIChatInputApplicationCommandInteraction =
        generateBankOptions("123", "sampleBank");

      const response = await deleteQuestionBankCommand.execute(interaction);

      expect(response).toEqual(
        createEphemeralResponse("Deleted question bank: sampleBank"),
      );
      expect(questionStorageMock.deleteQuestionBank).toHaveBeenCalledWith(
        "guild-id",
        "sampleBank",
      );
    });

    it("should return an error if the question bank name is missing", async () => {
      const interaction: APIChatInputApplicationCommandInteraction =
        generateBankOptions("123", "");

      const response = await deleteQuestionBankCommand.execute(interaction);

      expect(response).toEqual(generateOptionMissingErrorResponse("bankname"));
    });

    it("should return a generic error response if an exception occurs", async () => {
      const interaction: APIChatInputApplicationCommandInteraction =
        generateBankOptions("123", "sampleBank");

      // Simulate an error during the deleteQuestionBank method call
      questionStorageMock.deleteQuestionBank = vi
        .fn()
        .mockRejectedValue(new Error("Some error"));

      const response = await deleteQuestionBankCommand.execute(interaction);

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
      name: "delete_question_bank",
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
    guild_id: "guild-id",
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
