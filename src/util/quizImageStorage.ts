import {
  BlobSASPermissions,
  BlobServiceClient,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";
import { throwError } from "./errorHelpers.js";
import { ImageType, IQuizImageStorage } from "./IQuestionStorage.interfaces.js";
import { fileTypeFromBuffer } from "file-type";
import gm from "gm";

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB for Discord
const VALID_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

function getImageKey(
  guildId: string,
  bankName: string,
  questionId: string,
  imageType: ImageType,
) {
  return `${guildId}-${bankName}-${questionId}-${imageType}`;
}

export class QuizImageStorage implements IQuizImageStorage {
  private quizImageClient: BlobServiceClient;
  constructor(
    connectionString?: string | undefined,
    private readonly storageAccountKey: string = process.env
      .AZURE_STORAGE_ACCOUNT_KEY ?? throwError("invalid storage account key"),
    private readonly storageAccountName: string = process.env
      .AZURE_STORAGE_ACCOUNT_NAME ?? throwError("invalid storage account name"),
    quizImageClient?: BlobServiceClient,
  ) {
    if (!quizImageClient) {
      if (!connectionString) {
        throw new Error("invalid connection string");
      }

      this.quizImageClient =
        BlobServiceClient.fromConnectionString(connectionString);
    } else {
      this.quizImageClient = quizImageClient;
    }
  }

  public async downloadAndValidateImageForDiscord(
    guildId: string,
    imageUrl: string,
    bankName: string,
    questionId: string,
    imageType: ImageType,
  ): Promise<string> {
    console.log("Args Received:", imageUrl, bankName, questionId);

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

    // Optimize image using ImageMagick
    const optimizedImageBuffer = await new Promise<Buffer>(
      (resolve, reject) => {
        gm(buffer)
          .resize(1000) // Resize image while keeping aspect ratio
          .quality(85)
          .toBuffer("JPEG", (err, buffer) => {
            if (err) {
              reject(err);
            } else {
              resolve(buffer);
            }
          });
      },
    );

    const imagePartitionKey = getImageKey(
      guildId,
      bankName,
      questionId,
      imageType,
    );

    const filename = `${imagePartitionKey}.jpg`;

    const containerClient = this.quizImageClient.getContainerClient(imageType);
    const blockBlobClient = containerClient.getBlockBlobClient(filename);
    await blockBlobClient.uploadData(optimizedImageBuffer);
    return blockBlobClient.url;
  }

  async getPresignedUrl(
    containerName: string,
    partitionKey: string,
  ): Promise<string> {
    const containerClient =
      this.quizImageClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(
      `${partitionKey}.jpg`,
    );

    const sasOptions = {
      containerName,
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
    return `${blockBlobClient.url}?${sasToken}`;
  }

  async getQuestionImagePresignedUrl(
    guildId: string,
    bankName: string,
    questionId: string,
  ): Promise<string> {
    const imagePartitionKey = getImageKey(
      guildId,
      bankName,
      questionId,
      ImageType.Question,
    );
    return this.getPresignedUrl(bankName, imagePartitionKey);
  }

  async getExplanationImagePresignedUrl(
    guildId: string,
    bankName: string,
    questionId: string,
  ): Promise<string> {
    const imagePartitionKey = getImageKey(
      guildId,
      bankName,
      questionId,
      ImageType.Explanation,
    );
    return this.getPresignedUrl(bankName, imagePartitionKey);
  }
}
