import { Question } from "../question.interfaces.js";
import {Answer} from "../answer.interfaces.js";

export interface IQuestionStorage {
  getQuestions(bankName: string): Promise<Question[]>;

  deleteQuestionBank(bankName: string): Promise<void>;

  deleteQuestion(bankName: string, questionId: string): Promise<void>;

  generateAndAddQuestion(
    bankName: string,
    questionText: string,
    answers: Answer[],
    correctAnswerId: string,
    questionShowTimeMs: number,
    imageUrl?: string,
    explanation?: string,
    explanationImageUrl?: string,
  ): Promise<void>;

  generateQuestion(
    bankName: string,
    questionText: string,
    answers: Answer[],
    correctAnswerId: string,
    questionShowTimeMs: number,
    imageUrl?: string,
    explanation?: string,
    explanationImageUrl?: string,
  ): Promise<Question>;

  generateAnswer(answerText: string) : Promise<Answer>;

  updateQuestion(question: Question): Promise<void>;
}

export interface IQuizImageStorage {
  getQuestionImagePresignedUrl(
    bankName: string,
    questionId: string,
  ): Promise<string>;

  getExplanationImagePresignedUrl(
    bankName: string,
    questionId: string,
  ): Promise<string>;

  getPresignedUrl(containerName: string, partitionKey: string): Promise<string>;

  downloadAndValidateImageForDiscord(
    imageUrl: string,
    containerName: string,
    partitionKey: string,
  ): Promise<string>;
}
