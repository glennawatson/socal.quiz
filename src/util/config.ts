import { DiscordBotService } from "../handlers/discordBotService.js";
import { QuestionStorage } from "./questionStorage.js";
import { GuildStorage } from "./guildStorage.js";
import { throwError } from "./errorHelpers.js";
import { REST } from "@discordjs/rest";
import { DurableClient } from "durable-functions";
import { CommandManager } from "../handlers/actions/commandManager.js";
import { QuizImageStorage } from "./quizImageStorage.js";
import { DurableQuizManager } from "../handlers/durableQuizManager.js";
import { QuizManagerFactoryManager } from "../handlers/quizManagerFactoryManager.js";
import { OAuth2Relay } from "./oauth2Relay.js";
import { GuildQuizConfigStorage } from "./guildQuizConfigStorage.js";
import { SoundboardStorage } from "./soundboardStorage.js";
import { SoundboardManager } from "../handlers/soundboardManager.js";

/**
 * Singleton configuration class that initializes and holds all shared
 * service instances (storage clients, Discord REST, OAuth2, quiz managers, etc.).
 *
 * Call {@link Config.initialize} once at application startup before accessing
 * any static properties. Subsequent calls return the cached initialization promise.
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- Deliberate singleton pattern using static properties
export class Config {
  public static token: string;
  public static clientId: string;
  public static publicKey: string;
  public static questionStorage: QuestionStorage;
  public static imageStorage: QuizImageStorage;
  public static guildStorage: GuildStorage;
  public static discordBotService: DiscordBotService;
  public static quizManagerFactory: QuizManagerFactoryManager;
  public static rest: REST;
  public static oauth2Relay: OAuth2Relay;
  public static guildQuizConfigStorage: GuildQuizConfigStorage;
  public static soundboardStorage: SoundboardStorage;
  public static soundboardManager: SoundboardManager;

  private static _initialized = false;
  private static _initializePromise: Promise<Config> | null = null;

  private constructor() {
    /* Private constructor */
  }

  /**
   * Initializes all shared service instances. Safe to call multiple times;
   * only the first invocation performs actual initialization.
   *
   * All parameters are optional and default to production values read from
   * environment variables. Override them in tests to inject mocks.
   *
   * @param durableClient - Azure Durable Functions client (required for production quiz orchestration).
   * @param token - Discord bot token. Defaults to `DISCORD_BOT_TOKEN` env var.
   * @param clientId - Discord application client ID. Defaults to `DISCORD_CLIENT_ID` env var.
   * @param publicKey - Discord application public key. Defaults to `DISCORD_PUBLIC_KEY` env var.
   * @param questionStorage - Override for the question storage instance.
   * @param guildStorage - Override for the guild storage instance.
   * @param imageStorage - Override for the quiz image storage instance.
   * @param quizManagerFactory - Override for the quiz manager factory.
   * @param discordBotService - Override for the Discord bot service.
   * @param oauth2Relay - Override for the OAuth2 relay instance.
   * @param defaultQuizMethodFactory - Factory function that creates the default quiz manager.
   * @param guildQuizConfigStorage - Override for the guild quiz config storage instance.
   * @returns A promise that resolves to the Config singleton.
   */
  public static async initialize(
    durableClient?: DurableClient,
    token?: string,
    clientId?: string,
    publicKey?: string,
    questionStorage?: QuestionStorage,
    guildStorage?: GuildStorage,
    imageStorage?: QuizImageStorage,
    quizManagerFactory?: QuizManagerFactoryManager,
    discordBotService?: DiscordBotService,
    oauth2Relay?: OAuth2Relay,
    defaultQuizMethodFactory = () =>
      new DurableQuizManager(
        Config.rest,
        Config.questionStorage,
        durableClient ?? throwError("must have valid durable client"),
        Config.guildQuizConfigStorage,
      ),
    guildQuizConfigStorage?: GuildQuizConfigStorage,
  ): Promise<Config> {
    if (Config._initializePromise) {
      return Config._initializePromise;
    }

    Config._initializePromise = Config._doInitialize(
      durableClient,
      token,
      clientId,
      publicKey,
      questionStorage,
      guildStorage,
      imageStorage,
      quizManagerFactory,
      discordBotService,
      oauth2Relay,
      defaultQuizMethodFactory,
      guildQuizConfigStorage,
    ).catch((error: unknown) => {
      Config._initializePromise = null; // Reset the promise in case of error
      throw error;
    });

    return Config._initializePromise;
  }

  private static async _doInitialize(
    _durableClient: DurableClient | undefined,
    token: string | undefined,
    clientId: string | undefined,
    publicKey: string | undefined,
    questionStorage: QuestionStorage | undefined,
    guildStorage: GuildStorage | undefined,
    imageStorage: QuizImageStorage | undefined,
    quizManagerFactory: QuizManagerFactoryManager | undefined,
    discordBotService: DiscordBotService | undefined,
    oauth2Relay: OAuth2Relay | undefined,
    defaultQuizMethodFactory: () => DurableQuizManager,
    guildQuizConfigStorage: GuildQuizConfigStorage | undefined,
  ): Promise<Config> {
    if (Config._initialized) {
      return new Config();
    }

    Config.token = token ?? getEnvVarOrDefault("DISCORD_BOT_TOKEN");
    Config.rest = new REST({ version: "10" }).setToken(Config.token);
    Config.clientId = clientId ?? getEnvVarOrDefault("DISCORD_CLIENT_ID");
    Config.publicKey =
      publicKey ?? getEnvVarOrDefault("DISCORD_PUBLIC_KEY");

    Config.oauth2Relay =
      oauth2Relay ??
        new OAuth2Relay(
          getEnvVarOrDefault("DISCORD_CLIENT_ID"),
          getEnvVarOrDefault("DISCORD_CLIENT_SECRET"),
        );

    Config.imageStorage = imageStorage ?? new QuizImageStorage(getEnvVarOrDefault("AZURE_STORAGE_CONNECTION_STRING"));

    Config.questionStorage =
      questionStorage ?? new QuestionStorage(Config.imageStorage);
    Config.guildStorage = guildStorage ?? new GuildStorage(getEnvVarOrDefault("AZURE_STORAGE_CONNECTION_STRING"));
    Config.guildQuizConfigStorage = guildQuizConfigStorage ?? new GuildQuizConfigStorage(getEnvVarOrDefault("AZURE_STORAGE_CONNECTION_STRING"));
    Config.soundboardStorage = new SoundboardStorage(getEnvVarOrDefault("AZURE_STORAGE_CONNECTION_STRING"));
    Config.soundboardManager = new SoundboardManager(Config.soundboardStorage);
    Config.quizManagerFactory =
      quizManagerFactory ??
      new QuizManagerFactoryManager(defaultQuizMethodFactory);
    Config.discordBotService =
      discordBotService ??
      new DiscordBotService(
        Config.guildStorage,
        Config.quizManagerFactory,
        new CommandManager(
          Config.quizManagerFactory,
          Config.questionStorage,
          Config.clientId,
          Config.rest,
        ),
        Config.rest,
      );

    await Config.questionStorage.initialize();
    await Config.guildStorage.initialize();
    await Config.guildQuizConfigStorage.initialize();

    Config._initialized = true;
    return new Config();
  }
}

function getEnvVarOrDefault(varName: string): string {
  const value = process.env[varName];
  if (!value) {
    throwError(`Environment variable ${varName} is missing.`);
  }
  return value;
}