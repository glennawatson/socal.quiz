import {
  BlobSASPermissions,
  BlobServiceClient,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";
import { throwError } from "./errorHelpers.js";
import { ImageType } from "./IQuestionStorage.interfaces.js";
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import type { IQuizImageStorage } from "./IQuizImageStorage.interfaces.js";

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB for Discord
const VALID_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

/**
 * Builds a composite storage key from a question ID and image type.
 *
 * @param questionId - The question identifier.
 * @param imageType - The type of image (question, explanation, or answer).
 * @returns The composite storage key.
 */
function getImageKey(
  questionId: string,
  imageType: ImageType,
): string {
  return `${questionId}-${imageType}`;
}

/** Manages quiz image storage in Azure Blob Storage, including upload, optimization, and pre-signed URL generation. */
export class QuizImageStorage implements IQuizImageStorage {
  private blobImageClient: BlobServiceClient;
  private readonly storageAccountKey: string;
  private readonly storageAccountName: string;

  /**
   * Initializes the image storage client using a connection string or an injected BlobServiceClient.
   *
   * @param connectionString - The Azure Storage connection string.
   * @param storageAccountKey - The Azure Storage account key for SAS generation.
   * @param storageAccountName - The Azure Storage account name for SAS generation.
   * @param blobServiceClient - An optional pre-constructed BlobServiceClient instance.
   */
  constructor(
    connectionString?: string  ,
    storageAccountKey: string = process.env
      .AZURE_STORAGE_ACCOUNT_KEY ?? throwError("invalid storage account key"),
    storageAccountName: string = process.env
      .AZURE_STORAGE_ACCOUNT_NAME ?? throwError("invalid storage account name"),
    blobServiceClient?: BlobServiceClient,
  ) {
    this.storageAccountKey = storageAccountKey;
    this.storageAccountName = storageAccountName;
    if (!blobServiceClient) {
      if (!connectionString) {
        throw new Error("invalid connection string");
      }

      this.blobImageClient =
        BlobServiceClient.fromConnectionString(connectionString);
    } else {
      this.blobImageClient = blobServiceClient;
    }
  }

  /**
   * Downloads an image from a URL, validates its type and size, optimizes it with sharp, and stores it in blob storage.
   *
   * @param imageUrl - The URL of the image to download.
   * @param questionId - The question identifier.
   * @param imageType - The type of image being stored.
   * @returns The blob URL where the image was stored.
   */
  public async downloadAndValidateImageForDiscord(
    imageUrl: string,
    questionId: string,
    imageType: ImageType,
  ): Promise<string> {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch image: ${response.status} ${response.statusText}`,
      );
    }

    const contentLengthHeader = response.headers.get("content-length");
    if (contentLengthHeader) {
      const contentLength = parseInt(contentLengthHeader, 10);
      if (contentLength > MAX_FILE_SIZE_BYTES) {
        throw new Error("Image size exceeds Discord's 8MB limit.");
      }
    }

    const imageStream = response.body;
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    if (!imageStream) {
      throw new Error(`Unable to download the file from the URL ${imageUrl}`);
    }

    const reader = imageStream.getReader();
    let result = await reader.read();

    while (!result.done) {
      const chunk = result.value;
      totalBytes += chunk.length;
      if (totalBytes > MAX_FILE_SIZE_BYTES) {
        throw new Error("Image size exceeds Discord's 8MB limit.");
      }
      chunks.push(chunk);
      result = await reader.read();
    }

    const buffer = Buffer.concat(chunks);

    // Validate file type
    const fileTypeResult = await fileTypeFromBuffer(buffer);
    if (!fileTypeResult || !VALID_IMAGE_TYPES.includes(fileTypeResult.mime)) {
      throw new Error("Invalid image file type for Discord.");
    }

    // Optimize image using sharp
    const optimizedImageBuffer = await sharp(buffer)
      .resize(1000, undefined, { withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    const imagePartitionKey = getImageKey(
      questionId,
      imageType,
    );

    const filename = `${imagePartitionKey}.jpg`;

    const containerClient = this.blobImageClient.getContainerClient(imageType);
    const blockBlobClient = containerClient.getBlockBlobClient(filename);
    await blockBlobClient.uploadData(optimizedImageBuffer);
    return blockBlobClient.url;
  }

  /**
   * Generates a read-only pre-signed URL for a blob, valid for 24 hours.
   *
   * @param containerName - The blob container name.
   * @param partitionKey - The partition key identifying the blob.
   * @returns A pre-signed URL with read access.
   */
  getPresignedUrl(
    containerName: string,
    partitionKey: string,
  ): Promise<string> {
    const containerClient =
      this.blobImageClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(
      `${partitionKey}.jpg`,
    );

    const sasOptions = {
      containerName: containerName,
      blobName: `${partitionKey}.jpg`,
      permissions: BlobSASPermissions.parse("r"), // Read permission
      startsOn: new Date(),
      expiresOn: new Date(new Date().valueOf() + 86400 * 1000), // Expires in 24 hours
    };

    const sharedKeyCredential = new StorageSharedKeyCredential(
      this.storageAccountName,
      this.storageAccountKey,
    );

    const sasToken = generateBlobSASQueryParameters(
      sasOptions,
      sharedKeyCredential,
    ).toString();
    return Promise.resolve(`${blockBlobClient.url}?${sasToken}`);
  }

  /**
   * Returns a pre-signed URL for the question image associated with the given question ID.
   *
   * @param questionId - The question identifier.
   * @returns A pre-signed URL for the question image.
   */
  getQuestionImagePresignedUrl(
    questionId: string,
  ): Promise<string> {
    const imagePartitionKey = getImageKey(
      questionId,
      ImageType.Question,
    );
    return this.getPresignedUrl(ImageType.Question, imagePartitionKey);
  }

  /**
   * Returns a pre-signed URL for the explanation image associated with the given question ID.
   *
   * @param questionId - The question identifier.
   * @returns A pre-signed URL for the explanation image.
   */
  getExplanationImagePresignedUrl(
    questionId: string,
  ): Promise<string> {
    const imagePartitionKey = getImageKey(
      questionId,
      ImageType.Explanation,
    );
    return this.getPresignedUrl(ImageType.Explanation, imagePartitionKey);
  }

  /**
   * Uploads a raw image buffer to the specified container and blob name.
   *
   * @param buffer - The image data to upload.
   * @param containerName - The blob container name.
   * @param blobName - The blob name for the uploaded image.
   * @returns A promise that resolves when the upload completes.
   */
  async uploadImageBuffer(
    buffer: Buffer,
    containerName: string,
    blobName: string,
  ): Promise<void> {
    const containerClient =
      this.blobImageClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.uploadData(buffer);
  }

  /**
   * Returns a pre-signed URL for an answer image identified by question ID and answer ID.
   *
   * @param questionId - The question identifier.
   * @param answerId - The answer identifier.
   * @returns A pre-signed URL for the answer image.
   */
  getAnswerImagePresignedUrl(
    questionId: string,
    answerId: string,
  ): Promise<string> {
    const imagePartitionKey = `${questionId}-${answerId}-${ImageType.Answer}`;
    return this.getPresignedUrl(ImageType.Answer, imagePartitionKey);
  }

  /**
   * Downloads an answer image from a URL, validates and optimizes it, and stores it in blob storage.
   *
   * @param imageUrl - The URL of the answer image to download.
   * @param questionId - The question identifier.
   * @param answerId - The answer identifier.
   * @returns The blob URL where the image was stored.
   */
  async downloadAndValidateAnswerImage(
    imageUrl: string,
    questionId: string,
    answerId: string,
  ): Promise<string> {
    const answerImageType = `${questionId}-${answerId}-${ImageType.Answer}`;
    return this.downloadAndValidateImageForDiscord(
      imageUrl,
      answerImageType,
      ImageType.Answer,
    );
  }
}
