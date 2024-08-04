import { ImageType } from "./IQuestionStorage.interfaces.js";

/**
 * Interface for managing quiz images in a storage system.
 */
export interface IQuizImageStorage {
  /**
   * Retrieves a presigned URL for accessing a question image.
   * @param questionId - The ID of the question.
   * @returns A promise that resolves to the presigned URL as a string.
   */
  getQuestionImagePresignedUrl(
    questionId: string
  ): Promise<string>;

  /**
   * Retrieves a presigned URL for accessing an explanation image.
   * @param questionId - The ID of the question.
   * @returns A promise that resolves to the presigned URL as a string.
   */
  getExplanationImagePresignedUrl(
    questionId: string
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
   * @param imageUrl - The URL of the image to download.
   * @param questionId - The question id for the question.
   * @param imageType  - the type of image (explanation/question).
   * @returns A promise that resolves to the key of the stored image.
   */
  downloadAndValidateImageForDiscord(
    imageUrl: string,
    questionId: string,
    imageType: ImageType
  ): Promise<string>;
}