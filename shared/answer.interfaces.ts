/**
 * Represents a single answer option for a quiz question.
 */
export interface Answer {
  /** Unique identifier for this answer. */
  answerId: string;
  /** The answer text displayed to users. */
  answer: string;
  /** Partition key referencing the answer's image in blob storage, if any. */
  imagePartitionKey?: string | undefined;
}
