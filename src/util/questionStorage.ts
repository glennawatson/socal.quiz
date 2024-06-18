import {
  TableClient,
  TableEntity,
  odata,
  TableDeleteEntityHeaders,
  RestError,
} from "@azure/data-tables";
import { Question } from "../question";
import { v4 as uuidv4 } from "uuid";
import { throwError } from "./errorHelpers";

const tableConnectionString =
  process.env.AZURE_STORAGE_CONNECTION_STRING ??
  throwError("invalid azure connection string");
const quizQuestionsClient = TableClient.fromConnectionString(
  tableConnectionString,
  "QuizQuestions",
);
const guildClient = TableClient.fromConnectionString(
  tableConnectionString,
  "GuildRegistrations",
);

export async function isGuildRegistered(guildId: string): Promise<boolean> {
  try {
    const entity = await guildClient.getEntity("RegisteredGuilds", guildId);
    return !!entity;
  } catch (error) {
    if (error instanceof RestError && error.statusCode === 404) {
      return false;
    }
    throw error;
  }
}

export async function markGuildAsRegistered(guildId: string): Promise<void> {
  const entity: TableEntity = {
    partitionKey: "RegisteredGuilds",
    rowKey: guildId,
  };

  await guildClient.upsertEntity(entity);
}

export async function getQuestions(bankName: string): Promise<Question[]> {
  const entitiesIter = quizQuestionsClient.listEntities<TableEntity<Question>>({
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

export async function addQuestion(question: Question): Promise<void> {
  const entity = toTableEntity(question);
  await quizQuestionsClient.createEntity(entity);
}

export async function addQuestions(questions: Question[]): Promise<void> {
  const addPromises = questions.map((question) => {
    const entity = toTableEntity(question);
    return quizQuestionsClient.createEntity(entity);
  });
  await Promise.all(addPromises);
}

export async function deleteQuestionBank(bankName: string): Promise<void> {
  const entitiesToDelete = quizQuestionsClient.listEntities<
    TableEntity<Question>
  >({
    queryOptions: {
      filter: odata`PartitionKey eq ${bankName}`,
    },
  });

  const deletePromises: Promise<TableDeleteEntityHeaders>[] = [];
  for await (const entity of entitiesToDelete) {
    deletePromises.push(
      quizQuestionsClient.deleteEntity(entity.partitionKey, entity.rowKey),
    );
  }
  await Promise.all(deletePromises);
}

export async function deleteQuestion(
  bankName: string,
  questionId: string,
): Promise<void> {
  await quizQuestionsClient.deleteEntity(bankName, questionId);
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
