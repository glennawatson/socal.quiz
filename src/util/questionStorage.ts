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

export class QuestionStorage implements IQuestionStorage {
  private quizQuestionsClient: TableClient;

  private readonly quizImageClient: QuizImageStorage;

  constructor(
    quizImageClient: QuizImageStorage,
    connectionString?: string | undefined,
    tableClient?: TableClient,
  ) {
    this.quizImageClient = quizImageClient;
    if (!tableClient) {
      if (!connectionString) {
        connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
      }

      if (!connectionString) {
        throw new Error("invalid azure storage connection string");
      }

      this.quizQuestionsClient =
        tableClient ??
        TableClient.fromConnectionString(connectionString, "QuizQuestionBanks");
    } else {
      this.quizQuestionsClient = tableClient;
    }
  }

  public initialize() {
    return this.quizQuestionsClient.createTable();
  }

  async upsertQuestionBank(questionBank: QuestionBank): Promise<void> {
    const transaction = new TableTransaction();
    transaction.upsertEntity<QuestionBank>(toTableEntity(questionBank));

    await this.quizQuestionsClient.submitTransaction(transaction.actions);
  }

  async generateAnswer(answerText: string): Promise<Answer> {
    return { answer: answerText, answerId: randomUUID() };
  }

  async getQuestionBank(guildId: string, bankName: string): Promise<QuestionBank> {
    return await this.quizQuestionsClient.getEntity<TableEntity<QuestionBank>>(
      guildId,
      bankName);
  }

  async getQuestionBankNames(guildId: string): Promise<string[]> {
    const queryOptions: TableQueryOptions = {
      filter: odata`PartitionKey ge '${guildId}_'`,
    };

    const entitiesIter = this.quizQuestionsClient.listEntities<
      TableEntity<Question>
    >({
      queryOptions: queryOptions,
    });

    const bankNamesSet = new Set<string>();
    for await (const entity of entitiesIter) {
      const [, bankName] = entity.partitionKey.split("_");

      if (bankName) {
        bankNamesSet.add(bankName);
      }
    }

    return Array.from(bankNamesSet);
  }

  async deleteQuestionBank(guildId: string, bankName: string): Promise<void> {
    await this.quizQuestionsClient.deleteEntity(guildId, bankName);
  }

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