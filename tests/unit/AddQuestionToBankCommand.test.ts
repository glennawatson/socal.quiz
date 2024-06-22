import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  APIChatInputApplicationCommandInteraction,
  APIModalSubmitInteraction,
  ComponentType,
  InteractionResponseType,
  InteractionType,
} from "discord-api-types/v10";
import { AddQuestionToBankCommand } from "../../src/handlers/actions/addQuestionToBankCommand";
import { createEphemeralResponse } from "../../src/util/interactionHelpers";
import { Question } from "../../src/question";
import { IQuestionStorage } from "../../src/util/questionStorage";

describe("AddQuestionToBankCommand", () => {
  let questionStorageMock: IQuestionStorage;
  let addQuestionToBankCommand: AddQuestionToBankCommand;

  beforeEach(() => {
    questionStorageMock = {
      getQuestions: vi.fn(() => Promise.resolve([])),
      deleteQuestionBank: vi.fn(() => Promise.resolve()),
      deleteQuestion: vi.fn(() => Promise.resolve()),
      getPresignedUrl: vi.fn(() => Promise.resolve("")),
      getQuestionImagePresignedUrl: vi.fn(() => Promise.resolve("")),
      getExplanationImagePresignedUrl: vi.fn(() => Promise.resolve("")),
      generateAndAddQuestion: vi.fn(() => Promise.resolve()),
      generateQuestion: vi.fn(() => Promise.resolve({} as Question)),
    };

    addQuestionToBankCommand = new AddQuestionToBankCommand(
      questionStorageMock,
    );
  });

  describe("data", () => {
    it("should return the correct command data", () => {
      const commandData = addQuestionToBankCommand.data();
      expect(commandData.name).toBe("add_question_to_bank");
    });
  });

  describe("execute", () => {
    it("should create and return a modal", async () => {
      const interaction = {} as APIChatInputApplicationCommandInteraction;
      const response = await addQuestionToBankCommand.execute(interaction);

      expect(response.type).toBe(InteractionResponseType.Modal);
    });
  });

  describe("handleModalSubmit", () => {
    it("should generate and add a question and return a confirmation message", async () => {
      const interaction: APIModalSubmitInteraction = {
        app_permissions: "",
        application_id: "",
        authorizing_integration_owners: {},
        entitlements: [],
        id: "",
        locale: "en-US",
        token: "",
        version: 1,
        type: InteractionType.ModalSubmit,
        data: {
          custom_id: "add_question_to_bank",
          components: [
            {
              components: [
                {
                  custom_id: AddQuestionToBankCommand.componentIds.questionText,
                  value: "Sample question?",
                  type: ComponentType.TextInput,
                },
                {
                  custom_id: AddQuestionToBankCommand.componentIds.bankName,
                  value: "test bank",
                  type: ComponentType.TextInput,
                },
                {
                  custom_id:
                    AddQuestionToBankCommand.componentIds.correctAnswerIndex,
                  value: "1",
                  type: ComponentType.TextInput,
                },
              ],
              type: ComponentType.ActionRow,
            },
          ],
        },
        guild_id: "guild-id",
      };

      const response =
        await addQuestionToBankCommand.handleModalSubmit(interaction);

      expect(response).toEqual(
        createEphemeralResponse("Added question to bank test bank."),
      );
      expect(questionStorageMock.generateAndAddQuestion).toHaveBeenCalledWith(
        "test bank",
        "Sample question?",
        expect.any(Array),
        1,
        expect.any(Number),
        undefined,
        undefined,
        undefined,
      );
    });

    it("should return an error for an invalid bank name", async () => {
      const interaction: APIModalSubmitInteraction = {
        app_permissions: "",
        application_id: "",
        authorizing_integration_owners: {},
        entitlements: [],
        id: "",
        locale: "en-US",
        token: "",
        version: 1,
        type: InteractionType.ModalSubmit,
        data: {
          custom_id: "add_question_to_bank",
          components: [
            {
              components: [
                {
                  custom_id: AddQuestionToBankCommand.componentIds.questionText,
                  value: "Sample question?",
                  type: ComponentType.TextInput,
                },
                {
                  custom_id: AddQuestionToBankCommand.componentIds.bankName,
                  value: "",
                  type: ComponentType.TextInput,
                },
                {
                  custom_id:
                    AddQuestionToBankCommand.componentIds.correctAnswerIndex,
                  value: "1",
                  type: ComponentType.TextInput,
                },
              ],
              type: ComponentType.ActionRow,
            },
          ],
        },
        guild_id: "guild-id",
      };

      const response =
        await addQuestionToBankCommand.handleModalSubmit(interaction);

      expect(response).toEqual(createEphemeralResponse("Invalid bank name"));
    });

    it("should return an error for an invalid question text", async () => {
      const interaction: APIModalSubmitInteraction = {
        app_permissions: "",
        application_id: "",
        authorizing_integration_owners: {},
        entitlements: [],
        id: "",
        locale: "en-US",
        token: "",
        version: 1,
        type: InteractionType.ModalSubmit,
        data: {
          custom_id: "add_question_to_bank",
          components: [
            {
              components: [
                {
                  custom_id: AddQuestionToBankCommand.componentIds.questionText,
                  value: "",
                  type: ComponentType.TextInput,
                },
                {
                  custom_id: AddQuestionToBankCommand.componentIds.bankName,
                  value: "test bank",
                  type: ComponentType.TextInput,
                },
                {
                  custom_id:
                    AddQuestionToBankCommand.componentIds.correctAnswerIndex,
                  value: "1",
                  type: ComponentType.TextInput,
                },
              ],
              type: ComponentType.ActionRow,
            },
          ],
        },
        guild_id: "guild-id",
      };

      const response =
        await addQuestionToBankCommand.handleModalSubmit(interaction);

      expect(response).toEqual(
        createEphemeralResponse(
          `There is no valid question text for test bank`,
        ),
      );
    });

    it("should return an error for an invalid correct answer index string", async () => {
      const interaction: APIModalSubmitInteraction = {
        app_permissions: "",
        application_id: "",
        authorizing_integration_owners: {},
        entitlements: [],
        id: "",
        locale: "en-US",
        token: "",
        version: 1,
        type: InteractionType.ModalSubmit,
        data: {
          custom_id: "add_question_to_bank",
          components: [
            {
              components: [
                {
                  custom_id: AddQuestionToBankCommand.componentIds.questionText,
                  value: "Sample question?",
                  type: ComponentType.TextInput,
                },
                {
                  custom_id: AddQuestionToBankCommand.componentIds.bankName,
                  value: "test bank",
                  type: ComponentType.TextInput,
                },
                {
                  custom_id:
                    AddQuestionToBankCommand.componentIds.correctAnswerIndex,
                  value: "",
                  type: ComponentType.TextInput,
                },
              ],
              type: ComponentType.ActionRow,
            },
          ],
        },
        guild_id: "guild-id",
      };

      const response =
        await addQuestionToBankCommand.handleModalSubmit(interaction);

      expect(response).toEqual(
        createEphemeralResponse(
          "Invalid correct answer index. No answer is specified.",
        ),
      );
    });

    it("should return an error for an invalid correct answer index number", async () => {
      const interaction: APIModalSubmitInteraction = {
        app_permissions: "",
        application_id: "",
        authorizing_integration_owners: {},
        entitlements: [],
        id: "",
        locale: "en-US",
        token: "",
        version: 1,
        type: InteractionType.ModalSubmit,
        data: {
          custom_id: "add_question_to_bank",
          components: [
            {
              components: [
                {
                  custom_id: AddQuestionToBankCommand.componentIds.questionText,
                  value: "Sample question?",
                  type: ComponentType.TextInput,
                },
                {
                  custom_id: AddQuestionToBankCommand.componentIds.bankName,
                  value: "test bank",
                  type: ComponentType.TextInput,
                },
                {
                  custom_id:
                    AddQuestionToBankCommand.componentIds.correctAnswerIndex,
                  value: "5", // Assuming there are less than 5 answers
                  type: ComponentType.TextInput,
                },
              ],
              type: ComponentType.ActionRow,
            },
          ],
        },
        guild_id: "guild-id",
      };

      const response =
        await addQuestionToBankCommand.handleModalSubmit(interaction);

      expect(response).toEqual(
        createEphemeralResponse(
          "Invalid correct answer index. Please enter a number between 0 and 3",
        ),
      );
    });

    it("should handle errors when adding a question to the bank", async () => {
      vi.spyOn(
        questionStorageMock,
        "generateAndAddQuestion",
      ).mockRejectedValueOnce(new Error("Test error"));

      const interaction: APIModalSubmitInteraction = {
        app_permissions: "",
        application_id: "",
        authorizing_integration_owners: {},
        entitlements: [],
        id: "",
        locale: "en-US",
        token: "",
        version: 1,
        type: InteractionType.ModalSubmit,
        data: {
          custom_id: "add_question_to_bank",
          components: [
            {
              components: [
                {
                  custom_id: AddQuestionToBankCommand.componentIds.questionText,
                  value: "Sample question?",
                  type: ComponentType.TextInput,
                },
                {
                  custom_id: AddQuestionToBankCommand.componentIds.bankName,
                  value: "test bank",
                  type: ComponentType.TextInput,
                },
                {
                  custom_id:
                    AddQuestionToBankCommand.componentIds.correctAnswerIndex,
                  value: "1",
                  type: ComponentType.TextInput,
                },
              ],
              type: ComponentType.ActionRow,
            },
          ],
        },
        guild_id: "guild-id",
      };

      const response =
        await addQuestionToBankCommand.handleModalSubmit(interaction);

      expect(response).toEqual(
        createEphemeralResponse(
          "Failed to add question to bank test bank: Test error",
        ),
      );
    });

    it("should handle unknown errors when adding a question to the bank", async () => {
      vi.spyOn(
        questionStorageMock,
        "generateAndAddQuestion",
      ).mockRejectedValueOnce("Unknown error");

      const interaction: APIModalSubmitInteraction = {
        app_permissions: "",
        application_id: "",
        authorizing_integration_owners: {},
        entitlements: [],
        id: "",
        locale: "en-US",
        token: "",
        version: 1,
        type: InteractionType.ModalSubmit,
        data: {
          custom_id: "add_question_to_bank",
          components: [
            {
              components: [
                {
                  custom_id: AddQuestionToBankCommand.componentIds.questionText,
                  value: "Sample question?",
                  type: ComponentType.TextInput,
                },
                {
                  custom_id: AddQuestionToBankCommand.componentIds.bankName,
                  value: "test bank",
                  type: ComponentType.TextInput,
                },
                {
                  custom_id:
                    AddQuestionToBankCommand.componentIds.correctAnswerIndex,
                  value: "1",
                  type: ComponentType.TextInput,
                },
              ],
              type: ComponentType.ActionRow,
            },
          ],
        },
        guild_id: "guild-id",
      };

      const response =
        await addQuestionToBankCommand.handleModalSubmit(interaction);

      expect(response).toEqual(
        createEphemeralResponse(
          "Failed to add question to bank test bank: An unknown error occurred.",
        ),
      );
    });
  });
});
