/**
 * A message displayed between quiz questions (e.g. trivia facts, sponsor messages).
 */
export interface InterQuestionMessage {
  /** Unique identifier for this inter-question message. */
  messageId: string;
  /** The text content of the message. */
  content: string;
  /** Optional URL to an image displayed alongside the message. */
  imageUrl?: string | undefined;
}

/**
 * Allowed values for how quiz questions advance to the next question.
 * - `"auto"` -- questions advance automatically after a timer expires.
 * - `"manual"` -- a host must manually trigger advancement.
 */
export const QuizAdvanceMode = {
  Auto: "auto",
  Manual: "manual",
} as const;

/** Union type of allowed quiz advance mode values. */
export type QuizAdvanceMode =
  (typeof QuizAdvanceMode)[keyof typeof QuizAdvanceMode];

/**
 * Per-guild (and optionally per-question-bank) quiz configuration.
 *
 * All optional fields fall back to the defaults defined in {@link defaultQuizConfig}
 * when not explicitly set.
 */
export interface GuildQuizConfig {
  /** The Discord guild (server) ID this config belongs to. */
  guildId: string;
  /** The configuration scope -- either `"guild"` for guild-wide defaults or a question bank name. */
  scope: string;
  /** How long each question is displayed before auto-advancing, in milliseconds. */
  defaultQuestionShowTimeMs?: number | undefined;
  /** Controls whether questions advance automatically or require manual advancement. */
  advanceMode?: QuizAdvanceMode | undefined;
  /** Messages displayed between questions. */
  interQuestionMessages?: InterQuestionMessage[] | undefined;
  /** Milliseconds to display the answer summary before advancing. */
  summaryDurationMs?: number | undefined;
}

/**
 * Fully resolved quiz configuration with no optional fields.
 * Produced by merging a {@link GuildQuizConfig} with {@link defaultQuizConfig}.
 */
export interface ResolvedQuizConfig {
  /** How long each question is displayed before auto-advancing, in milliseconds. */
  defaultQuestionShowTimeMs: number;
  /** Controls whether questions advance automatically or require manual advancement. */
  advanceMode: QuizAdvanceMode;
  /** Messages displayed between questions. */
  interQuestionMessages: InterQuestionMessage[];
  /** Milliseconds to display the answer summary before advancing. */
  summaryDurationMs: number;
}

/**
 * Default quiz configuration values used when no guild or bank-level
 * overrides are specified.
 */
export const defaultQuizConfig: ResolvedQuizConfig = {
  defaultQuestionShowTimeMs: 20000,
  advanceMode: QuizAdvanceMode.Auto,
  interQuestionMessages: [],
  summaryDurationMs: 5000,
};
