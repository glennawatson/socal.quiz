import { Question } from "../question.interfaces.js";
import { Answer } from "../answer.interfaces.js";

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
  getQuestions(guildId: string, bankName: string): Promise<Question[]>;

  /**
   * Retrieves a specific question by its ID.
   * @param guildId - The ID of the guild.
   * @param bankName - The name of the question bank.
   * @param id - The ID of the question.
   * @returns A promise that resolves to the Question object.
   */
  getQuestion(guildId: string, bankName: string, id: string): Promise<Question>;

  /**
   * Deletes a specified question bank and all its questions.
   * @param guildId - The ID of the guild.
   * @param bankName - The name of the question bank to delete.
   * @returns A promise that resolves when the question bank is deleted.
   */
  deleteQuestionBank(guildId: string, bankName: string): Promise<void>;

  /**
   * Deletes a specific question by its ID from a specified question bank.
   * @param guildId - The ID of the guild.
   * @param bankName - The name of the question bank.
   * @param questionId - The ID of the question to delete.
   * @returns A promise that resolves when the question is deleted.
   */
  deleteQuestion(
    guildId: string,
    bankName: string,
    questionId: string,
  ): Promise<void>;

  /**
   * Retrieves all unique question bank names.
   * @param guildId - The ID of the guild.
   * @returns A promise that resolves to an array of unique question bank names.
   */
  getQuestionBankNames(guildId: string): Promise<string[]>;

  /**
   * Generates and adds a new question to a specified question bank.
   * @param guildId - The ID of the guild.
   * @param bankName - The name of the question bank.
   * @param questionText - The text of the question.
   * @param answers - An array of possible answers.
   * @param correctAnswerId - The ID of the correct answer.
   * @param questionShowTimeMs - The time in milliseconds for how long the question should be shown.
   * @param imageUrl - The URL of an optional image associated with the question.
   * @param explanation - An optional explanation for the question.
   * @param explanationImageUrl - The URL of an optional explanation image.
   * @returns A promise that resolves when the question is added.
   */
  generateAndAddQuestion(
    guildId: string,
    bankName: string,
    questionText: string,
    answers: Answer[],
    correctAnswerId: string,
    questionShowTimeMs: number,
    imageUrl?: string,
    explanation?: string,
    explanationImageUrl?: string,
  ): Promise<void>;

  /**
   * Generates a new question object.
   * @param guildId - The ID of the guild.
   * @param bankName - The name of the question bank.
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
    guildId: string,
    bankName: string,
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
   * Updates an existing question.
   * @param guildId - The ID of the guild.
   * @param question - The Question object containing updated information.
   * @returns A promise that resolves when the question is updated.
   */
  updateQuestion(guildId: string, question: Question): Promise<void>;
}

export enum ImageType {
  Question = "QuestionImage",
  Explanation = "ExplanationImage",
}

/**
 * Interface for managing quiz images in a storage system.
 */
export interface IQuizImageStorage {
  /**
   * Retrieves a presigned URL for accessing a question image.
   * @param guildId - The ID of the guild.
   * @param bankName - The name of the question bank.
   * @param questionId - The ID of the question.
   * @returns A promise that resolves to the presigned URL as a string.
   */
  getQuestionImagePresignedUrl(
    guildId: string,
    bankName: string,
    questionId: string,
  ): Promise<string>;

  /**
   * Retrieves a presigned URL for accessing an explanation image.
   * @param guildId - The ID of the guild.
   * @param bankName - The name of the question bank.
   * @param questionId - The ID of the question.
   * @returns A promise that resolves to the presigned URL as a string.
   */
  getExplanationImagePresignedUrl(
    guildId: string,
    bankName: string,
    questionId: string,
  ): Promise<string>;

  /**
   * Retrieves a presigned URL for accessing a file in a specified container.
   * @param containerName - The name of the container.
   * @param partitionKey - The partition key of the file.
   * @returns A promise that resolves to the presigned URL as a string.
   */
  getPresignedUrl(containerName: string, partitionKey: string): Promise<string>;

  /**
   * Downloads and validates an image from a specified URL for use in Discord.
   * @param guildId - The ID of the guild.
   * @param imageUrl - The URL of the image to download.
   * @param bankName - The name of the bank to store the image.
   * @param questionId - The question id for the question.
   * @param imageType  - the type of image (explanation/question etc).
   * @returns A promise that resolves to the key of the stored image.
   */
  downloadAndValidateImageForDiscord(
    guildId: string,
    imageUrl: string,
    bankName: string,
    questionId: string,
    imageType: ImageType,
  ): Promise<string>;
}
