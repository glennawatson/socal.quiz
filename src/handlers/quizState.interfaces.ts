import type { Question } from "../question.interfaces.js";
import type {
  InterQuestionMessage,
  QuizAdvanceMode,
} from "../quizConfig.interfaces.js";

/**
 * Represents the runtime state of an active quiz session within a guild channel.
 */
export interface QuizState {
  /** The full list of questions in this quiz session. */
  questionBank: Question[];
  /** Map of user ID to their cumulative score for this quiz session. */
  activeUsers: Map<string, number>;
  /** Set of user IDs who answered the current question correctly. */
  correctUsersForQuestion: Set<string>;
  /** Set of user IDs who have submitted any answer for the current question. */
  answeredUsersForQuestion: Set<string>;
  /** The Discord channel ID where the quiz is running. */
  channelId: string;
  /** The Discord guild (server) ID where the quiz is running. */
  guildId: string;
  /** The ID of the question currently being displayed, or `null`/`undefined` if the quiz has not started or has ended. */
  currentQuestionId: string | undefined | null;
  /** Controls whether questions advance automatically on a timer or require manual advancement. */
  advanceMode: QuizAdvanceMode;
  /** Milliseconds to display the answer summary before advancing to the next question. */
  summaryDurationMs: number;
  /** Messages displayed between questions (e.g. trivia facts, advertisements). */
  interQuestionMessages: InterQuestionMessage[];
}
