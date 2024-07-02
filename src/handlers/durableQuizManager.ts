import { REST } from "@discordjs/rest";
import { IQuestionStorage } from "../util/IQuestionStorage.interfaces.js";
import { DurableClient } from "durable-functions";
import { QuizState } from "./quizState.interfaces.js";
import { QuizManagerBase } from "./quizManagerBase.js";
import {
  APIInteractionResponse,
  InteractionResponseType,
} from "discord-api-types/v10";
import { createEphemeralResponse } from "../util/interactionHelpers.js";
import { AnswerEvent } from "./answerEvent.interfaces.js";

/**
 * Generates an instance ID based on guild and channel IDs.
 * @param {string} guildId - The ID of the guild.
 * @param {string} channelId - The ID of the channel.
 * @returns {string} - The generated instance ID.
 */
function generateInstanceId(guildId: string, channelId: string): string | null {
  if (!channelId || !guildId) {
    return null;
  }
  return `${guildId}-${channelId}`;
}

/**
 * Manages quiz functionality using Durable Functions.
 * @class
 * @extends QuizManagerBase
 */
export class DurableQuizManager extends QuizManagerBase {
  /**
   * Constructs a DurableQuizManager instance.
   * @param {REST} rest - The REST client for Discord API.
   * @param {IQuestionStorage} quizStateStorage - Storage interface for quiz questions.
   * @param {DurableClient} durableClient - The durable client for managing orchestration.
   */
  public constructor(
    rest: REST,
    quizStateStorage: IQuestionStorage,
    private readonly durableClient: DurableClient,
  ) {
    super(rest, quizStateStorage);
  }

  /**
   * @inheritdoc
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
      console.error(`Error submitting answer: ${error}`);
      return createEphemeralResponse(
        `There was a error submitting your answer.`,
      );
    }

    return {
      type: InteractionResponseType.DeferredChannelMessageWithSource,
    };
  }

  /**
   * @inheritdoc
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
        `Failed to send cancelQuiz event to instance ${instanceId}: ${error}`,
      );
    }
  }

  /**
   * @inheritdoc
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
   * @inheritdoc
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
    await this.durableClient.raiseEvent(instanceId, "answerQuestion", {}, {});
  }
}
