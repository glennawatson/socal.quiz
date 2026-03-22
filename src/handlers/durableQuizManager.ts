import { REST } from "@discordjs/rest";
import type { IQuestionStorage } from "../util/IQuestionStorage.interfaces.js";
import { DurableClient } from "durable-functions";
import type { QuizState } from "./quizState.interfaces.js";
import { QuizManagerBase } from "./quizManagerBase.js";
import {
  type APIInteractionResponse,
  InteractionResponseType,
} from "discord-api-types/v10";
import { createEphemeralResponse } from "../util/interactionHelpers.js";
import type { AnswerEvent } from "./answerEvent.interfaces.js";
import type { GuildQuizConfigStorage } from "../util/guildQuizConfigStorage.js";

/**
 * Generates an instance ID based on guild and channel IDs.
 *
 * @param guildId - The ID of the guild.
 * @param channelId - The ID of the channel.
 * @returns - The generated instance ID.
 */
function generateInstanceId(guildId: string, channelId: string): string | null {
  if (!channelId || !guildId) {
    return null;
  }
  return `${guildId}-${channelId}`;
}

/**
 * Manages quiz functionality using Azure Durable Functions.
 *
 * Each quiz session is represented as a durable orchestration instance keyed
 * by `{guildId}-{channelId}`. The orchestrator handles question timing,
 * answer collection via raised events, and lifecycle management.
 */
export class DurableQuizManager extends QuizManagerBase {
  /** The Azure Durable Functions client used to manage orchestration instances. */
  private readonly durableClient: DurableClient;

  /**
   * Constructs a DurableQuizManager instance.
   *
   * @param rest - The REST client for Discord API.
   * @param quizStateStorage - Storage interface for quiz questions.
   * @param durableClient - The Azure Durable Functions client for managing orchestration instances.
   * @param configStorage - Storage interface for guild quiz configuration.
   */
  public constructor(
    rest: REST,
    quizStateStorage: IQuestionStorage,
    durableClient: DurableClient,
    configStorage: GuildQuizConfigStorage,
  ) {
    super(rest, quizStateStorage, configStorage);
    this.durableClient = durableClient;
  }

  /**
   * Submits a user's answer to the running quiz orchestration by raising an "answerQuestion" event.
   *
   * @param guildId - The ID of the guild.
   * @param channelId - The ID of the channel.
   * @param userId - The ID of the user answering.
   * @param selectedAnswerId - The ID of the selected answer.
   * @returns A deferred channel message response, or an ephemeral error if no quiz is active.
   */
  public async answerInteraction(
    guildId: string,
    channelId: string,
    userId: string,
    selectedAnswerId: string,
  ): Promise<APIInteractionResponse> {
    const instanceId = generateInstanceId(guildId, channelId);
    if (!instanceId) {
      // Optionally log the issue, but return an empty response
      console.error("No active quiz found.");
      return createEphemeralResponse(`No active quiz could be found`);
    }

    try {
      const answerEventData: AnswerEvent = { userId, selectedAnswerId };
      await this.durableClient.raiseEvent(
        instanceId,
        "answerQuestion",
        answerEventData,
        {},
      );
    } catch (error) {
      // Optionally log the error, but return an empty response
      console.error(`Error submitting answer: ${String(error)}`);
      return createEphemeralResponse(
        `There was a error submitting your answer.`,
      );
    }

    return {
      type: InteractionResponseType.DeferredMessageUpdate,
    };
  }

  /**
   * Stops the quiz in the specified guild and channel by raising a "cancelQuiz" event
   * on the durable orchestration. Falls back to terminating the instance if the event fails.
   *
   * @param guildId - The ID of the guild.
   * @param channelId - The ID of the channel.
   * @returns A promise that resolves when the quiz is stopped.
   */
  public async stopQuiz(guildId: string, channelId: string): Promise<void> {
    const instanceId = generateInstanceId(guildId, channelId);

    if (!instanceId) {
      console.error("could not find a valid guild or channel id");
      return;
    }

    try {
      await this.durableClient.raiseEvent(instanceId, "cancelQuiz", {});
    } catch (error) {
      await this.durableClient.terminate(instanceId, "Quiz stopped");
      // Log the error or handle it as necessary
      console.error(
        `Failed to send cancelQuiz event to instance ${instanceId}: ${String(error)}`,
      );
    }
  }

  /**
   * Starts a new durable orchestration instance ("QuizOrchestrator") for the given quiz state.
   *
   * @param quiz - The initial quiz state including questions, guild/channel IDs, and configuration.
   * @returns A promise that resolves when the orchestration is started.
   */
  public async runQuiz(quiz: QuizState): Promise<void> {
    const instanceId = generateInstanceId(quiz.guildId, quiz.channelId);
    if (!instanceId) {
      console.error("could not find a valid guild or channel id");
      return;
    }

    await this.durableClient.startNew("QuizOrchestrator", {
      input: quiz,
      instanceId: instanceId,
    });
  }

  /**
   * Advances to the next question by raising both "skipQuestion" and "advanceQuestion" events.
   *
   * The orchestrator only listens for the relevant event at each phase
   * (skipQuestion during question display, advanceQuestion during summary wait).
   *
   * @param guildId - The ID of the guild.
   * @param channelId - The ID of the channel.
   * @returns A promise that resolves when the events are raised.
   */
  public async nextQuizQuestion(
    guildId: string,
    channelId: string,
  ): Promise<void> {
    const instanceId = generateInstanceId(guildId, channelId);
    if (!instanceId) {
      console.error("could not find a valid guild or channel id");
      return;
    }
    // Raise both events — the orchestrator only listens for the relevant one
    // at each phase (skipQuestion during question, advanceQuestion during summary wait)
    await this.durableClient.raiseEvent(instanceId, "skipQuestion", {}, {});
    await this.durableClient.raiseEvent(instanceId, "advanceQuestion", {}, {});
  }
}
