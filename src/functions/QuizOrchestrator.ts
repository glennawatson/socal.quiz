import { type InvocationContext } from "@azure/functions";
import * as df from "durable-functions";
import type {
  ActivityHandler,
  OrchestrationContext,
  OrchestrationHandler,
} from "durable-functions";
import type { QuizState } from "../handlers/quizState.interfaces.js";
import { DateTime } from "luxon";
import { Config } from "../util/config.js";
import {
  postInterQuestionMessage,
  postQuestion,
  sendQuestionSummary,
  showScores,
} from "../handlers/quizStateManager.js";
import type { Question } from "../question.interfaces.js";
import { isAnswerEvent } from "../handlers/answerEvent.interfaces.js";
import { QuizAdvanceMode } from "../quizConfig.interfaces.js";
import type { InterQuestionMessage } from "../quizConfig.interfaces.js";

/**
 * Durable Functions orchestrator that drives a quiz session from start to finish.
 * Iterates through each question in the bank, waits for answers or timer expiry,
 * tracks scores, posts inter-question messages, and
 * finally displays the scoreboard.
 *
 * @param context - The durable orchestration context.
 * @yields {unknown} Control flow back to the durable framework between activity calls and external events.
 */
export const QuizOrchestrator: OrchestrationHandler = function* (
  context: OrchestrationContext,
) {
  const quiz: QuizState = context.df.getInput();

  for (let index = 0; index < quiz.questionBank.length; index++) {
    const question: Question | undefined = quiz.questionBank[index];
    if (!question?.question) {
      continue;
    }

    quiz.currentQuestionId = question.questionId;
    yield context.df.callActivity("PostQuestion", quiz);

    const questionTime: DateTime = DateTime.fromJSDate(context.df.currentUtcDateTime, {
      zone: "utc",
    }).plus({ milliseconds: question.questionShowTimeMs });

    // Wait for the timer, the skip signal, or the cancel signal
    const skipQuestionEvent = context.df.waitForExternalEvent("skipQuestion");
    const cancelEvent = context.df.waitForExternalEvent("cancelQuiz");

    let shouldSkip = false;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (true) {
      const timer = context.df.createTimer(questionTime.toJSDate());
      const answerEvent = context.df.waitForExternalEvent("answerQuestion");
      const winner: unknown = yield context.df.Task.any([
        timer,
        skipQuestionEvent,
        cancelEvent,
        answerEvent,
      ]);

      if (winner === timer) {
        break;
      }

      // If the cancelQuiz signal is received, terminate the orchestrator
      if (winner === cancelEvent) {
        return;
      }

      // If the skipQuestion signal is received, continue to the next question
      if (winner === skipQuestionEvent) {
        shouldSkip = true;
        break;
      }

      if (winner === answerEvent) {
        if (!isAnswerEvent(answerEvent.result)) {
          continue;
        }

        const answerEventData = answerEvent.result;

        // Skip if user already answered this question
        /* v8 ignore next -- generator yield/continue branch is exercised by "duplicate answer" test but v8 cannot track it */
        if (quiz.answeredUsersForQuestion.has(answerEventData.userId)) {
          continue;
        }

        // Track that this user has answered
        quiz.answeredUsersForQuestion.add(answerEventData.userId);

        const isCorrect: boolean =
          question.correctAnswerId === answerEventData.selectedAnswerId;

        if (isCorrect) {
          quiz.correctUsersForQuestion.add(answerEventData.userId);
          quiz.activeUsers.set(
            answerEventData.userId,
            (quiz.activeUsers.get(answerEventData.userId) ?? 0) + 1,
          );
        } else {
          quiz.activeUsers.set(
            answerEventData.userId,
            quiz.activeUsers.get(answerEventData.userId) ?? 0,
          );
        }
      }
    }

    // Send the question summary after the question period ends
    yield context.df.callActivity("SendQuestionSummary", {
      quiz,
      questionNumber: index + 1,
    });

    quiz.correctUsersForQuestion.clear();
    quiz.answeredUsersForQuestion.clear();

    if (shouldSkip) {
      continue;
    }

    // Post inter-question message if configured
    if (quiz.interQuestionMessages.length > 0) {
      const messageIndex: number = index % quiz.interQuestionMessages.length;
      const message: InterQuestionMessage | undefined = quiz.interQuestionMessages[messageIndex];
      /* v8 ignore next -- messageIndex is bounded by array length so message is always defined */
      if (message) {
        yield context.df.callActivity("PostInterQuestionMessage", {
          channelId: quiz.channelId,
          message,
        });
      }
    }

    // Wait between questions: manual mode waits for admin advance, auto mode uses timer
    if (quiz.advanceMode === QuizAdvanceMode.Manual) {
      const advanceEvent =
        context.df.waitForExternalEvent("advanceQuestion");
      const cancelDuringWait =
        context.df.waitForExternalEvent("cancelQuiz");

      const advanceWinner: unknown = yield context.df.Task.any([
        advanceEvent,
        cancelDuringWait,
      ]);

      if (advanceWinner === cancelDuringWait) {
        return;
      }
    } else {
      const summaryTime: DateTime = DateTime.fromJSDate(
        context.df.currentUtcDateTime,
        { zone: "utc" },
      ).plus({ milliseconds: quiz.summaryDurationMs });

      const summaryEvent = context.df.waitForExternalEvent("cancelQuiz");

      const summaryWinner: unknown = yield context.df.Task.any([
        context.df.createTimer(summaryTime.toJSDate()),
        summaryEvent,
      ]);

      if (summaryWinner === summaryEvent) {
        return;
      }
    }
  }

  yield context.df.callActivity("ShowScores", quiz);
};

df.app.orchestration("QuizOrchestrator", QuizOrchestrator);

/** Internal data structure mapping a question ID to its resolved Question object. */
interface QuestionServerData {
  currentQuestionId: number;
  currentQuestion: Question | undefined;
}

/**
 * Resolves the current question's details from the quiz state by looking up
 * the question by its ID in the question bank array. Initializes the Config
 * with the durable client for downstream use.
 *
 * @param input - The current quiz state containing the question bank and current question ID.
 * @param context - The Azure Functions invocation context.
 * @returns A promise that resolves to the question server data with the current question details.
 */
async function getQuestionServerDetails(
  input: QuizState,
  context: InvocationContext,
): Promise<QuestionServerData> {
  const durableClient = df.getClient(context);

  await Config.initialize(durableClient);

  const questionNumber: number =
    input.questionBank.findIndex(
      (q) => q.questionId === input.currentQuestionId,
    ) + 1;
  const currentQuestion: Question | undefined = input.questionBank[questionNumber - 1];

  return {
    currentQuestion: currentQuestion,
    currentQuestionId: questionNumber,
  };
}

/**
 * Durable Functions activity that posts the current quiz question to the Discord channel.
 * Looks up the question details and sends it with any associated images.
 *
 * @param input - The current quiz state.
 * @param context - The Azure Functions invocation context.
 * @returns A promise that resolves when the question has been posted.
 */
export const PostQuestion: ActivityHandler = async (
  input: QuizState,
  context: InvocationContext,
): Promise<void> => {
  const questionData: QuestionServerData = await getQuestionServerDetails(input, context);

  if (!questionData.currentQuestion) {
    console.error(
      `Question not found for question number ${input.currentQuestionId}`,
    );
    return;
  }

  await postQuestion(
    Config.rest,
    Config.imageStorage,
    input.channelId,
    context.invocationId,
    questionData.currentQuestion,
  );
};

/**
 * Durable Functions activity that posts the question summary (correct answer,
 * explanation, and who answered correctly) after the question timer expires.
 *
 * @param input - The current quiz state.
 * @param context - The Azure Functions invocation context.
 * @returns A promise that resolves when the summary has been sent.
 */
export const SendQuestionSummary: ActivityHandler = async (
  input: QuizState,
  context: InvocationContext,
): Promise<void> => {
  const questionData: QuestionServerData = await getQuestionServerDetails(input, context);

  if (!questionData.currentQuestion) {
    console.error(
      `Question not found for question number ${input.currentQuestionId}`,
    );
    return;
  }

  await sendQuestionSummary(
    Config.rest,
    Config.imageStorage,
    questionData.currentQuestion,
    input,
    questionData.currentQuestionId,
  );
};

/** Input shape for the PostInterQuestionMessage activity. */
interface InterQuestionMessageInput {
  channelId: string;
  message: InterQuestionMessage;
}

/**
 * Durable Functions activity that posts an inter-question message (e.g. trivia facts,
 * advertisements) to the quiz channel between questions.
 *
 * @param input - The channel ID and message content to post.
 * @param context - The Azure Functions invocation context.
 * @returns A promise that resolves when the message has been posted.
 */
export const PostInterQuestionMessage: ActivityHandler = async (
  input: InterQuestionMessageInput,
  context: InvocationContext,
): Promise<void> => {
  const durableClient = df.getClient(context);
  await Config.initialize(durableClient);

  await postInterQuestionMessage(Config.rest, input.channelId, input.message);
};

/**
 * Durable Functions activity that posts the final scoreboard to the quiz channel
 * after all questions have been answered.
 *
 * @param input - The current quiz state containing scores.
 * @param context - The Azure Functions invocation context.
 * @returns A promise that resolves when the scores have been displayed.
 */
export const ShowScores: ActivityHandler = async (
  input: QuizState,
  context: InvocationContext,
): Promise<void> => {
  const durableClient = df.getClient(context);

  await Config.initialize(durableClient);

  await showScores(Config.rest, input);
};

df.app.activity("PostQuestion", { handler: PostQuestion });
df.app.activity("SendQuestionSummary", { handler: SendQuestionSummary });
df.app.activity("PostInterQuestionMessage", {
  handler: PostInterQuestionMessage,
});
df.app.activity("ShowScores", { handler: ShowScores });
