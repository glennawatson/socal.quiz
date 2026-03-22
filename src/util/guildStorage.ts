import { RestError, TableClient, type TableEntity } from "@azure/data-tables";

/** Manages guild registration state in Azure Table Storage. */
export class GuildStorage {
  private guildClient: TableClient;

  /**
   * Creates a new GuildStorage instance.
   *
   * @param connectionString - The Azure Storage connection string.
   * @param guildClient - An optional pre-constructed TableClient instance.
   */
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

  /**
   * Creates the GuildRegistrations table if it does not already exist.
   *
   * @returns A promise that resolves when the table exists.
   */
  public async initialize(): Promise<void> {
    await this.guildClient.createTable();
  }

  /**
   * Checks whether a guild has been registered with the bot.
   *
   * @param guildId - The guild identifier to check.
   * @returns True if the guild is registered, false otherwise.
   */
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

  /**
   * Records a guild as registered in storage.
   *
   * @param guildId - The guild identifier to register.
   * @returns A promise that resolves when the registration completes.
   */
  public async markGuildAsRegistered(guildId: string): Promise<void> {
    const entity: TableEntity = {
      partitionKey: "RegisteredGuilds",
      rowKey: guildId,
    };

    await this.guildClient.upsertEntity(entity);
  }
}
