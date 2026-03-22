import type { Question } from "./question.interfaces.js";
import type { QuestionBank } from "./questionBank.interfaces.js";

export interface QuestionRequestBody extends Question {
  imageUrl?: string;
  explanationImageUrl?: string;
}

export interface QuestionBankRequestBody extends QuestionBank {
  questions: QuestionRequestBody[];
}

export interface UpsertResult {
  questionId: string;
  success: boolean;
  errorMessage?: string;
}
