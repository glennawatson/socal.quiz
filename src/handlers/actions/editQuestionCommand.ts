import { IModalHandlerCommand } from "./discordCommand.interfaces.js";
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
  ModalSubmitActionRowComponent,
  TextInputStyle,
} from "discord-api-types/v10";
import {
  createEphemeralResponse,
  generateErrorResponse,
  generateOptionMissingErrorResponse,
  getComponentValue,
  getComponentValueNumber,
  getOptionValue,
} from "../../util/interactionHelpers.js";
import { createTextInput } from "../../util/commandHelpers.js";
import { Question } from "../../question.interfaces.js";
import { IQuestionStorage } from "../../util/IQuestionStorage.interfaces.js";
import { throwError } from "../../util/errorHelpers.js";

interface Inputs {
  bankName: string | undefined;
  questionText: string | undefined;
  timeoutTimeSeconds: number | undefined;
  imageUrl: string | undefined;
  explanation: string | undefined;
  explanationImageUrl: string | undefined;
  correctAnswerIndex: string | undefined;
}

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
    const guildId = interaction.guild_id;
    if (!guildId) {
      return createEphemeralResponse("Must have a valid guild id.");
    }

    const components = interaction.data.components;
    const inputs = this.extractInputs(components);

    const missingFieldMessage = this.getMissingFieldsMessage(inputs);
    if (missingFieldMessage) {
      return createEphemeralResponse(missingFieldMessage);
    }

    const correctAnswerIndex = parseInt(inputs.correctAnswerIndex!, 10);
    const answersText = this.extractAnswersText(components);

    if (this.isInvalidCorrectAnswerIndex(correctAnswerIndex, answersText.length)) {
      return createEphemeralResponse(
          `Invalid correct answer index. Please enter a number between 0 and ${answersText.length - 1}`,
      );
    }

    try {
      const updatedQuestion = await this.getUpdatedQuestion(
          interaction, guildId, inputs, answersText, correctAnswerIndex
      );
      await this.questionStorage.updateQuestion(guildId, updatedQuestion);
      return createEphemeralResponse(`Updated question in bank ${inputs.bankName}.`);
    } catch (error) {
      return generateErrorResponse(error as Error);
    }
  }

  private extractInputs(
      components: ModalSubmitActionRowComponent[]
  ): Inputs {
    return {
      bankName: getComponentValue(components, EditQuestionCommand.componentIds.bankName),
      questionText: getComponentValue(components, EditQuestionCommand.componentIds.questionText),
      timeoutTimeSeconds: getComponentValueNumber(components, EditQuestionCommand.componentIds.timeoutTimeSeconds),
      imageUrl: getComponentValue(components, EditQuestionCommand.componentIds.imageUrl),
      explanation: getComponentValue(components, EditQuestionCommand.componentIds.explanation),
      explanationImageUrl: getComponentValue(components, EditQuestionCommand.componentIds.explanationImageUrl),
      correctAnswerIndex: getComponentValue(components, EditQuestionCommand.componentIds.correctAnswerIndex),
    };
  }

  private getMissingFieldsMessage(inputs: Inputs): string | undefined {
    if (!inputs.bankName) {
      return "Bank name is missing.";
    }
    if (!inputs.questionText) {
      return "Question text is missing.";
    }
    if (!inputs.correctAnswerIndex) {
      return "Correct answer index is missing.";
    }
    return undefined;
  }

  private extractAnswersText(
      components: ModalSubmitActionRowComponent[]
  ): string[] {
    const answersText: string[] = [];
    components.forEach((component) => {
      if (component.components[0]?.custom_id.startsWith("answer")) {
        answersText.push(component.components[0].value);
      }
    });
    return answersText;
  }

  private isInvalidCorrectAnswerIndex(
      correctAnswerIndex: number,
      answersCount: number
  ): boolean {
    return (
        isNaN(correctAnswerIndex) ||
        correctAnswerIndex < 0 ||
        correctAnswerIndex >= answersCount
    );
  }

  private async getUpdatedQuestion(
      interaction: APIModalSubmitInteraction,
      guildId: string,
      inputs: Inputs,
      answersText: string[],
      correctAnswerIndex: number
  ): Promise<Question> {
    const questionId = interaction.data.custom_id.replace(
        this.name + "_",
        ""
    );
    const questions = await this.questionStorage.getQuestions(
        guildId,
        inputs.bankName!
    );
    const existingQuestion = questions.find(
        (q) => q.questionId === questionId
    );

    if (!existingQuestion) {
      throw new Error(`Question with ID ${questionId} not found.`);
    }

    const answers = existingQuestion.answers.map((answer, index) => {
      const answerText =
          answersText[index] ?? throwError("invalid answer text");
      return {
        answerId: answer.answerId,
        answer: answerText,
      };
    });

    const correctAnswer = answers[correctAnswerIndex];

    return {
      ...existingQuestion,
      question: inputs.questionText!,
      answers: answers,
      correctAnswerId: correctAnswer!.answerId,
      questionShowTimeMs: (inputs.timeoutTimeSeconds ?? 20) * 1000,
      imagePartitionKey: inputs.imageUrl
          ? `${inputs.bankName}-${questionId}-question`
          : existingQuestion.imagePartitionKey ?? undefined,
      explanation: inputs.explanation,
      explanationImagePartitionKey: inputs.explanationImageUrl
          ? `${inputs.bankName}-${questionId}-explanation`
          : existingQuestion.explanationImagePartitionKey ?? undefined,
    };
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
      interaction: APIChatInputApplicationCommandInteraction): Promise<APIInteractionResponse> {
    try {
      const guildId = interaction.guild_id;

      if (!guildId) {
        return createEphemeralResponse("Must have a valid guild id.");
      }

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

      const questions = await this.questionStorage.getQuestions(
          guildId,
          bankName,
      );
      const question = questions.find(
          (quest) => quest.questionId === questionId,
      );

      if (!question) {
        return createEphemeralResponse(
            `No valid question found for bank name ${bankName} and question id ${questionId}.`,
        );
      }

      const modal = this.buildModal(questionId, question);

      return {
        type: InteractionResponseType.Modal,
        data: modal.toJSON(),
      };
    } catch (error) {
      return generateErrorResponse(error as Error);
    }
  }

  private buildModal(questionId: string, question: Question): ModalBuilder {
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

    const answerIndex = question.answers.findIndex(
        (x) => x.answerId == question.correctAnswerId,
    );

    // Correct answer index (last row)
    modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
            createTextInput(
                EditQuestionCommand.componentIds.correctAnswerIndex,
                "Correct Answer Index (0-based)",
                TextInputStyle.Short,
                answerIndex.toString(),
                true,
            ),
        ),
    );

    return modal;
  }
}
