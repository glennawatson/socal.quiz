import type { IModalHandlerCommand } from "./discordCommand.interfaces.js";
import {
  type APIChatInputApplicationCommandInteraction,
  type APIInteractionResponse,
  type APIModalSubmitInteraction,
  InteractionResponseType,
  TextInputStyle,
} from "discord-api-types/v10";
import {
  ActionRowBuilder,
  ModalBuilder,
  SlashCommandBuilder,
  type SlashCommandOptionsOnlyBuilder,
  TextInputBuilder,
} from "@discordjs/builders";
import {
  createEphemeralResponse,
  generateErrorResponse,
  getComponentValue,
} from "../../util/interactionHelpers.js";
import { createTextInput } from "../../util/commandHelpers.js";
import type { IQuestionStorage } from "../../util/IQuestionStorage.interfaces.js";
import type { Answer } from "../../answer.interfaces.js";

export class AddQuestionToBankCommand implements IModalHandlerCommand {
  public static readonly componentIds = {
    bankName: "bankname",
    questionText: "questionText",
    answers: "answers",
    correctAnswerIndex: "correctAnswerIndex",
    imageUrl: "imageUrl",
  };

  private readonly questionStorage: IQuestionStorage;
  constructor(questionStorage: IQuestionStorage) {
    this.questionStorage = questionStorage;
  }

  data(): SlashCommandOptionsOnlyBuilder {
    return new SlashCommandBuilder()
      .setName(this.name)
      .setDescription("Add a question to a question bank");
  }

  name = "add_question_to_bank";

  public async execute(
    interaction: APIChatInputApplicationCommandInteraction,
  ): Promise<APIInteractionResponse> {
    const guildId = interaction.guild_id;

    if (!guildId) {
      return createEphemeralResponse("Must have a valid guild id.");
    }

    const modal = new ModalBuilder()
      .setCustomId(this.name)
      .setTitle("Add Question to Bank");

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        createTextInput(
          AddQuestionToBankCommand.componentIds.bankName,
          "Question Bank Name",
          TextInputStyle.Short,
        ),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        createTextInput(
          AddQuestionToBankCommand.componentIds.questionText,
          "Question Text",
          TextInputStyle.Paragraph,
        ),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        createTextInput(
          AddQuestionToBankCommand.componentIds.answers,
          "Answers (comma-separated)",
          TextInputStyle.Paragraph,
        ),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        createTextInput(
          AddQuestionToBankCommand.componentIds.correctAnswerIndex,
          "Correct Answer Index (1-based)",
          TextInputStyle.Short,
        ),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        createTextInput(
          AddQuestionToBankCommand.componentIds.imageUrl,
          "Image URL (optional)",
          TextInputStyle.Short,
          undefined,
          false,
        ),
      ),
    );

    return {
      type: InteractionResponseType.Modal,
      data: modal.toJSON(),
    };
  }

  public async handleModalSubmit(
    interaction: APIModalSubmitInteraction,
  ): Promise<APIInteractionResponse> {
    const guildId = interaction.guild_id;

    if (!guildId) {
      return createEphemeralResponse("Must have a valid guild id.");
    }

    const components = interaction.data.components;

    // Extract values using the componentIds map
    const bankName = getComponentValue(
      components,
      AddQuestionToBankCommand.componentIds.bankName,
    );

    if (!bankName) {
      return createEphemeralResponse("Must specify a valid bank name");
    }

    const questionText = getComponentValue(
      components,
      AddQuestionToBankCommand.componentIds.questionText,
    );

    if (!questionText) {
      return createEphemeralResponse(
        `There is no valid question text for ${bankName}`,
      );
    }

    const imageUrl = getComponentValue(
      components,
      AddQuestionToBankCommand.componentIds.imageUrl,
    );

    // Parse comma-separated answers
    const answersRaw = getComponentValue(
      components,
      AddQuestionToBankCommand.componentIds.answers,
    );

    if (!answersRaw) {
      return createEphemeralResponse("Must specify at least one answer.");
    }

    const answerTexts = answersRaw
      .split(",")
      .map((a) => a.trim())
      .filter((a) => a.length > 0);

    if (answerTexts.length === 0) {
      return createEphemeralResponse("Must specify at least one answer.");
    }

    const answers: Answer[] = await Promise.all(
      answerTexts.map((text) => this.questionStorage.generateAnswer(text)),
    );

    const correctAnswerIndexStr = getComponentValue(
      components,
      AddQuestionToBankCommand.componentIds.correctAnswerIndex,
    );

    if (!correctAnswerIndexStr) {
      return createEphemeralResponse(
        "Invalid correct answer index. No answer is specified.",
      );
    }

    const correctAnswerIndex = parseInt(correctAnswerIndexStr, 10) - 1;
    if (
      isNaN(correctAnswerIndex) ||
      correctAnswerIndex < 0 ||
      correctAnswerIndex >= answers.length
    ) {
      return createEphemeralResponse(
        `Invalid correct answer index. Please enter a number between 1 and ${answers.length}`,
      );
    }

    const correctAnswer = answers[correctAnswerIndex];

    if (!correctAnswer) {
      return createEphemeralResponse(
        `Invalid correct answer index. Could not find a valid answer.`,
      );
    }

    try {
      const newQuestion = await this.questionStorage.generateQuestion(
        questionText,
        answers,
        correctAnswer.answerId,
        20000,
        imageUrl);

      const questionBank = await this.questionStorage.getQuestionBank(guildId, bankName);

      questionBank.questions = questionBank.questions.concat([newQuestion]);

      await this.questionStorage.upsertQuestionBank(questionBank);

      return createEphemeralResponse(`Added question to bank ${bankName}.`);
    } catch (error) {
      if (error instanceof Error) {
        return generateErrorResponse(error);
      } else {
        return createEphemeralResponse(
          `Failed to add question to bank ${bankName}: An unknown error occurred.`,
        );
      }
    }
  }
}
