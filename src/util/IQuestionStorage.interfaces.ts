import { Question } from "../question.interfaces.js";
import { Answer } from "../answer.interfaces.js";
import { QuestionBank } from "../questionBank.interfaces.js";

/**
 * Interface for managing questions in a storage system.
 */
export interface IQuestionStorage {
  /**
   * Retrieves all questions from a specified question bank.
   * @param guildId - The ID of the guild.
   * @param bankName - The name of the question bank.
   * @returns A promise that resolves to an array of Question objects.
   */
  getQuestionBank(guildId: string, bankName: string): Promise<QuestionBank>;

  /**
   * Deletes a specified question bank and all its questions.
   * @param guildId - The ID of the guild.
   * @param bankName - The name of the question bank to delete.
   * @returns A promise that resolves when the question bank is deleted.
   */
  deleteQuestionBank(guildId: string, bankName: string): Promise<void>;

  /**
   * Retrieves all unique question bank names.
   * @param guildId - The ID of the guild.
   * @returns A promise that resolves to an array of unique question bank names.
   */
  getQuestionBankNames(guildId: string): Promise<string[]>;

  /**
   * Generates a new question object.
   * @param questionText - The text of the question.
   * @param answers - An array of possible answers.
   * @param correctAnswerId - The ID of the correct answer.
   * @param questionShowTimeMs - The time in milliseconds for how long the question should be shown.
   * @param imageUrl - The URL of an optional image associated with the question.
   * @param explanation - An optional explanation for the question.
   * @param explanationImageUrl - The URL of an optional explanation image.
   * @returns A promise that resolves to the generated Question object.
   */
  generateQuestion(
    questionText: string,
    answers: Answer[],
    correctAnswerId: string,
    questionShowTimeMs: number,
    imageUrl?: string,
    explanation?: string,
    explanationImageUrl?: string,
  ): Promise<Question>;

  /**
   * Generates a new answer object.
   * @param answerText - The text of the answer.
   * @returns A promise that resolves to the generated Answer object.
   */
  generateAnswer(answerText: string): Promise<Answer>;

  /**
   * Upserts questions into the storage.
   * @param questionBank - The question bank to upsert.
   * @returns A promise that resolves when the questions are upserted.
   */
  upsertQuestionBank(questionBank: QuestionBank) : Promise<void>;
}

export enum ImageType {
  Question = "QuestionImage",
  Explanation = "ExplanationImage",
}

