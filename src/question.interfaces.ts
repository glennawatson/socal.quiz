import { Answer } from "./answer.interfaces";

export interface Question {
  bankName: string;
  questionId: string;
  question: string;
  answers: Answer[];
  correctAnswerIndex: number;
  imagePartitionKey?: string; // Use partition keys instead of direct URLs
  explanation?: string;
  explanationImagePartitionKey?: string; // Use partition keys instead of direct URLs
  questionShowTimeMs: number;
}
