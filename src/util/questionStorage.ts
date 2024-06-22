import {
  odata,
  TableClient,
  TableDeleteEntityHeaders,
  TableEntity,
} from "@azure/data-tables";
import {
  BlobSASPermissions,
  BlobServiceClient,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";
import { v4 as uuidv4 } from "uuid";
import { Question } from "../question";
import fileType from "file-type";
import sharp from "sharp";
import { Answer } from "../answer";
import { throwError } from "./errorHelpers";

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB for Discord
const VALID_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

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
}

export class QuestionStorage implements IQuestionStorage {
  private quizQuestionsClient: TableClient;
  private quizImageClient: BlobServiceClient;

  constructor(
    connectionString: string = process.env.AZURE_STORAGE_CONNECTION_STRING ??
      throwError("No valid connection string to azure storage"),
    private readonly storageAccountName: string = process.env
      .AZURE_STORAGE_CONNECTION_STRING ??
      throwError("invalid azure storage connection string"),
    private readonly storageAccountKey: string = process.env
      .AZURE_STORAGE_ACCOUNT_KEY ?? throwError("invalid storage account key"),
    quizQuestionsClient?: TableClient,
    quizImageClient?: BlobServiceClient) {
    if (!connectionString || !storageAccountName || !storageAccountKey) {
      throw new Error(
        "Invalid connection string or storage account credentials",
      );
    }

    this.quizQuestionsClient = quizQuestionsClient ?? TableClient.fromConnectionString(
      connectionString,
      "QuizQuestions",
    );
    this.quizImageClient = quizImageClient ?? BlobServiceClient.fromConnectionString(connectionString);
    this.storageAccountName = storageAccountName;
    this.storageAccountKey = storageAccountKey;
  }

  async getQuestions(bankName: string): Promise<Question[]> {
    const entitiesIter = this.quizQuestionsClient.listEntities<
      TableEntity<Question>
    >({
      queryOptions: {
        filter: odata`PartitionKey eq ${bankName}`,
      },
    });

    const entities: Question[] = [];
    for await (const entity of entitiesIter) {
      entities.push(fromTableEntity(entity));
    }

    return entities;
  }

  async addQuestion(question: Question): Promise<void> {
    const entity = toTableEntity(question);
    await this.quizQuestionsClient.createEntity(entity);
  }

  async addQuestions(questions: Question[]): Promise<void> {
    const addPromises = questions.map((question) => {
      const entity = toTableEntity(question);
      return this.quizQuestionsClient.createEntity(entity);
    });
    await Promise.all(addPromises);
  }

  async deleteQuestionBank(bankName: string): Promise<void> {
    const entitiesToDelete = this.quizQuestionsClient.listEntities<
      TableEntity<Question>
    >({
      queryOptions: {
        filter: odata`PartitionKey eq ${bankName}`,
      },
    });

    const deletePromises: Promise<TableDeleteEntityHeaders>[] = [];
    for await (const entity of entitiesToDelete) {
      deletePromises.push(
        this.quizQuestionsClient.deleteEntity(
          entity.partitionKey,
          entity.rowKey,
        ),
      );
    }
    await Promise.all(deletePromises);
  }

  async deleteQuestion(bankName: string, questionId: string): Promise<void> {
    await this.quizQuestionsClient.deleteEntity(bankName, questionId);
  }

  private async downloadAndValidateImageForDiscord(
    imageUrl: string,
    containerName: string,
    partitionKey: string,
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
    const fileTypeResult = await fileType.fileTypeFromBuffer(buffer);
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

  async generateAndAddQuestion(
    bankName: string,
    questionText: string,
    answersText: string[],
    correctAnswerIndex: number,
    questionShowTimeMs = 20000,
    imageUrl?: string,
    explanation?: string,
    explanationImageUrl?: string,
  ): Promise<void> {
    const question = await this.generateQuestion(
      bankName,
      questionText,
      answersText,
      correctAnswerIndex,
      questionShowTimeMs,
      imageUrl,
      explanation,
      explanationImageUrl,
    );
    await this.addQuestion(question);
  }

  async generateQuestion(
    bankName: string,
    questionText: string,
    answersText: string[],
    correctAnswerIndex: number,
    questionShowTimeMs = 20000,
    imageUrl?: string,
    explanation?: string,
    explanationImageUrl?: string,
  ): Promise<Question> {
    const questionId = uuidv4();
    const answers: Answer[] = answersText.map((text) => ({
      answerId: uuidv4(),
      answer: text,
    }));

    let imagePartitionKey: string | undefined;
    let explanationImagePartitionKey: string | undefined;

    if (imageUrl) {
      imagePartitionKey = `${bankName}-${questionId}-question`;
      await this.downloadAndValidateImageForDiscord(
        imageUrl,
        bankName,
        imagePartitionKey,
      );
    }

    if (explanationImageUrl) {
      explanationImagePartitionKey = `${bankName}-${questionId}-explanation`;
      await this.downloadAndValidateImageForDiscord(
        explanationImageUrl,
        bankName,
        explanationImagePartitionKey,
      );
    }

    return {
      bankName,
      questionId,
      question: questionText,
      answers,
      correctAnswerIndex,
      questionShowTimeMs,
      imagePartitionKey,
      explanation,
      explanationImagePartitionKey,
    };
  }
}

function toTableEntity(question: Question): TableEntity<Question> {
  const rowKey = question.questionId;
  return {
    partitionKey: question.bankName,
    rowKey: rowKey,
    question: question.question,
    questionId: rowKey,
    bankName: question.bankName,
    answers: question.answers,
    correctAnswerIndex: question.correctAnswerIndex,
    imagePartitionKey: question.imagePartitionKey,
    explanation: question.explanation,
    explanationImagePartitionKey: question.explanationImagePartitionKey,
    questionShowTimeMs: question.questionShowTimeMs,
  };
}

function fromTableEntity(entity: TableEntity<Question>): Question {
  return {
    bankName: entity.partitionKey,
    questionId: entity.rowKey,
    question: entity.question,
    answers: entity.answers,
    correctAnswerIndex: entity.correctAnswerIndex,
    imagePartitionKey: entity.imagePartitionKey,
    explanation: entity.explanation,
    explanationImagePartitionKey: entity.explanationImagePartitionKey,
    questionShowTimeMs: entity.questionShowTimeMs,
  };
}
