import type { Answer } from "./answer.interfaces.js";

export interface Question {
  questionId: string;
  question: string;
  answers: Answer[];
  correctAnswerId: string;
  imagePartitionKey?: string | undefined;
  explanation?: string | undefined;
  explanationImagePartitionKey?: string | undefined;
  questionShowTimeMs: number;
}
