import type { Answer } from "./answer.interfaces.js";
import type { Question } from "./question.interfaces.js";
import type { QuestionBank } from "./questionBank.interfaces.js";

/**
 * Request body for creating or updating an answer via the API.
 * Extends {@link Answer} with an optional image URL for upload.
 */
export interface AnswerRequestBody extends Answer {
  /** Optional URL of an image to download and associate with this answer. */
  imageUrl?: string | undefined;
}

/**
 * Request body for creating or updating a question via the API.
 * Extends {@link Question} (excluding `answers`) with optional image URLs
 * and uses {@link AnswerRequestBody} for its answers.
 */
export interface QuestionRequestBody extends Omit<Question, "answers"> {
  /** Optional URL of an image to download and associate with this question. */
  imageUrl?: string;
  /** Optional URL of an explanation image to download and associate with this question. */
  explanationImageUrl?: string;
  /** The list of answers for this question, each potentially including an image URL. */
  answers: AnswerRequestBody[];
}

/**
 * Request body for creating or updating an entire question bank via the API.
 * Extends {@link QuestionBank} with {@link QuestionRequestBody} entries.
 */
export interface QuestionBankRequestBody extends QuestionBank {
  /** The list of questions in this bank, using the API request body format. */
  questions: QuestionRequestBody[];
}

/**
 * Result of upserting a single question, indicating success or failure.
 */
export interface UpsertResult {
  /** The ID of the question that was upserted. */
  questionId: string;
  /** Whether the upsert succeeded. */
  success: boolean;
  /** Error message if the upsert failed. */
  errorMessage?: string;
}
