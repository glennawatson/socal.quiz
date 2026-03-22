import type { Question } from "./question.interfaces.js";

/**
 * Represents a named collection of quiz questions belonging to a guild.
 */
export interface QuestionBank {
  /** The display name of the question bank. */
  name: string;
  /** The Discord guild (server) ID that owns this question bank. */
  guildId: string;
  /** The ordered list of questions in this bank. */
  questions: Question[];
}
