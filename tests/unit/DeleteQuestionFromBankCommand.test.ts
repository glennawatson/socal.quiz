import { QuestionStorage } from "../../src/util/questionStorage.js";
import { DeleteQuestionFromBankCommand } from "../../src/handlers/actions/deleteQuestionFromBankCommand.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  APIChatInputApplicationCommandInteraction,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ChannelType,
  GuildMemberFlags,
  Locale,
} from "discord-api-types/v10";
import {
  createEphemeralResponse,
  generateErrorResponse,
  generateOptionMissingErrorResponse,
} from "../../src/util/interactionHelpers.js";

describe("DeleteQuestionFromBankCommand", () => {
  let questionStorageMock: QuestionStorage;
  let deleteQuestionFromBankCommand: DeleteQuestionFromBankCommand;

  beforeEach(() => {
    questionStorageMock = {
      getQuestionBank: vi.fn().mockResolvedValue({ name: '', guildId: '', questions: [{ questionId: 'sampleQuestion' }] }),
      upsertQuestionBank: vi.fn(),
    } as unknown as QuestionStorage;

    deleteQuestionFromBankCommand = new DeleteQuestionFromBankCommand(
        questionStorageMock,
    );
  });

  describe("data", () => {
    it("should return the correct command data", () => {
      const commandData = deleteQuestionFromBankCommand.data();
      expect(commandData.name).toBe("delete_question_from_bank");
    });
  });

  describe("execute", () => {
    it("should return a error if guild id is null", async () => {
      const interaction = generateBankOptions("123", "sampleBank");
      interaction.guild_id = undefined;

      const response = await deleteQuestionFromBankCommand.execute(interaction);

      expect(response).toEqual(
          createEphemeralResponse(
              "Must have a valid guild id.",
          ),
      );
    });
    it("should delete a question and return a confirmation message", async () => {
      const interaction = generateBankOptions("123", "sampleBank");
      interaction.data.options?.push({
        name: "questionid",
        value: "sampleQuestion",
        type: ApplicationCommandOptionType.String,
      });

      const response = await deleteQuestionFromBankCommand.execute(interaction);

      expect(questionStorageMock.getQuestionBank).toHaveBeenCalledWith(
          "guild-id",
          "sampleBank",
      );
      expect(questionStorageMock.upsertQuestionBank).toHaveBeenCalled();
      expect(response).toEqual(
          createEphemeralResponse(
              "Deleted question: sampleQuestion from sampleBank",
          ),
      );
    });

    it("should return an error if the question bank name is missing", async () => {
      const interaction = generateBankOptions("123", "");
      interaction.data.options?.push({
        name: "questionid",
        value: "sampleQuestion",
        type: ApplicationCommandOptionType.String,
      });

      const response = await deleteQuestionFromBankCommand.execute(interaction);

      expect(response).toEqual(generateOptionMissingErrorResponse("bankname"));
    });

    it("should return an error if the question id is missing", async () => {
      const interaction = generateBankOptions("123", "sampleBank");

      const response = await deleteQuestionFromBankCommand.execute(interaction);

      expect(response).toEqual(
          generateOptionMissingErrorResponse("questionid"),
      );
    });

    it("should return a generic error response if an exception occurs", async () => {
      const interaction = generateBankOptions("123", "sampleBank");
      interaction.data.options?.push({
        name: "questionid",
        value: "sampleQuestion",
        type: ApplicationCommandOptionType.String,
      });

      // Simulate an error during the getQuestionBank method call
      questionStorageMock.getQuestionBank = vi
          .fn()
          .mockRejectedValue(new Error("Some error"));

      const response = await deleteQuestionFromBankCommand.execute(interaction);

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
    locale: Locale.EnglishUS,
    attachment_size_limit: 8388608,
    version: 1,
    type: 2,
    data: {
      id: "command-id",
      name: "delete_question_from_bank",
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
