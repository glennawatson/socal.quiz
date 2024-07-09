import { REST } from "@discordjs/rest";
import { IQuestionStorage } from "../util/IQuestionStorage.interfaces.js";
import { QuizState } from "./quizState.interfaces.js";
import {
  APIInteraction,
  APIInteractionResponse,
  InteractionType,
} from "discord-api-types/v10";
import {
  createEphemeralResponse,
  isNullOrWhitespace,
} from "../util/interactionHelpers.js";
import { Question } from "../question.interfaces.js";

/**
 * Abstract base class for managing quiz functionalities.
 */
export abstract class QuizManagerBase {
  /**
   * Constructs a QuizManagerBase instance.
   * @param {REST} rest - The REST client for Discord API.
   * @param {IQuestionStorage} quizStateStorage - Storage interface for quiz questions.
   */
  protected constructor(
    protected readonly rest: REST,
    protected readonly quizStateStorage: IQuestionStorage,
  ) {}

  /**
   * Runs the quiz.
   * @param {QuizState} quiz - The state of the quiz to run.
   * @returns {Promise<void>} - A promise for the quiz to run.
   */
  public abstract runQuiz(quiz: QuizState): Promise<void>;

  /**
   * Stops the quiz in the specified guild and channel.
   * @param {string} guildId - The ID of the guild.
   * @param {string} channelId - The ID of the channel.
   * @returns {Promise<void>} - A promise that resolves when the quiz is stopped.
   */
  public abstract stopQuiz(guildId: string, channelId: string): Promise<void>;

  /**
   * Moves to the next quiz question in the specified guild and channel.
   * @param {string} guildId - The ID of the guild.
   * @param {string} channelId - The ID of the channel.
   * @returns {Promise<void>} - A promise that resolves when the quiz is skipped a question.
   */
  public abstract nextQuizQuestion(
    guildId: string,
    channelId: string,
  ): Promise<void>;

  /**
   * Starts a quiz in the specified guild and channel with the provided question bank.
   * @param {string} guildId - The ID of the guild.
   * @param {string} channelId - The ID of the channel.
   * @param {string} questionBankName - The name of the question bank to use.
   * @returns {Promise<APIInteractionResponse>} - A promise that resolves to an interaction response.
   */
  public async startQuiz(
    guildId: string,
    channelId: string,
    questionBankName: string,
  ): Promise<APIInteractionResponse> {
    if (isNullOrWhitespace(questionBankName)) {
      return createEphemeralResponse(`There is no valid question bank name`);
    }

    const questionBank = await this.quizStateStorage.getQuestionBank(guildId, questionBankName);
    const questions = questionBank.questions;

    if (!questions || questions.length === 0) {
      return createEphemeralResponse(
        `There are no valid questions in the question bank ${questionBankName}`,
      );
    }

    return await this.startQuizInternal(questions, guildId, channelId);
  }

  /**
   * Internal method to start a quiz with the given questions.
   * @param {Question[]} questions - The list of questions for the quiz.
   * @param {string} guildId - The ID of the guild.
   * @param {string} channelId - The ID of the channel.
   * @returns {Promise<APIInteractionResponse>} - A promise that resolves to an interaction response.
   */
  public async startQuizInternal(
    questions: Question[],
    guildId: string,
    channelId: string,
  ): Promise<APIInteractionResponse> {
    if (questions.length === 0) {
      return createEphemeralResponse("There are no valid questions");
    }

    const invalidQuestions = questions.filter(
      (q) => !q || q.question.trim() === "",
    );

    if (invalidQuestions.length > 0) {
      const invalidQuestionIds = invalidQuestions
        .map((q) => q?.questionId ?? "unknown")
        .join(", ");
      return createEphemeralResponse(
        `There are invalid questions with IDs: ${invalidQuestionIds}`,
      );
    }

    const quiz: QuizState = {
      questionBank: questions,
      activeUsers: new Map(),
      correctUsersForQuestion: new Set<string>(),
      channelId: channelId,
      currentQuestionId: questions[0]?.questionId ?? null,
      answeredUsersForQuestion: new Set<string>(),
      guildId: guildId,
    };

    await this.stopQuiz(quiz.guildId, channelId); // Stop any existing quiz before starting a new one

    await this.runQuiz(quiz);

    return createEphemeralResponse(
      `Quiz for channel ${quiz.channelId} started successfully.`,
    );
  }

  /**
   * Handles an interaction for answering a quiz question.
   * @param {APIInteraction} interaction - The interaction to handle.
   * @returns {Promise<APIInteractionResponse>} - A promise that resolves to an interaction response.
   */
  public async handleAnswerInteraction(
    interaction: APIInteraction,
  ): Promise<APIInteractionResponse> {
    if (interaction.type !== InteractionType.MessageComponent) {
      return createEphemeralResponse("Invalid interaction type.");
    }

    if (!interaction.guild_id) {
      return createEphemeralResponse("Must have a valid guild id.");
    }

    if (!interaction.channel.id) {
      return createEphemeralResponse("Must have a valid channel");
    }

    const [_, interactionId, selectedAnswerId] =
      interaction.data.custom_id.split("_");

    if (!selectedAnswerId) {
      return createEphemeralResponse("Could not find a valid answer response");
    }

    if (!interactionId) {
      return createEphemeralResponse("Could not find a valid interaction id");
    }

    if (!interaction.user?.id) {
      return createEphemeralResponse("Could not find a valid user id");
    }

    return await this.answerInteraction(
      interaction.guild_id,
      interaction.channel.id,
      interaction.user.id,
      selectedAnswerId,
    );
  }

  /**
   * Abstract method to handle an interaction answer.
   * @param {string} guildId - The ID of the guild.
   * @param {string} channelId - The ID of the channel.
   * @param {string} userId - The ID of the user.
   * @param {string} selectedAnswerId - The ID of the selected answer.
   * @returns {Promise<APIInteractionResponse>} - A promise that resolves to an interaction response.
   */
  public abstract answerInteraction(
    guildId: string,
    channelId: string,
    userId: string,
    selectedAnswerId: string,
  ): Promise<APIInteractionResponse>;
}
