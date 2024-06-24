import { TableClient, TableEntity } from "@azure/data-tables";
import { QuizState } from "../handlers/quizState.interfaces.js";

export class StateManager {
  private static tableName = "quiz_state_table";
  private client: TableClient;

  public constructor(
    connectionString?: string | undefined,
    client?: TableClient,
  ) {
    if (!client) {
      connectionString ??= process.env.AZURE_STORAGE_CONNECTION_STRING;

      if (!connectionString) {
        throw new Error("Must have a valid connection string");
      }

      this.client = TableClient.fromConnectionString(
        connectionString,
        StateManager.tableName,
      );
    } else {
      this.client = client;
    }
  }

  public async getState(
    guildId: string,
    channelId: string,
  ): Promise<QuizState> {
    const entity = await this.client.getEntity<TableEntity<QuizState>>(
      guildId,
      channelId,
    );
    return fromTableEntity(entity);
  }

  public async setState(state: QuizState): Promise<void> {
    const entity = toTableEntity(state);
    await this.client.upsertEntity(entity, "Merge");
  }

  public async deleteState(guildId: string, channelId: string): Promise<void> {
    await this.client.deleteEntity(guildId, channelId);
  }
}

function fromTableEntity(tableEntity: TableEntity<QuizState>): QuizState {
  return {
    guildId: tableEntity.partitionKey,
    channelId: tableEntity.rowKey,
    activeUsers: tableEntity.activeUsers,
    answeredUsersForQuestion: tableEntity.answeredUsersForQuestion,
    questionBank: tableEntity.questionBank,
    correctUsersForQuestion: tableEntity.correctUsersForQuestion,
    currentQuestionId: tableEntity.currentQuestionId,
  };
}

function toTableEntity(state: QuizState): TableEntity<QuizState> {
  return {
    partitionKey: state.guildId,
    rowKey: state.channelId,
    activeUsers: state.activeUsers,
    answeredUsersForQuestion: state.answeredUsersForQuestion,
    questionBank: state.questionBank,
    correctUsersForQuestion: state.correctUsersForQuestion,
    currentQuestionId: state.currentQuestionId,
    guildId: state.guildId,
    channelId: state.channelId,
  };
}
