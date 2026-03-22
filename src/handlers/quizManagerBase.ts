import { REST } from "@discordjs/rest";
import type { IQuestionStorage } from "../util/IQuestionStorage.interfaces.js";
import type { QuizState } from "./quizState.interfaces.js";
import {
  type APIInteraction,
  type APIInteractionResponse,
  InteractionType,
} from "discord-api-types/v10";
import {
  createEphemeralResponse,
  isNullOrWhitespace,
} from "../util/interactionHelpers.js";
import type { Question } from "../question.interfaces.js";
import type { GuildQuizConfigStorage } from "../util/guildQuizConfigStorage.js";
import type {
  InterQuestionMessage,
  QuizAdvanceMode,
} from "../quizConfig.interfaces.js";

/**
 * Abstract base class for managing quiz functionalities.
 *
 * Provides shared logic for starting, stopping, and advancing quizzes,
 * as well as handling answer interactions from Discord users. Concrete
 * subclasses (e.g. {@link DurableQuizManager}) implement the orchestration
 * mechanism.
 */
export abstract class QuizManagerBase {
  /** The Discord REST client used to call the Discord API. */
  protected readonly rest: REST;
  /** Storage interface for retrieving question banks and questions. */
  protected readonly quizStateStorage: IQuestionStorage;
  /** Storage interface for retrieving guild-scoped quiz configuration. */
  protected readonly configStorage: GuildQuizConfigStorage;

  /**
   * Constructs a QuizManagerBase instance.
   *
   * @param rest - The REST client for Discord API.
   * @param quizStateStorage - Storage interface for quiz questions.
   * @param configStorage - Storage interface for guild quiz configuration.
   */
  protected constructor(
    rest: REST,
    quizStateStorage: IQuestionStorage,
    configStorage: GuildQuizConfigStorage,
  ) {
    this.rest = rest;
    this.quizStateStorage = quizStateStorage;
    this.configStorage = configStorage;
  }

  /**
   * Runs the quiz.
   *
   * @param {QuizState} quiz - The state of the quiz to run.
   * @returns {Promise<void>} - A promise for the quiz to run.
   */
  public abstract runQuiz(quiz: QuizState): Promise<void>;

  /**
   * Stops the quiz in the specified guild and channel.
   *
   * @param {string} guildId - The ID of the guild.
   * @param {string} channelId - The ID of the channel.
   * @returns {Promise<void>} - A promise that resolves when the quiz is stopped.
   */
  public abstract stopQuiz(guildId: string, channelId: string): Promise<void>;

  /**
   * Moves to the next quiz question in the specified guild and channel.
   *
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
   *
   * Loads the question bank from storage, resolves the effective quiz configuration,
   * and delegates to {@link startQuizInternal}.
   *
   * @param guildId - The ID of the guild.
   * @param channelId - The ID of the channel.
   * @param questionBankName - The name of the question bank to use.
   * @param advanceModeOverride - Optional override for the quiz advance mode
   *   (e.g. "auto" or "manual"). When provided, takes precedence over the
   *   guild/bank configuration value.
   * @returns A promise that resolves to an interaction response.
   */
  public async startQuiz(
    guildId: string,
    channelId: string,
    questionBankName: string,
    advanceModeOverride?: QuizAdvanceMode  ,
  ): Promise<APIInteractionResponse> {
    if (isNullOrWhitespace(questionBankName)) {
      return createEphemeralResponse(`There is no valid question bank name`);
    }

    const questionBank = await this.quizStateStorage.getQuestionBank(guildId, questionBankName);
    const questions = questionBank.questions;

    if (questions.length === 0) {
      return createEphemeralResponse(
        `There are no valid questions in the question bank ${questionBankName}`,
      );
    }

    const config = await this.configStorage.getEffectiveConfig(
      guildId,
      questionBankName,
    );

    return await this.startQuizInternal(
      questions,
      guildId,
      channelId,
      advanceModeOverride ?? config.advanceMode,
      config.summaryDurationMs,
      config.interQuestionMessages,
    );
  }

  /**
   * Internal method to start a quiz with the given questions.
   *
   * Validates the question list, builds a {@link QuizState}, stops any
   * previously running quiz in the same channel, and starts the new quiz.
   *
   * @param questions - The list of questions for the quiz.
   * @param guildId - The ID of the guild.
   * @param channelId - The ID of the channel.
   * @param advanceMode - How questions advance: "auto" (timer) or "manual" (host triggers). Defaults to "auto".
   * @param summaryDurationMs - Milliseconds to display the answer summary before advancing. Defaults to 5000.
   * @param interQuestionMessages - Optional messages displayed between questions.
   * @returns A promise that resolves to an interaction response.
   */
  public async startQuizInternal(
    questions: Question[],
    guildId: string,
    channelId: string,
    advanceMode: QuizAdvanceMode = "auto",
    summaryDurationMs = 5000,
    interQuestionMessages: InterQuestionMessage[] = [],
  ): Promise<APIInteractionResponse> {
    if (questions.length === 0) {
      return createEphemeralResponse("There are no valid questions");
    }

    const invalidQuestions = questions.filter(
      (q) => q.question.trim() === "",
    );

    if (invalidQuestions.length > 0) {
      const invalidQuestionIds = invalidQuestions
        .map((q) => q.questionId)
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
      advanceMode,
      summaryDurationMs,
      interQuestionMessages,
    };

    await this.stopQuiz(quiz.guildId, channelId); // Stop any existing quiz before starting a new one

    await this.runQuiz(quiz);

    return createEphemeralResponse(
      `Quiz for channel ${quiz.channelId} started successfully.`,
    );
  }

  /**
   * Handles an interaction for answering a quiz question.
   *
   * @param interaction - The interaction to handle.
   * @returns - A promise that resolves to an interaction response.
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

    const userId = interaction.member?.user?.id;
    if (!userId) {
      return createEphemeralResponse("Could not find a valid user id");
    }

    return await this.answerInteraction(
      interaction.guild_id,
      interaction.channel.id,
      userId,
      selectedAnswerId,
    );
  }

  /**
   * Abstract method to handle an interaction answer.
   *
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
