import {
  RestError,
  TableClient,
  type TableEntity,
} from "@azure/data-tables";
import {
  defaultQuizConfig,
} from "../quizConfig.interfaces.js";
import type { GuildQuizConfig, ResolvedQuizConfig } from "../quizConfig.interfaces.js";

/** Manages per-guild quiz configuration in Azure Table Storage, supporting guild-level and bank-level config scopes. */
export class GuildQuizConfigStorage {
  private configClient: TableClient;

  /**
   * Creates a storage client using an explicit TableClient, a connection string, or the AZURE_STORAGE_CONNECTION_STRING env var.
   *
   * @param connectionString - The Azure Storage connection string.
   * @param tableClient - An optional pre-constructed TableClient instance.
   */
  constructor(connectionString?: string, tableClient?: TableClient) {
    if (tableClient) {
      this.configClient = tableClient;
    } else {
      connectionString =
        connectionString ?? process.env.AZURE_STORAGE_CONNECTION_STRING;
      if (!connectionString) throw new Error("Invalid connection string");

      this.configClient = TableClient.fromConnectionString(
        connectionString,
        "GuildQuizConfig",
      );
    }
  }

  /**
   * Ensures the backing Azure table exists, creating it if necessary.
   *
   * @returns A promise that resolves when the table exists.
   */
  public async initialize(): Promise<void> {
    return this.configClient.createTable();
  }

  /**
   * Retrieves the quiz config for a given guild and scope, returning undefined if none exists.
   *
   * @param guildId - The guild identifier.
   * @param scope - The configuration scope (e.g. "default" or a bank name).
   * @returns The quiz config if found, or undefined.
   */
  public async getConfig(
    guildId: string,
    scope: string,
  ): Promise<GuildQuizConfig | undefined> {
    try {
      const entity = await this.configClient.getEntity<
        TableEntity<GuildQuizConfig>
      >(guildId, scope);
      return fromTableEntity(entity);
    } catch (error) {
      if (error instanceof RestError && error.statusCode === 404) {
        return undefined;
      }
      throw error;
    }
  }

  /**
   * Inserts or updates a quiz config entry, keyed by guild ID and scope.
   *
   * @param config - The quiz config to upsert.
   * @returns A promise that resolves when the upsert completes.
   */
  public async upsertConfig(config: GuildQuizConfig): Promise<void> {
    await this.configClient.upsertEntity(toTableEntity(config));
  }

  /**
   * Deletes the quiz config for a given guild and scope.
   *
   * @param guildId - The guild identifier.
   * @param scope - The configuration scope to delete.
   * @returns A promise that resolves when the deletion completes.
   */
  public async deleteConfig(guildId: string, scope: string): Promise<void> {
    await this.configClient.deleteEntity(guildId, scope);
  }

  /**
   * Merges guild-level and bank-level config with system defaults, returning a fully resolved config.
   *
   * @param guildId - The guild identifier.
   * @param bankName - The optional question bank name to check for bank-level overrides.
   * @returns The fully resolved quiz config with all defaults applied.
   */
  public async getEffectiveConfig(
    guildId: string,
    bankName?: string  ,
  ): Promise<ResolvedQuizConfig> {
    const guildConfig = await this.getConfig(guildId, "default");

    let bankConfig: GuildQuizConfig | undefined;
    if (bankName) {
      bankConfig = await this.getConfig(guildId, bankName);
    }

    return {
      defaultQuestionShowTimeMs:
        bankConfig?.defaultQuestionShowTimeMs ??
        guildConfig?.defaultQuestionShowTimeMs ??
        defaultQuizConfig.defaultQuestionShowTimeMs,
      advanceMode:
        bankConfig?.advanceMode ??
        guildConfig?.advanceMode ??
        defaultQuizConfig.advanceMode,
      interQuestionMessages:
        bankConfig?.interQuestionMessages ??
        guildConfig?.interQuestionMessages ??
        defaultQuizConfig.interQuestionMessages,
      summaryDurationMs:
        bankConfig?.summaryDurationMs ??
        guildConfig?.summaryDurationMs ??
        defaultQuizConfig.summaryDurationMs,
      soundboardEnabled:
        bankConfig?.soundboardEnabled ??
        guildConfig?.soundboardEnabled ??
        defaultQuizConfig.soundboardEnabled,
      soundboardSoundIds:
        bankConfig?.soundboardSoundIds ??
        guildConfig?.soundboardSoundIds ??
        defaultQuizConfig.soundboardSoundIds,
      soundboardVoiceChannelId:
        bankConfig?.soundboardVoiceChannelId ??
        guildConfig?.soundboardVoiceChannelId ??
        defaultQuizConfig.soundboardVoiceChannelId,
    };
  }
}

/**
 * Converts a GuildQuizConfig into an Azure Table entity with partition and row keys.
 *
 * @param config - The guild quiz config to convert.
 * @returns The Azure Table entity representation.
 */
function toTableEntity(
  config: GuildQuizConfig,
): TableEntity<GuildQuizConfig> {
  return {
    partitionKey: config.guildId,
    rowKey: config.scope,
    guildId: config.guildId,
    scope: config.scope,
    defaultQuestionShowTimeMs: config.defaultQuestionShowTimeMs,
    advanceMode: config.advanceMode,
    interQuestionMessages: config.interQuestionMessages,
    summaryDurationMs: config.summaryDurationMs,
    soundboardEnabled: config.soundboardEnabled,
    soundboardSoundIds: config.soundboardSoundIds,
    soundboardVoiceChannelId: config.soundboardVoiceChannelId,
  };
}

/**
 * Converts an Azure Table entity back into a plain GuildQuizConfig object.
 *
 * @param entity - The Azure Table entity to convert.
 * @returns The plain GuildQuizConfig object.
 */
function fromTableEntity(
  entity: TableEntity<GuildQuizConfig>,
): GuildQuizConfig {
  return {
    guildId: entity.partitionKey,
    scope: entity.rowKey,
    defaultQuestionShowTimeMs: entity.defaultQuestionShowTimeMs,
    advanceMode: entity.advanceMode,
    interQuestionMessages: entity.interQuestionMessages,
    summaryDurationMs: entity.summaryDurationMs,
    soundboardEnabled: entity.soundboardEnabled,
    soundboardSoundIds: entity.soundboardSoundIds,
    soundboardVoiceChannelId: entity.soundboardVoiceChannelId,
  };
}
