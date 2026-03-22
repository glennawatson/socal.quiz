import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEphemeralResponse } from "../../src/util/interactionHelpers.js";
import InteractionGenerator from "../helpers/InteractionGenerator.js";
import {
  APIChatInputApplicationCommandInteraction,
  APIModalInteractionResponse,
  APIModalSubmitInteraction,
} from "discord-api-types/v10";
import { IQuestionStorage } from "../../src/util/IQuestionStorage.interfaces.js";
import { AddQuestionToBankCommand } from "../../src/handlers/actions/addQuestionToBankCommand.js";
import { Answer } from "../../src/answer.interfaces.js";

describe("AddQuestionToBankCommand", () => {
  let questionStorage: IQuestionStorage;
  let addQuestionToBankCommand: AddQuestionToBankCommand;
  let spyGenerateAndAddQuestion = vi.fn();

  beforeEach(() => {
    spyGenerateAndAddQuestion = vi.fn();
    questionStorage = {
      generateAnswer: vi.fn((answerText: string) => {
        return Promise.resolve({
          answerId: answerText + "id",
          answer: answerText,
        } as Answer);
      }),
      generateQuestion: spyGenerateAndAddQuestion,
      getQuestionBank: vi.fn().mockResolvedValue({ name: '', guildId: '', questions: [] }),
      upsertQuestionBank: vi.fn(),
    } as unknown as IQuestionStorage;

    addQuestionToBankCommand = new AddQuestionToBankCommand(questionStorage);
  });

  describe("data", () => {
    it("should return the correct command data", () => {
      const commandData = addQuestionToBankCommand.data();
      expect(commandData.name).toBe("add_question_to_bank");
    });
  });

  describe("execute", () => {
    it("should return a error if guild id is null", async () => {
      const interaction = InteractionGenerator.generateAddQuestionOptions(
          "123",
          "sampleBank",
          "My life is",
          ["1", "2", "3", "4"],
          0,
      );

      interaction.guild_id = undefined;

      const response = await addQuestionToBankCommand.execute(interaction);

      expect(response).toEqual(
          createEphemeralResponse(
              "Must have a valid guild id.",
          ),
      );
    });

    it("should generate a modal response", async () => {
      const interaction: APIChatInputApplicationCommandInteraction =
        InteractionGenerator.generateAddQuestionOptions(
          "123",
          "sampleBank",
          "My life is",
          ["1", "2", "3", "4"],
          0,
        );

      const response = (await addQuestionToBankCommand.execute(
        interaction,
      )) as APIModalInteractionResponse;

      expect(response.type).toBe(9); // Modal
      expect(response.data.custom_id).toBe("add_question_to_bank");
      expect(response.data.title).toBe("Add Question to Bank");
    });
  });

  describe("handleModalSubmit", () => {
    it("should return a error if guild id is null", async () => {
      const interaction: APIModalSubmitInteraction =
          InteractionGenerator.generateModalSubmit(
              "123",
              "sampleBank",
              "What is 2+2?",
              ["2", "3", "4"],
              2,
          );

      interaction.guild_id = undefined;

      const response = await addQuestionToBankCommand.handleModalSubmit(interaction);

      expect(response).toEqual(
          createEphemeralResponse(
              "Must have a valid guild id.",
          ),
      );
    });

    it("should add a question to the bank and return a confirmation message", async () => {
      const interaction: APIModalSubmitInteraction =
        InteractionGenerator.generateModalSubmit(
          "123",
          "sampleBank",
          "What is 2+2?",
          ["2", "3", "4"],
          3,
        );

      const response =
        await addQuestionToBankCommand.handleModalSubmit(interaction);

      expect(spyGenerateAndAddQuestion).toHaveBeenCalledWith(
        "What is 2+2?",
        [
          { answerId: "2id", answer: "2" },
          { answerId: "3id", answer: "3" },
          { answerId: "4id", answer: "4" },
        ],
        "4id",
        20000,
        "",
      );
      expect(response).toEqual(
        createEphemeralResponse("Added question to bank sampleBank."),
      );
    });

    it("should return an error if the question text is missing", async () => {
      const interaction: APIModalSubmitInteraction =
        InteractionGenerator.generateModalSubmit(
          "123",
          "sampleBank",
          "",
          ["2", "3", "4"],
          2,
        );

      const response =
        await addQuestionToBankCommand.handleModalSubmit(interaction);

      expect(response).toEqual(
        createEphemeralResponse(
          "There is no valid question text for sampleBank",
        ),
      );
    });

    it("should return an error if the correct answer index is missing", async () => {
      const interaction: APIModalSubmitInteraction =
        InteractionGenerator.generateModalSubmit(
          "123",
          "sampleBank",
          "What is 2+2?",
          ["2", "3", "4"],
          undefined,
        );

      const response =
        await addQuestionToBankCommand.handleModalSubmit(interaction);

      expect(response).toEqual(
        createEphemeralResponse(
          "Invalid correct answer index. No answer is specified.",
        ),
      );
    });

    it("should return an error if the correct answer index is not a number", async () => {
      const interaction: APIModalSubmitInteraction =
        InteractionGenerator.generateModalSubmit(
          "123",
          "sampleBank",
          "What is 2+2?",
          ["2", "3", "4"],
          "invalid",
        );

      const response =
        await addQuestionToBankCommand.handleModalSubmit(interaction);

      expect(response).toEqual(
        createEphemeralResponse(
          "Invalid correct answer index. Please enter a number between 1 and 3",
        ),
      );
    });

    it("should return an error if the correct answer index is out of range", async () => {
      const interaction: APIModalSubmitInteraction =
        InteractionGenerator.generateModalSubmit(
          "123",
          "sampleBank",
          "What is 2+2?",
          ["2", "3", "4"],
          5,
        );

      const response =
        await addQuestionToBankCommand.handleModalSubmit(interaction);

      expect(response).toEqual(
        createEphemeralResponse(
          "Invalid correct answer index. Please enter a number between 1 and 3",
        ),
      );
    });

    it("should return an error if the correct answer is not found", async () => {
      const interaction: APIModalSubmitInteraction =
        InteractionGenerator.generateModalSubmit(
          "123",
          "sampleBank",
          "What is 2+2?",
          ["2", "3", "4"],
          3,
        );

      // Simulate generateAnswer returning undefined for the correct answer
      (questionStorage.generateAnswer as any).mockImplementation(
        (answerText: string) => {
          if (answerText === "4") {
            return undefined;
          }
          return Promise.resolve({
            answerId: answerText + "id",
            answer: answerText,
          } as Answer);
        },
      );

      const response =
        await addQuestionToBankCommand.handleModalSubmit(interaction);

      expect(response).toEqual(
        createEphemeralResponse(
          "Invalid correct answer index. Could not find a valid answer.",
        ),
      );
    });

    it("should return an error if answersRaw is undefined", async () => {
      const interaction: APIModalSubmitInteraction =
        InteractionGenerator.generateModalSubmit(
          "123",
          "sampleBank",
          "What is 2+2?",
          [],
          2,
        );

      // Override the answers component to have no value
      const answersComponent = interaction.data.components.find(
        (c: any) => c.components?.[0]?.custom_id === "answers",
      ) as any;
      if (answersComponent) {
        answersComponent.components[0].value = "";
      }

      const response =
        await addQuestionToBankCommand.handleModalSubmit(interaction);

      expect(response).toEqual(
        createEphemeralResponse("Must specify at least one answer."),
      );
    });

    it("should return an error if all answers are empty after splitting", async () => {
      const interaction: APIModalSubmitInteraction =
        InteractionGenerator.generateModalSubmit(
          "123",
          "sampleBank",
          "What is 2+2?",
          [],
          2,
        );

      // Override the answers component to have only commas/whitespace
      const answersComponent = interaction.data.components.find(
        (c: any) => c.components?.[0]?.custom_id === "answers",
      ) as any;
      if (answersComponent) {
        answersComponent.components[0].value = ", , ,";
      }

      const response =
        await addQuestionToBankCommand.handleModalSubmit(interaction);

      expect(response).toEqual(
        createEphemeralResponse("Must specify at least one answer."),
      );
    });

    it("should return a generic error response if an unknown error occurs", async () => {
      questionStorage.generateQuestion = vi
        .fn()
        .mockImplementation(() => {
          throw new Error("Unknown error");
        });

      const interaction: APIModalSubmitInteraction =
        InteractionGenerator.generateModalSubmit(
          "123",
          "sampleBank",
          "What is 2+2?",
          ["2", "3", "4"],
          2,
        );

      const response =
        await addQuestionToBankCommand.handleModalSubmit(interaction);

      expect(response).toEqual(createEphemeralResponse("Unknown error"));
    });

    it("should return an error if the bank name is missing", async () => {
      const interaction: APIModalSubmitInteraction =
        InteractionGenerator.generateModalSubmit(
          "123",
          "",
          "What is 2+2?",
          ["2", "3", "4"],
          2,
        );

      const response =
        await addQuestionToBankCommand.handleModalSubmit(interaction);

      expect(response).toEqual(
        createEphemeralResponse("Must specify a valid bank name"),
      );
    });

    it("should return a generic error response if an unknown error occurs", async () => {
      questionStorage.generateQuestion = vi
        .fn()
        .mockImplementation(() => {
          throw "Unknown error";
        });

      const interaction: APIModalSubmitInteraction =
        InteractionGenerator.generateModalSubmit(
          "123",
          "sampleBank",
          "What is 2+2?",
          ["2", "3", "4"],
          2,
        );

      const response =
        await addQuestionToBankCommand.handleModalSubmit(interaction);

      expect(response).toEqual(
        createEphemeralResponse(
          "Failed to add question to bank sampleBank: An unknown error occurred.",
        ),
      );
    });
  });
});
