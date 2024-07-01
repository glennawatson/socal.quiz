import { Answer } from "./answer.interfaces.js";

export interface Question {
  bankName: string;
  questionId: string;
  question: string;
  answers: Answer[];
  correctAnswerId: string;
  imagePartitionKey?: string; // Use partition keys instead of direct URLs
  explanation?: string;
  explanationImagePartitionKey?: string; // Use partition keys instead of direct URLs
  questionShowTimeMs: number;
}
