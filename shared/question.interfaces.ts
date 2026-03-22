import type { Answer } from "./answer.interfaces.js";

/**
 * Represents a single quiz question with its answers and display metadata.
 */
export interface Question {
  /** Unique identifier for this question. */
  questionId: string;
  /** The question text displayed to users. May contain Discord markdown. */
  question: string;
  /** The list of possible answers for this question. */
  answers: Answer[];
  /** The `answerId` of the correct answer. */
  correctAnswerId: string;
  /** Partition key referencing the question's image in blob storage, if any. */
  imagePartitionKey?: string | undefined;
  /** Optional explanation text shown after the answer is revealed. */
  explanation?: string | undefined;
  /** Partition key referencing the explanation's image in blob storage, if any. */
  explanationImagePartitionKey?: string | undefined;
  /** How long this question is displayed before auto-advancing, in milliseconds. */
  questionShowTimeMs: number;
}
