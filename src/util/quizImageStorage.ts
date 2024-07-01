import {
    BlobSASPermissions,
    BlobServiceClient,
    generateBlobSASQueryParameters,
    StorageSharedKeyCredential,
} from "@azure/storage-blob";
import sharp from "sharp";
import { throwError } from "./errorHelpers.js";
import { IQuizImageStorage } from "./IQuestionStorage.interfaces.js";
import { fileTypeFromBuffer } from "file-type";

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB for Discord
const VALID_IMAGE_TYPES = [
"image/jpeg",
"image/png",
"image/gif",
"image/webp",
];
  
export class QuizImageStorage implements IQuizImageStorage {
    private quizImageClient: BlobServiceClient;
    constructor(
        connectionString?: string | undefined,
        private readonly storageAccountKey: string = process.env
            .AZURE_STORAGE_ACCOUNT_KEY ?? throwError("invalid storage account key"),
        private readonly storageAccountName: string = process.env
            .AZURE_STORAGE_ACCOUNT_NAME ?? throwError("invalid storage account name"),
        quizImageClient?: BlobServiceClient) {
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
        imageUrl: string,
        containerName: string,
        partitionKey: string,
      ): Promise<string> {
        console.log("Args Received:", imageUrl, containerName, partitionKey);
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
          .jpeg({ quality: 85 })
          .toBuffer();
    
        const filename = `${partitionKey}.jpg`;
    
        const containerClient =
          this.quizImageClient.getContainerClient(containerName);
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
        bankName: string,
        questionId: string,
      ): Promise<string> {
        const partitionKey = `${bankName}-${questionId}-question`;
        return this.getPresignedUrl(bankName, partitionKey);
      }
    
      async getExplanationImagePresignedUrl(
        bankName: string,
        questionId: string,
      ): Promise<string> {
        const partitionKey = `${bankName}-${questionId}-explanation`;
        return this.getPresignedUrl(bankName, partitionKey);
      }
}  