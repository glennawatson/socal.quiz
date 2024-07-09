import {
  odata,
  TableClient,
  TableDeleteEntityHeaders,
  TableEntity,
  TableQueryOptions,
  TableTransaction,
} from "@azure/data-tables";
import { v4 as uuid } from "uuid";
import { Question } from "../question.interfaces.js";
import { Answer } from "../answer.interfaces.js";
import { ImageType, IQuestionStorage } from "./IQuestionStorage.interfaces.js";
import { QuizImageStorage } from "./quizImageStorage.js";

export class QuestionStorage implements IQuestionStorage {
  private quizQuestionsClient: TableClient;

  constructor(
    private readonly quizImageClient: QuizImageStorage,
    connectionString?: string | undefined,
    quizQuestionsClient?: TableClient,
  ) {
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
  }

  async upsertQuestions(guildId: string, questions: Question[]): Promise<void> {
    const transaction = new TableTransaction();
    for await (const question of questions) {
      const entity = toTableEntity(guildId, question);
      transaction.upsertEntity<Question>(entity);
    }

    await this.quizQuestionsClient.submitTransaction(transaction.actions);
  }

  async getQuestion(
    guildId: string,
    bankName: string,
    id: string,
  ): Promise<Question> {
    const entity = await this.quizQuestionsClient.getEntity<
      TableEntity<Question>
    >(`${guildId}-${bankName}`, id);
    return fromTableEntity(entity);
  }

  async generateAnswer(answerText: string): Promise<Answer> {
    return { answer: answerText, answerId: uuid() };
  }

  async getQuestions(guildId: string, bankName: string): Promise<Question[]> {
    const entitiesIter = this.quizQuestionsClient.listEntities<
      TableEntity<Question>
    >({
      queryOptions: {
        filter: odata`PartitionKey eq ${guildId}-${bankName}`,
      },
    });

    const entities: Question[] = [];
    for await (const entity of entitiesIter) {
      entities.push(fromTableEntity(entity));
    }

    return entities;
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

  async addQuestion(guildId: string, question: Question): Promise<void> {
    const entity = toTableEntity(guildId, question);
    await this.quizQuestionsClient.createEntity(entity);
  }

  async addQuestions(guildId: string, questions: Question[]): Promise<void> {
    const addPromises = questions.map((question) => {
      const entity = toTableEntity(guildId, question);
      return this.quizQuestionsClient.createEntity(entity);
    });
    await Promise.all(addPromises);
  }

  async deleteQuestionBank(guildId: string, bankName: string): Promise<void> {
    const partitionKeyEquals = odata`PartitionKey eq ${guildId}-${bankName}`;
    const options = {
      queryOptions: {
        filter: partitionKeyEquals,
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

  async deleteQuestion(
    guildId: string,
    bankName: string,
    questionId: string,
  ): Promise<void> {
    await this.quizQuestionsClient.deleteEntity(
      `${guildId}-${bankName}`,
      questionId,
    );
  }

  async generateAndAddQuestion(
    guildId: string,
    bankName: string,
    questionText: string,
    answers: Answer[],
    correctAnswerId: string,
    questionShowTimeMs = 20000,
    imageUrl?: string,
    explanation?: string,
    explanationImageUrl?: string,
  ): Promise<void> {
    const question = await this.generateQuestion(
      guildId,
      bankName,
      questionText,
      answers,
      correctAnswerId,
      questionShowTimeMs,
      imageUrl,
      explanation,
      explanationImageUrl,
    );
    await this.addQuestion(guildId, question);
  }

  async generateQuestion(
    guildId: string,
    bankName: string,
    questionText: string,
    answers: Answer[],
    correctAnswerId: string,
    questionShowTimeMs = 20000,
    imageUrl?: string,
    explanation?: string,
    explanationImageUrl?: string,
  ): Promise<Question> {
    const questionId = uuid();

    let imagePartitionKey: string | undefined;
    let explanationImagePartitionKey: string | undefined;

    if (imageUrl) {
      imagePartitionKey = `${guildId}-${bankName}-${questionId}-question`;
      await this.quizImageClient.downloadAndValidateImageForDiscord(
        guildId,
        imageUrl,
        bankName,
        questionId,
        ImageType.Question,
      );
    }

    if (explanationImageUrl) {
      explanationImagePartitionKey = `${guildId}-${bankName}-${questionId}-explanation`;
      await this.quizImageClient.downloadAndValidateImageForDiscord(
        guildId,
        explanationImageUrl,
        bankName,
        questionId,
        ImageType.Explanation,
      );
    }

    return {
      guildId,
      bankName,
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

  public async updateQuestion(
    guildId: string,
    question: Question,
  ): Promise<void> {
    const entity = toTableEntity(guildId, question);
    await this.quizQuestionsClient.updateEntity(entity, "Merge");
  }
}

function toTableEntity(
  guildId: string,
  question: Question,
): TableEntity<Question> {
  const rowKey = question.questionId ?? uuid();
  return {
    guildId: guildId,
    partitionKey: `${guildId}-${question.bankName}`,
    rowKey: rowKey,
    question: question.question,
    questionId: rowKey,
    bankName: question.bankName,
    answers: question.answers,
    correctAnswerId: question.correctAnswerId,
    imagePartitionKey: question.imagePartitionKey,
    explanation: question.explanation,
    explanationImagePartitionKey: question.explanationImagePartitionKey,
    questionShowTimeMs: question.questionShowTimeMs,
  };
}

function fromTableEntity(entity: TableEntity<Question>): Question {
  return {
    guildId: entity.guildId,
    bankName: entity.bankName,
    questionId: entity.rowKey,
    question: entity.question,
    answers: entity.answers,
    correctAnswerId: entity.correctAnswerId,
    imagePartitionKey: entity.imagePartitionKey,
    explanation: entity.explanation,
    explanationImagePartitionKey: entity.explanationImagePartitionKey,
    questionShowTimeMs: entity.questionShowTimeMs,
  };
}
