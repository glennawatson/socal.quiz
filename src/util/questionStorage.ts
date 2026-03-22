import {
  odata,
  TableClient,
  type TableEntity,
  type TableQueryOptions,
  TableTransaction
} from "@azure/data-tables";
import { randomUUID } from "node:crypto";
import type { Question } from "../question.interfaces.js";
import type { Answer } from "../answer.interfaces.js";
import { ImageType, type IQuestionStorage } from "./IQuestionStorage.interfaces.js";
import { QuizImageStorage } from "./quizImageStorage.js";
import type { QuestionBank } from "../questionBank.interfaces.js";

/**
 * Manages question bank persistence in Azure Table Storage.
 */
export class QuestionStorage implements IQuestionStorage {
  private quizQuestionsClient: TableClient;

  private readonly quizImageClient: QuizImageStorage;

  /**
   * Creates a new QuestionStorage instance, connecting to Azure Table Storage for question bank persistence.
   *
   * @param quizImageClient - The image storage client for handling question images.
   * @param connectionString - The Azure Storage connection string.
   * @param tableClient - An optional pre-constructed TableClient instance.
   */
  constructor(
    quizImageClient: QuizImageStorage,
    connectionString?: string  ,
    tableClient?: TableClient,
  ) {
    this.quizImageClient = quizImageClient;
    if (!tableClient) {
      connectionString ??= process.env.AZURE_STORAGE_CONNECTION_STRING;

      if (!connectionString) {
        throw new Error("invalid azure storage connection string");
      }

      this.quizQuestionsClient =
        TableClient.fromConnectionString(connectionString, "QuizQuestionBanks");
    } else {
      this.quizQuestionsClient = tableClient;
    }
  }

  /**
   * Initializes the backing table in Azure Table Storage, creating it if it does not already exist.
   *
   * @returns A promise that resolves when the table exists.
   */
  public initialize(): Promise<void> {
    return this.quizQuestionsClient.createTable();
  }

  /**
   * Upserts a question bank entity into Azure Table Storage using a table transaction.
   *
   * @param questionBank - The question bank to upsert.
   * @returns A promise that resolves when the upsert completes.
   */
  async upsertQuestionBank(questionBank: QuestionBank): Promise<void> {
    const transaction = new TableTransaction();
    transaction.upsertEntity<QuestionBank>(toTableEntity(questionBank));

    await this.quizQuestionsClient.submitTransaction(transaction.actions);
  }

  /**
   * Generates a new answer object with a random UUID identifier.
   *
   * @param answerText - The text of the answer.
   * @returns The newly created answer object.
   */
  generateAnswer(answerText: string): Promise<Answer> {
    return Promise.resolve({ answer: answerText, answerId: randomUUID() });
  }

  /**
   * Retrieves a question bank from Azure Table Storage by guild ID and bank name.
   *
   * @param guildId - The guild identifier.
   * @param bankName - The name of the question bank.
   * @returns The question bank entity.
   */
  async getQuestionBank(guildId: string, bankName: string): Promise<QuestionBank> {
    return await this.quizQuestionsClient.getEntity<TableEntity<QuestionBank>>(
      guildId,
      bankName);
  }

  /**
   * Retrieves all unique question bank names for a given guild from Azure Table Storage.
   *
   * @param guildId - The guild identifier.
   * @returns An array of question bank names.
   */
  async getQuestionBankNames(guildId: string): Promise<string[]> {
    const queryOptions: TableQueryOptions = {
      filter: odata`PartitionKey eq '${guildId}'`,
    };

    const entitiesIter = this.quizQuestionsClient.listEntities<
      TableEntity<QuestionBank>
    >({
      queryOptions: queryOptions,
    });

    const bankNamesSet = new Set<string>();
    for await (const entity of entitiesIter) {
      if (entity.rowKey) {
        bankNamesSet.add(entity.rowKey);
      }
    }

    return Array.from(bankNamesSet);
  }

  /**
   * Deletes a question bank entity from Azure Table Storage by guild ID and bank name.
   *
   * @param guildId - The guild identifier.
   * @param bankName - The name of the question bank to delete.
   * @returns A promise that resolves when the deletion completes.
   */
  async deleteQuestionBank(guildId: string, bankName: string): Promise<void> {
    await this.quizQuestionsClient.deleteEntity(guildId, bankName);
  }

  /**
   * Generates a new question object, downloading and validating any associated images for Discord.
   *
   * @param questionText - The text of the question.
   * @param answers - The list of answers for the question.
   * @param correctAnswerId - The ID of the correct answer.
   * @param questionShowTimeMs - How long the question is shown, in milliseconds.
   * @param imageUrl - An optional URL for the question image.
   * @param explanation - An optional explanation for the correct answer.
   * @param explanationImageUrl - An optional URL for the explanation image.
   * @returns The newly created question object.
   */
  async generateQuestion(
    questionText: string,
    answers: Answer[],
    correctAnswerId: string,
    questionShowTimeMs = 20000,
    imageUrl?: string,
    explanation?: string,
    explanationImageUrl?: string,
  ): Promise<Question> {
    const questionId = randomUUID();

    let imagePartitionKey: string | undefined;
    let explanationImagePartitionKey: string | undefined;

    if (imageUrl) {
      imagePartitionKey = `${questionId}-question`;
      await this.quizImageClient.downloadAndValidateImageForDiscord(
        imageUrl,
        questionId,
        ImageType.Question,
      );
    }

    if (explanationImageUrl) {
      explanationImagePartitionKey = `${questionId}-explanation`;
      await this.quizImageClient.downloadAndValidateImageForDiscord(
        explanationImageUrl,
        questionId,
        ImageType.Explanation,
      );
    }

    return {
      questionId,
      question: questionText,
      answers,
      correctAnswerId,
      questionShowTimeMs,
      imagePartitionKey,
      explanation,
      explanationImagePartitionKey,
    };
  }
}

/**
 * Converts a QuestionBank domain object into an Azure Table Storage entity with partition and row keys.
 *
 * @param questionBank - The question bank to convert.
 * @returns The Azure Table entity representation.
 */
function toTableEntity(
  questionBank: QuestionBank
): TableEntity<QuestionBank> {
  return {
    guildId: questionBank.guildId,
    partitionKey: questionBank.guildId,
    rowKey: questionBank.name,
    questions: questionBank.questions,
    name: questionBank.name,
  };
}
