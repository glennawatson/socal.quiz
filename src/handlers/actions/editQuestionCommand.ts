import { IModalHandlerCommand } from "./discordCommand.interfaces";
import {
  ActionRowBuilder,
  ModalBuilder,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  TextInputBuilder,
} from "@discordjs/builders";
import {
  APIChatInputApplicationCommandInteraction,
  APIInteractionResponse,
  APIModalSubmitInteraction,
  InteractionResponseType,
  TextInputStyle,
} from "discord-api-types/v10";
import {
  createEphemeralResponse,
  generateErrorResponse,
  generateOptionMissingErrorResponse,
  getOptionValue,
  getComponentValue,
  getComponentValueNumber,
} from "../../util/interactionHelpers";
import { createTextInput } from "../../util/commandHelpers";
import { Question } from "../../question.interfaces";
import { IQuestionStorage } from "../../util/IQuestionStorage.interfaces";
import {throwError} from "../../util/errorHelpers";

export class EditQuestionCommand implements IModalHandlerCommand {
  public static readonly componentIds = {
    bankName: "bankname",
    questionText: "questionText",
    imageUrl: "imageUrl",
    explanation: "explanation",
    explanationImageUrl: "explanationImageUrl",
    timeoutTimeSeconds: "timeoutTimeSeconds",
    correctAnswerIndex: "correctAnswerIndex",
  };

  public static readonly optionIds = {
    bankName: "bankname",
    questionId: "questionid",
  };

  constructor(private readonly questionStorage: IQuestionStorage) {}

  public async handleModalSubmit(
    interaction: APIModalSubmitInteraction,
  ): Promise<APIInteractionResponse> {
    const components = interaction.data.components;

    const bankName = getComponentValue(
      components,
      EditQuestionCommand.componentIds.bankName,
    );
    const questionText = getComponentValue(
      components,
      EditQuestionCommand.componentIds.questionText,
    );
    const timeoutTimeSeconds = getComponentValueNumber(
      components,
      EditQuestionCommand.componentIds.timeoutTimeSeconds,
    );
    const imageUrl = getComponentValue(
      components,
      EditQuestionCommand.componentIds.imageUrl,
    );
    const explanation = getComponentValue(
      components,
      EditQuestionCommand.componentIds.explanation,
    );
    const explanationImageUrl = getComponentValue(
      components,
      EditQuestionCommand.componentIds.explanationImageUrl,
    );

    const answersText: string[] = [];

    components.forEach((component) => {
      if (component.components[0]?.custom_id.startsWith("answer")) {
        answersText.push(component.components[0].value);
      }
    });

    const correctAnswerIndexStr = getComponentValue(
      components,
      EditQuestionCommand.componentIds.correctAnswerIndex,
    );

    if (!bankName) {
      return createEphemeralResponse("Bank name is missing.");
    }

    if (!questionText) {
      return createEphemeralResponse("Question text is missing.");
    }

    if (!correctAnswerIndexStr) {
      return createEphemeralResponse("Correct answer index is missing.");
    }

    const correctAnswerIndex = parseInt(correctAnswerIndexStr, 10);
    if (
      isNaN(correctAnswerIndex) ||
      correctAnswerIndex < 0 ||
      correctAnswerIndex >= answersText.length
    ) {
      return createEphemeralResponse(
        `Invalid correct answer index. Please enter a number between 0 and ${answersText.length - 1}`,
      );
    }

    try {
      const questionId = interaction.data.custom_id.replace(
        this.name + "_",
        "",
      );
      const questions = await this.questionStorage.getQuestions(bankName);
      const existingQuestion = questions.find(
        (q) => q.questionId === questionId,
      );

      if (!existingQuestion) {
        return createEphemeralResponse(
          `Question with ID ${questionId} not found.`,
        );
      }

      const updatedQuestion: Question = {
        ...existingQuestion,
        question: questionText,
        answers: existingQuestion.answers.map((answer, index) => {
          const answerText = answersText[index] ?? throwError('invalid answer text');
          return ({
            answerId: answer.answerId,
            answer: answerText,
          });
        }),
        correctAnswerIndex,
        questionShowTimeMs: (timeoutTimeSeconds ?? 20) * 1000,
        imagePartitionKey: imageUrl
          ? `${bankName}-${questionId}-question`
          : existingQuestion.imagePartitionKey ?? undefined,
        explanation,
        explanationImagePartitionKey: explanationImageUrl
          ? `${bankName}-${questionId}-explanation`
          : existingQuestion.explanationImagePartitionKey ?? undefined,
      };

      await this.questionStorage.updateQuestion(updatedQuestion);

      return createEphemeralResponse(`Updated question in bank ${bankName}.`);
    } catch (error) {
      return createEphemeralResponse(
        `Failed to update question: ${(error as Error).message}`,
      );
    }
  }

  public data(): SlashCommandOptionsOnlyBuilder {
    return new SlashCommandBuilder()
      .setName(this.name)
      .setDescription("Edit a question")
      .addStringOption((option) =>
        option
          .setName(EditQuestionCommand.optionIds.bankName)
          .setDescription("The name of the question bank")
          .setRequired(true),
      )
      .addStringOption((option) =>
        option
          .setName(EditQuestionCommand.optionIds.questionId)
          .setDescription("The ID of the question")
          .setRequired(true),
      );
  }

  public name = "edit_question";

  public async execute(
    interaction: APIChatInputApplicationCommandInteraction,
  ): Promise<APIInteractionResponse> {
    try {
      const bankName = getOptionValue(
        interaction.data.options,
        EditQuestionCommand.optionIds.bankName,
      );
      const questionId = getOptionValue(
        interaction.data.options,
        EditQuestionCommand.optionIds.questionId,
      );

      if (!bankName) {
        return generateOptionMissingErrorResponse(
          EditQuestionCommand.optionIds.bankName,
        );
      }

      if (!questionId) {
        return generateOptionMissingErrorResponse(
          EditQuestionCommand.optionIds.questionId,
        );
      }

      const questions = await this.questionStorage.getQuestions(bankName);
      const question = questions.find(
        (quest) => quest.questionId === questionId,
      );

      if (!question) {
        return createEphemeralResponse(
          `No valid question found for bank name ${bankName} and question id ${questionId}.`,
        );
      }

      const modal = new ModalBuilder()
        .setCustomId(this.name + "_" + questionId)
        .setTitle("Edit Question");

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          createTextInput(
            EditQuestionCommand.componentIds.bankName,
            "Question Bank Name",
            TextInputStyle.Short,
            question.bankName,
            true,
          ),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          createTextInput(
            EditQuestionCommand.componentIds.questionText,
            "Question Text",
            TextInputStyle.Paragraph,
            question.question,
            true,
          ),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          createTextInput(
            EditQuestionCommand.componentIds.timeoutTimeSeconds,
            "Question timeout time",
            TextInputStyle.Short,
            question.questionShowTimeMs.toString(),
            false,
          ),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          createTextInput(
            EditQuestionCommand.componentIds.imageUrl,
            "Image URL (optional)",
            TextInputStyle.Short,
            question.imagePartitionKey ? undefined : "",
            false,
          ),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          createTextInput(
            EditQuestionCommand.componentIds.explanation,
            "Explanation (Optional)",
            TextInputStyle.Paragraph,
            question.explanation ?? "",
            false,
          ),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          createTextInput(
            EditQuestionCommand.componentIds.explanationImageUrl,
            "Explanation Image URL (optional)",
            TextInputStyle.Short,
            question.explanationImagePartitionKey ? undefined : "",
            false,
          ),
        ),
      );

      // Add answer input components dynamically
      question.answers.forEach((answer, index) => {
        modal.addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            createTextInput(
              `answer_${answer.answerId}`,
              `Answer ${index + 1}`,
              TextInputStyle.Short,
              answer.answer,
              true,
            ),
          ),
        );
      });

      // Correct answer index (last row)
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          createTextInput(
            EditQuestionCommand.componentIds.correctAnswerIndex,
            "Correct Answer Index (0-based)",
            TextInputStyle.Short,
            question.correctAnswerIndex.toString(),
            true,
          ),
        ),
      );

      return {
        type: InteractionResponseType.Modal,
        data: modal.toJSON(),
      };
    } catch (error) {
      return generateErrorResponse(error as Error);
    }
  }
}
