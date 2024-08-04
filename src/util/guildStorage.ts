import { RestError, TableClient, TableEntity } from "@azure/data-tables";

export class GuildStorage {
  private guildClient: TableClient;

  constructor(connectionString?: string, guildClient?: TableClient) {
    if (!guildClient) {
      connectionString =
        connectionString ?? process.env.AZURE_STORAGE_CONNECTION_STRING;
      if (!connectionString) throw Error("Invalid connection string");

      this.guildClient = TableClient.fromConnectionString(
        connectionString,
        "GuildRegistrations",
      );
    } else {
      this.guildClient = guildClient;
    }
  }

  public async initialize() {
    return this.guildClient.createTable();
  }

  public async isGuildRegistered(guildId: string): Promise<boolean> {
    try {
      const entity = await this.guildClient.getEntity(
        "RegisteredGuilds",
        guildId,
      );
      return !!entity;
    } catch (error) {
      if (error instanceof RestError && error.statusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  public async markGuildAsRegistered(guildId: string): Promise<void> {
    const entity: TableEntity = {
      partitionKey: "RegisteredGuilds",
      rowKey: guildId,
    };

    await this.guildClient.upsertEntity(entity);
  }
}
