import { IModalHandlerCommand } from "./discordCommand.interfaces.js";
import {
  APIChatInputApplicationCommandInteraction,
  APIInteractionResponse,
  APIModalSubmitInteraction,
  InteractionResponseType,
  TextInputStyle,
} from "discord-api-types/v10";
import {
  ActionRowBuilder,
  ModalBuilder,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  TextInputBuilder,
} from "@discordjs/builders";
import {
  createEphemeralResponse,
  generateErrorResponse,
  getComponentValue,
  getComponentValueNumber,
} from "../../util/interactionHelpers.js";
import { createTextInput } from "../../util/commandHelpers.js";
import { IQuestionStorage } from "../../util/IQuestionStorage.interfaces.js";
import { Answer } from "../../answer.interfaces.js";

export class AddQuestionToBankCommand implements IModalHandlerCommand {
  public static readonly componentIds = {
    bankName: "bankname",
    questionText: "questionText",
    imageUrl: "imageUrl",
    explanation: "explanation",
    explanationImageUrl: "explanationImageUrl",
    timeoutTimeSeconds: "timeoutTimeSeconds",
    answers: Array.from({ length: 4 }, (_, i) => `answer${i + 1}`),
    correctAnswerIndex: "correctAnswerIndex",
  };

  constructor(private readonly questionStorage: IQuestionStorage) {}

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
          AddQuestionToBankCommand.componentIds.timeoutTimeSeconds,
          "Question timeout time",
          TextInputStyle.Short,
          undefined,
          false,
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
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        createTextInput(
          AddQuestionToBankCommand.componentIds.explanation,
          "Explanation (Optional)",
          TextInputStyle.Paragraph,
          undefined,
          false,
        ),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        createTextInput(
          AddQuestionToBankCommand.componentIds.explanationImageUrl,
          "Explanation Image URL (Optional)",
          TextInputStyle.Short,
          undefined,
          false,
        ),
      ),
    );

    // Add answer input components (defaulting to 4 answers)
    for (const answerId of AddQuestionToBankCommand.componentIds.answers) {
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          createTextInput(
            answerId,
            `Answer ${answerId.replace("answer", "")}`,
            TextInputStyle.Short,
          ),
        ),
      );
    }

    // Correct answer index (last row)
    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        createTextInput(
          AddQuestionToBankCommand.componentIds.correctAnswerIndex,
          "Correct Answer Index (0-based)",
          TextInputStyle.Short,
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
    const explanation = getComponentValue(
      components,
      AddQuestionToBankCommand.componentIds.explanation,
    );
    const explanationImageUrl = getComponentValue(
      components,
      AddQuestionToBankCommand.componentIds.explanationImageUrl,
    );
    const questionShowTimeMs =
      (getComponentValueNumber(
        components,
        AddQuestionToBankCommand.componentIds.timeoutTimeSeconds,
      ) ?? 20) * 1000;

    // Extract answers
    const answers: Answer[] = await Promise.all(
      AddQuestionToBankCommand.componentIds.answers
        .map((answerId) => ({
          answerId,
          value: getComponentValue(components, answerId),
        }))
        .filter(({ value }) => value !== undefined)
        .map(({ value }) =>
          this.questionStorage.generateAnswer(value as string),
        ),
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

    const correctAnswerIndex = parseInt(correctAnswerIndexStr, 10);
    if (
      isNaN(correctAnswerIndex) ||
      correctAnswerIndex < 0 ||
      correctAnswerIndex >= answers.length
    ) {
      return createEphemeralResponse(
        `Invalid correct answer index. Please enter a number between 0 and ${answers.length - 1}`,
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
        questionShowTimeMs,
        imageUrl,
        explanation,
        explanationImageUrl);

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
