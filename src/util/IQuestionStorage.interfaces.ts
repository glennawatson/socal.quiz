import { Question } from "../question.interfaces";

export interface IQuestionStorage {
  getQuestions(bankName: string): Promise<Question[]>;

  deleteQuestionBank(bankName: string): Promise<void>;

  deleteQuestion(bankName: string, questionId: string): Promise<void>;

  getPresignedUrl(containerName: string, partitionKey: string): Promise<string>;

  getQuestionImagePresignedUrl(
    bankName: string,
    questionId: string,
  ): Promise<string>;

  getExplanationImagePresignedUrl(
    bankName: string,
    questionId: string,
  ): Promise<string>;

  generateAndAddQuestion(
    bankName: string,
    questionText: string,
    answersText: string[],
    correctAnswerIndex: number,
    questionShowTimeMs: number,
    imageUrl?: string,
    explanation?: string,
    explanationImageUrl?: string,
  ): Promise<void>;

  generateQuestion(
    bankName: string,
    questionText: string,
    answersText: string[],
    correctAnswerIndex: number,
    questionShowTimeMs: number,
    imageUrl?: string,
    explanation?: string,
    explanationImageUrl?: string,
  ): Promise<Question>;

  updateQuestion(question: Question): Promise<void>;
}
