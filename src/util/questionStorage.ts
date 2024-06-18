import {
  TableClient,
  TableEntity,
  odata,
  TableDeleteEntityHeaders,
} from "@azure/data-tables";
import { Question } from "../question";
import { v4 as uuidv4 } from "uuid";

export class QuestionStorage {
  private quizQuestionsClient: TableClient;

  constructor(connectionString?: string) {
    connectionString = connectionString ?? process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) throw Error("Invalid connection string");

    this.quizQuestionsClient = TableClient.fromConnectionString(connectionString, 'QuizQuestions');
  }

  public async getQuestions(bankName: string): Promise<Question[]> {
    const entitiesIter = this.quizQuestionsClient.listEntities<TableEntity<Question>>({
      queryOptions: {
        filter: odata`PartitionKey eq ${bankName}`,
      },
    });

    if (!entitiesIter) {
      return [];
    }

    const entities: Question[] = [];
    for await (const entity of entitiesIter) {
      entities.push(fromTableEntity(entity));
    }

    return entities;
  }

  public async addQuestion(question: Question): Promise<void> {
    const entity = toTableEntity(question);
    await this.quizQuestionsClient.createEntity(entity);
  }

  public async addQuestions(questions: Question[]): Promise<void> {
    const addPromises = questions.map((question) => {
      const entity = toTableEntity(question);
      return this.quizQuestionsClient.createEntity(entity);
    });
    await Promise.all(addPromises);
  }

  public async deleteQuestionBank(bankName: string): Promise<void> {
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
          this.quizQuestionsClient.deleteEntity(entity.partitionKey, entity.rowKey),
      );
    }
    await Promise.all(deletePromises);
  }

  public async deleteQuestion(
      bankName: string,
      questionId: string,
  ): Promise<void> {
    await this.quizQuestionsClient.deleteEntity(bankName, questionId);
  }
}



function toTableEntity(question: Question): TableEntity<Question> {
  const rowKey = question.questionId || uuidv4();
  return {
    partitionKey: question.bankName,
    rowKey: rowKey, // Generate RowKey if not provided
    question: question.question,
    questionId: rowKey,
    bankName: question.bankName,
    answers: question.answers,
    correctAnswerIndex: question.correctAnswerIndex,
    imageUrl: question.imageUrl,
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
    imageUrl: entity.imageUrl,
    questionShowTimeMs: entity.questionShowTimeMs,
  };
}
