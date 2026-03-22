import { describe, it, expect, vi, beforeEach } from "vitest";
import type { QuizState } from "../../src/handlers/quizState.interfaces.js";
import type { Question } from "../../src/question.interfaces.js";
import { QuizAdvanceMode } from "../../src/quizConfig.interfaces.js";

// Mock durable-functions
vi.mock("durable-functions", () => ({
  default: {
    app: {
      orchestration: vi.fn(),
      activity: vi.fn(),
    },
    getClient: vi.fn(),
  },
  app: {
    orchestration: vi.fn(),
    activity: vi.fn(),
  },
  getClient: vi.fn(),
}));

// Mock quizStateManager
vi.mock("../../src/handlers/quizStateManager.js", () => ({
  postQuestion: vi.fn(),
  sendQuestionSummary: vi.fn(),
  showScores: vi.fn(),
  postInterQuestionMessage: vi.fn(),
}));

// Mock config
vi.mock("../../src/util/config.js", () => ({
  Config: {
    initialize: vi.fn(),
    rest: {},
    imageStorage: {},
    soundboardManager: {
      isConnected: vi.fn(),
      playSound: vi.fn(),
    },
  },
}));

import {
  QuizOrchestrator,
  PostQuestion,
  SendQuestionSummary,
  PostInterQuestionMessage,
  ShowScores,
  PlaySound,
} from "../../src/functions/QuizOrchestrator.js";

import {
  postQuestion,
  sendQuestionSummary,
  showScores,
  postInterQuestionMessage,
} from "../../src/handlers/quizStateManager.js";

import { Config } from "../../src/util/config.js";
import * as df from "durable-functions";

function createQuestion(id: string, timeMs = 10000): Question {
  return {
    questionId: id,
    question: `Question ${id}?`,
    answers: [
      { answerId: "a1", answer: "Answer 1" },
      { answerId: "a2", answer: "Answer 2" },
    ],
    correctAnswerId: "a1",
    questionShowTimeMs: timeMs,
  };
}

function createQuizState(overrides: Partial<QuizState> = {}): QuizState {
  return {
    questionBank: [createQuestion("q1")],
    activeUsers: new Map(),
    correctUsersForQuestion: new Set(),
    answeredUsersForQuestion: new Set(),
    channelId: "channel1",
    guildId: "guild1",
    currentQuestionId: undefined,
    advanceMode: QuizAdvanceMode.Auto,
    summaryDurationMs: 5000,
    interQuestionMessages: [],
    soundboardEnabled: false,
    soundboardSoundIds: [],
    soundboardVoiceChannelId: "",
    ...overrides,
  };
}

// Helper to create a mock orchestration context
function createMockContext(quiz: QuizState) {
  const timerObj = { _type: "timer" };
  const skipObj = { _type: "skipQuestion" };
  const cancelObj = { _type: "cancelQuiz" };
  const answerObj = { _type: "answerQuestion", result: undefined as unknown };
  const advanceObj = { _type: "advanceQuestion" };
  const cancelDuringWaitObj = { _type: "cancelDuringWait" };
  const summaryTimerObj = { _type: "summaryTimer" };
  const summaryEventObj = { _type: "summaryEvent" };

  const context = {
    df: {
      getInput: () => quiz,
      callActivity: vi.fn((name: string, input: unknown) => ({
        _type: "activity",
        name,
        input,
      })),
      currentUtcDateTime: new Date("2024-01-01T00:00:00Z"),
      createTimer: vi.fn(() => timerObj),
      waitForExternalEvent: vi.fn((eventName: string) => {
        if (eventName === "skipQuestion") return skipObj;
        if (eventName === "cancelQuiz") {
          // Return different objects for different cancel waits
          return { _type: "cancelQuiz" };
        }
        if (eventName === "answerQuestion") return answerObj;
        if (eventName === "advanceQuestion") return advanceObj;
        return { _type: eventName };
      }),
      Task: {
        any: vi.fn((tasks: unknown[]) => tasks),
      },
    },
  };

  return {
    context,
    timerObj,
    skipObj,
    cancelObj,
    answerObj,
    advanceObj,
  };
}

describe("QuizOrchestrator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("orchestrator generator", () => {
    it("should run through a single question in auto mode and show scores", () => {
      const quiz = createQuizState();
      const { context, timerObj } = createMockContext(quiz);

      const gen = QuizOrchestrator(context as any);

      // 1. callActivity("PostQuestion", quiz)
      let result = gen.next();
      expect(result.value).toEqual(
        expect.objectContaining({ _type: "activity", name: "PostQuestion" }),
      );

      // 2. Task.any([timer, skipQuestion, cancelQuiz, answerQuestion])
      // We need to yield the tasks array; the generator expects to get back the "winner"
      result = gen.next(); // yields context.df.Task.any(...)
      // Return the timer as the winner
      result = gen.next(timerObj);

      // 3. After timer, callActivity("SendQuestionSummary", ...)
      expect(result.value).toEqual(
        expect.objectContaining({ _type: "activity", name: "SendQuestionSummary" }),
      );

      // 4. Resume from SendQuestionSummary - no inter-question messages, no soundboard
      // In auto mode, waits for summary timer or cancel
      result = gen.next();

      // 5. Task.any for summary wait
      // Return summary timer as the winner (not cancel)
      const summaryTimer = context.df.createTimer.mock.results.at(-1)?.value;
      result = gen.next(summaryTimer);

      // 6. After the loop, callActivity("ShowScores", quiz)
      expect(result.value).toEqual(
        expect.objectContaining({ _type: "activity", name: "ShowScores" }),
      );

      // 7. Done
      result = gen.next();
      expect(result.done).toBe(true);
    });

    it("should handle cancel during question wait", () => {
      const quiz = createQuizState();
      const { context } = createMockContext(quiz);

      const gen = QuizOrchestrator(context as any);

      // PostQuestion
      gen.next();
      // Task.any
      gen.next();

      // Return cancelEvent as winner
      const cancelEvent = context.df.waitForExternalEvent.mock.results.find(
        (r: any) => r.value._type === "cancelQuiz",
      )!.value;
      const result = gen.next(cancelEvent);
      expect(result.done).toBe(true);
      expect(result.value).toBeUndefined();
    });

    it("should handle skip question", () => {
      const quiz = createQuizState({
        questionBank: [createQuestion("q1"), createQuestion("q2")],
      });
      const { context, skipObj, timerObj } = createMockContext(quiz);

      const gen = QuizOrchestrator(context as any);

      // Q1: PostQuestion
      gen.next();
      // Q1: Task.any
      gen.next();
      // Return skipQuestion as winner - should skip to next question
      let result = gen.next(skipObj);

      // SendQuestionSummary for Q1
      expect(result.value).toEqual(
        expect.objectContaining({ _type: "activity", name: "SendQuestionSummary" }),
      );

      // Resume - skip bypasses inter-question messages and summary wait
      result = gen.next();

      // Q2: PostQuestion
      expect(result.value).toEqual(
        expect.objectContaining({ _type: "activity", name: "PostQuestion" }),
      );
    });

    it("should handle answer events", () => {
      const quiz = createQuizState();
      const { context, timerObj } = createMockContext(quiz);

      const gen = QuizOrchestrator(context as any);

      // PostQuestion
      gen.next();
      // Task.any
      gen.next();

      // Simulate answer event: set the result on the answer object
      const answerEvent =
        context.df.waitForExternalEvent.mock.results.find(
          (r: any) => r.value._type === "answerQuestion",
        )!.value;
      answerEvent.result = { userId: "user1", selectedAnswerId: "a1" };

      // Return answer event as winner
      let result = gen.next(answerEvent);

      // The generator loops back to Task.any, so result.value is the next Task.any call
      // Now return the timer to end the question
      result = gen.next(timerObj);

      // Should have recorded the answer
      expect(quiz.answeredUsersForQuestion.has("user1")).toBe(true);
      expect(quiz.correctUsersForQuestion.has("user1")).toBe(true);
      expect(quiz.activeUsers.get("user1")).toBe(1);
    });

    it("should handle incorrect answer events", () => {
      const quiz = createQuizState();
      const { context, timerObj } = createMockContext(quiz);

      const gen = QuizOrchestrator(context as any);

      gen.next(); // PostQuestion
      gen.next(); // Task.any

      const answerEvent =
        context.df.waitForExternalEvent.mock.results.find(
          (r: any) => r.value._type === "answerQuestion",
        )!.value;
      answerEvent.result = { userId: "user1", selectedAnswerId: "a2" }; // wrong answer

      gen.next(answerEvent);
      gen.next(timerObj);

      expect(quiz.answeredUsersForQuestion.has("user1")).toBe(true);
      expect(quiz.correctUsersForQuestion.has("user1")).toBe(false);
      expect(quiz.activeUsers.get("user1")).toBe(0);
    });

    it("should skip duplicate answers from the same user", () => {
      const quiz = createQuizState();
      const { context, timerObj } = createMockContext(quiz);

      const gen = QuizOrchestrator(context as any);

      gen.next(); // PostQuestion
      gen.next(); // Task.any

      const answerEvent =
        context.df.waitForExternalEvent.mock.results.find(
          (r: any) => r.value._type === "answerQuestion",
        )!.value;
      answerEvent.result = { userId: "user1", selectedAnswerId: "a1" };

      // First answer
      gen.next(answerEvent);

      // Second answer from same user - create new answer event object
      const answerEvent2 = { _type: "answerQuestion", result: { userId: "user1", selectedAnswerId: "a2" } };
      gen.next(answerEvent2);

      // End question
      gen.next(timerObj);

      // Score should be 1, not changed by duplicate
      expect(quiz.activeUsers.get("user1")).toBe(1);
    });

    it("should skip invalid answer events", () => {
      const quiz = createQuizState();
      const { context, timerObj } = createMockContext(quiz);

      const gen = QuizOrchestrator(context as any);

      gen.next(); // PostQuestion
      gen.next(); // Task.any

      const answerEvent =
        context.df.waitForExternalEvent.mock.results.find(
          (r: any) => r.value._type === "answerQuestion",
        )!.value;
      answerEvent.result = "not-valid"; // invalid answer event

      gen.next(answerEvent);
      gen.next(timerObj);

      expect(quiz.answeredUsersForQuestion.size).toBe(0);
    });

    it("should skip questions with empty question text", () => {
      const emptyQuestion: Question = {
        questionId: "q0",
        question: "",
        answers: [],
        correctAnswerId: "",
        questionShowTimeMs: 10000,
      };
      const quiz = createQuizState({
        questionBank: [emptyQuestion, createQuestion("q1")],
      });
      const { context, timerObj } = createMockContext(quiz);

      const gen = QuizOrchestrator(context as any);

      // Should skip the first empty question and go to q1
      const result = gen.next();
      expect(result.value).toEqual(
        expect.objectContaining({ _type: "activity", name: "PostQuestion" }),
      );
      expect(quiz.currentQuestionId).toBe("q1");
    });

    it("should post inter-question messages when configured", () => {
      const quiz = createQuizState({
        interQuestionMessages: [
          { messageId: "m1", content: "Did you know?", imageUrl: "http://img.png" },
        ],
        questionBank: [createQuestion("q1"), createQuestion("q2")],
      });
      const { context, timerObj } = createMockContext(quiz);

      const gen = QuizOrchestrator(context as any);

      // Q1: PostQuestion
      gen.next();
      // Task.any
      gen.next();
      // Timer expires
      let result = gen.next(timerObj);

      // SendQuestionSummary
      expect(result.value).toEqual(
        expect.objectContaining({ name: "SendQuestionSummary" }),
      );

      result = gen.next();

      // PostInterQuestionMessage
      expect(result.value).toEqual(
        expect.objectContaining({ name: "PostInterQuestionMessage" }),
      );
    });

    it("should play soundboard sounds when enabled", () => {
      const quiz = createQuizState({
        soundboardEnabled: true,
        soundboardSoundIds: ["sound1.mp3"],
        questionBank: [createQuestion("q1"), createQuestion("q2")],
      });
      const { context, timerObj } = createMockContext(quiz);

      const gen = QuizOrchestrator(context as any);

      // Q1: PostQuestion
      gen.next();
      // Task.any
      gen.next();
      // Timer expires
      gen.next(timerObj);

      // SendQuestionSummary
      let result = gen.next();

      // PlaySound
      expect(result.value).toEqual(
        expect.objectContaining({ name: "PlaySound" }),
      );
    });

    it("should handle manual advance mode", () => {
      const quiz = createQuizState({
        advanceMode: QuizAdvanceMode.Manual,
        questionBank: [createQuestion("q1"), createQuestion("q2")],
      });
      const { context, timerObj, advanceObj } = createMockContext(quiz);

      const gen = QuizOrchestrator(context as any);

      // Q1: PostQuestion
      gen.next();
      // Task.any
      gen.next();
      // Timer expires
      gen.next(timerObj);
      // SendQuestionSummary
      let result = gen.next();

      // In manual mode, waits for advanceQuestion or cancelQuiz
      // Task.any([advanceEvent, cancelDuringWait])
      // Return advanceEvent as winner
      result = gen.next(advanceObj);

      // Q2: PostQuestion
      expect(result.value).toEqual(
        expect.objectContaining({ name: "PostQuestion" }),
      );
    });

    it("should handle cancel during manual advance wait", () => {
      const quiz = createQuizState({
        advanceMode: QuizAdvanceMode.Manual,
      });
      const { context, timerObj } = createMockContext(quiz);

      const gen = QuizOrchestrator(context as any);

      // Q1: PostQuestion
      gen.next();
      // Task.any
      gen.next();
      // Timer expires
      gen.next(timerObj);
      // SendQuestionSummary
      gen.next();

      // Return cancel as winner during manual advance wait
      const cancelDuringWait = context.df.waitForExternalEvent.mock.results.filter(
        (r: any) => r.value._type === "cancelQuiz",
      ).at(-1)!.value;
      const result = gen.next(cancelDuringWait);

      expect(result.done).toBe(true);
    });

    it("should handle cancel during auto summary wait", () => {
      const quiz = createQuizState({
        advanceMode: QuizAdvanceMode.Auto,
        questionBank: [createQuestion("q1"), createQuestion("q2")],
      });
      const { context, timerObj } = createMockContext(quiz);

      const gen = QuizOrchestrator(context as any);

      // Q1: PostQuestion
      gen.next();
      // Task.any
      gen.next();
      // Timer expires
      gen.next(timerObj);
      // SendQuestionSummary
      gen.next();

      // Task.any([summaryTimer, summaryEvent])
      // Return summary cancel event as winner
      const summaryEvent = context.df.waitForExternalEvent.mock.results.filter(
        (r: any) => r.value._type === "cancelQuiz",
      ).at(-1)!.value;
      const result = gen.next(summaryEvent);

      expect(result.done).toBe(true);
    });

    it("should handle empty question bank", () => {
      const quiz = createQuizState({ questionBank: [] });
      const { context } = createMockContext(quiz);

      const gen = QuizOrchestrator(context as any);

      // Should immediately call ShowScores
      const result = gen.next();
      expect(result.value).toEqual(
        expect.objectContaining({ name: "ShowScores" }),
      );
    });

    it("should clear answered/correct sets between questions", () => {
      const quiz = createQuizState({
        questionBank: [createQuestion("q1"), createQuestion("q2")],
      });
      const { context, timerObj } = createMockContext(quiz);

      const gen = QuizOrchestrator(context as any);

      // Q1: PostQuestion
      gen.next();
      // Task.any
      gen.next();

      // Answer q1
      const answerEvent =
        context.df.waitForExternalEvent.mock.results.find(
          (r: any) => r.value._type === "answerQuestion",
        )!.value;
      answerEvent.result = { userId: "user1", selectedAnswerId: "a1" };
      gen.next(answerEvent);

      // Timer
      gen.next(timerObj);

      // After SendQuestionSummary, sets should be cleared
      gen.next();

      expect(quiz.correctUsersForQuestion.size).toBe(0);
      expect(quiz.answeredUsersForQuestion.size).toBe(0);
    });
  });

  describe("Activity handlers", () => {
    let mockInvocationContext: any;

    beforeEach(() => {
      vi.clearAllMocks();
      mockInvocationContext = {
        invocationId: "test-invocation-id",
      };
      vi.mocked(df.getClient).mockReturnValue({} as any);
      vi.mocked(Config.initialize).mockResolvedValue({} as any);
    });

    describe("PostQuestion", () => {
      it("should post a question successfully", async () => {
        const question = createQuestion("q1");
        const quiz = createQuizState({
          questionBank: [question],
          currentQuestionId: "q1",
        });

        await PostQuestion(quiz, mockInvocationContext);

        expect(df.getClient).toHaveBeenCalledWith(mockInvocationContext);
        expect(Config.initialize).toHaveBeenCalled();
        expect(postQuestion).toHaveBeenCalledWith(
          Config.rest,
          Config.imageStorage,
          "channel1",
          "test-invocation-id",
          question,
        );
      });

      it("should log error when question not found", async () => {
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        const quiz = createQuizState({
          questionBank: [createQuestion("q1")],
          currentQuestionId: "nonexistent",
        });

        await PostQuestion(quiz, mockInvocationContext);

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining("Question not found"),
        );
        expect(postQuestion).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
      });
    });

    describe("SendQuestionSummary", () => {
      it("should send question summary successfully", async () => {
        const question = createQuestion("q1");
        const quiz = createQuizState({
          questionBank: [question],
          currentQuestionId: "q1",
        });

        // The activity handler types input as QuizState
        await SendQuestionSummary(quiz, mockInvocationContext);

        expect(sendQuestionSummary).toHaveBeenCalled();
      });

      it("should log error when question not found", async () => {
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        const quiz = createQuizState({
          questionBank: [createQuestion("q1")],
          currentQuestionId: "nonexistent",
        });

        await SendQuestionSummary(quiz, mockInvocationContext);

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining("Question not found"),
        );
        expect(sendQuestionSummary).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
      });
    });

    describe("PostInterQuestionMessage", () => {
      it("should post inter-question message", async () => {
        const input = {
          channelId: "channel1",
          message: { messageId: "m1", content: "Test message" },
        };

        await PostInterQuestionMessage(input as any, mockInvocationContext);

        expect(postInterQuestionMessage).toHaveBeenCalledWith(
          Config.rest,
          "channel1",
          input.message,
        );
      });
    });

    describe("ShowScores", () => {
      it("should show scores", async () => {
        const quiz = createQuizState();

        await ShowScores(quiz, mockInvocationContext);

        expect(showScores).toHaveBeenCalledWith(Config.rest, quiz);
      });
    });

    describe("PlaySound", () => {
      it("should play sound when connected", async () => {
        vi.mocked(Config.soundboardManager.isConnected).mockReturnValue(true);
        vi.mocked(Config.soundboardManager.playSound).mockResolvedValue(undefined);

        const input = { guildId: "guild1", soundBlobName: "sound.mp3" };

        await PlaySound(input as any, mockInvocationContext);

        expect(Config.soundboardManager.isConnected).toHaveBeenCalledWith("guild1");
        expect(Config.soundboardManager.playSound).toHaveBeenCalledWith(
          "guild1",
          "sound.mp3",
        );
      });

      it("should skip when not connected", async () => {
        vi.mocked(Config.soundboardManager.isConnected).mockReturnValue(false);
        const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

        const input = { guildId: "guild1", soundBlobName: "sound.mp3" };

        await PlaySound(input as any, mockInvocationContext);

        expect(Config.soundboardManager.playSound).not.toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining("Soundboard not connected"),
        );
        consoleSpy.mockRestore();
      });
    });
  });
});
