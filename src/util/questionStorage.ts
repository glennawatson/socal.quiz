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
import { Question } from "../question.interfaces";
import fileType from "file-type";
import sharp from "sharp";
import { Answer } from "../answer.interfaces";
import { throwError } from "./errorHelpers";
import { IQuestionStorage } from "./IQuestionStorage.interfaces";

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB for Discord
const VALID_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

export class QuestionStorage implements IQuestionStorage {
  private quizQuestionsClient: TableClient;
  private quizImageClient: BlobServiceClient;

  constructor(
    connectionString?: string | undefined,
    private readonly storageAccountName: string = process.env
      .AZURE_STORAGE_ACCOUNT_NAME ?? throwError("invalid storage account name"),
    private readonly storageAccountKey: string = process.env
      .AZURE_STORAGE_ACCOUNT_KEY ?? throwError("invalid storage account key"),
    quizQuestionsClient?: TableClient,
    quizImageClient?: BlobServiceClient,
  ) {
    this.storageAccountName = storageAccountName;
    this.storageAccountKey = storageAccountKey;

    if (!quizQuestionsClient) {
      if (!connectionString) {
        connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
      }

      if (!connectionString) {
        throw new Error("invalid azure storage connection string");
      }

      this.quizQuestionsClient =
        quizQuestionsClient ??
        TableClient.fromConnectionString(connectionString, "QuizQuestions");
    } else {
      this.quizQuestionsClient = quizQuestionsClient;
    }

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

  public async deleteQuestionBank(bankName: string): Promise<void> {
    const options = {
      queryOptions: {
        filter: odata`PartitionKey eq ${bankName}`,
      },
    };
    const entitiesToDelete =
      this.quizQuestionsClient.listEntities<TableEntity<Question>>(options);

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

  protected async downloadAndValidateImageForDiscord(
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

  public async updateQuestion(question: Question): Promise<void> {
    // New method for updating questions
    const entity = toTableEntity(question);
    await this.quizQuestionsClient.updateEntity(entity, "Merge");
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
