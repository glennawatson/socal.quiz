import { IModalHandlerCommand } from "./discordCommand.interfaces";
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
  getComponentValue,
  getComponentValueNumber,
} from "../../util/interactionHelpers";
import { createTextInput } from "../../util/commandHelpers";
import { IQuestionStorage } from "../../util/IQuestionStorage.interfaces";

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
    _: APIChatInputApplicationCommandInteraction, // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<APIInteractionResponse> {
    const modal = new ModalBuilder()
      .setCustomId(this.name)
      .setTitle("Add New Question");

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
    const components = interaction.data.components;

    // Extract values using the componentIds map
    const bankName = getComponentValue(
      components,
      AddQuestionToBankCommand.componentIds.bankName,
    );

    if (!bankName) {
      return createEphemeralResponse("Invalid bank name");
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
    const answersText = AddQuestionToBankCommand.componentIds.answers.map(
      (answerId) => getComponentValue(components, answerId) as string,
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
      correctAnswerIndex >= answersText.length
    ) {
      return createEphemeralResponse(
        `Invalid correct answer index. Please enter a number between 0 and ${answersText.length - 1}`,
      );
    }

    try {
      await this.questionStorage.generateAndAddQuestion(
        bankName,
        questionText,
        answersText,
        correctAnswerIndex,
        questionShowTimeMs,
        imageUrl,
        explanation,
        explanationImageUrl,
      );

      return createEphemeralResponse(`Added question to bank ${bankName}.`);
    } catch (error) {
      if (error instanceof Error) {
        return createEphemeralResponse(
          `Failed to add question to bank ${bankName}: ${error.message}`,
        );
      } else {
        return createEphemeralResponse(
          `Failed to add question to bank ${bankName}: An unknown error occurred.`,
        );
      }
    }
  }
}
