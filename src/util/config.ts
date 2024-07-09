import { DiscordBotService } from "../handlers/discordBotService.js";
import { QuestionStorage } from "./questionStorage.js";
import { GuildStorage } from "./guildStorage.js";
import { throwError } from "./errorHelpers.js";
import { StateManager } from "../handlers/stateManager.js";
import { REST } from "@discordjs/rest";
import { DurableClient } from "durable-functions";
import { CommandManager } from "../handlers/actions/commandManager.js";
import { QuizImageStorage } from "./quizImageStorage.js";
import { DurableQuizManager } from "../handlers/durableQuizManager.js";
import { QuizManagerFactoryManager } from "../handlers/quizManagerFactoryManager.js";
import { OAuth2Relay } from "./oauth2Relay.js";

export class Config {
  public static token: string;
  public static clientId: string;
  public static publicKey: string;
  public static questionStorage: QuestionStorage;
  public static imageStorage: QuizImageStorage;
  public static guildStorage: GuildStorage;
  public static discordBotService: DiscordBotService;
  public static stateManager: StateManager;
  public static quizManagerFactory: QuizManagerFactoryManager;
  public static rest: REST;
  public static oauth2Relay: OAuth2Relay;

  private static _initialized = false;
  private static _initializePromise: Promise<Config> | null = null;

  private constructor() {
    /* Private constructor */
  }

  public static async initialize(
    durableClient?: DurableClient,
    token?: string,
    clientId?: string,
    publicKey?: string,
    questionStorage?: QuestionStorage,
    guildStorage?: GuildStorage,
    imageStorage?: QuizImageStorage,
    stateManager?: StateManager,
    quizManagerFactory?: QuizManagerFactoryManager,
    discordBotService?: DiscordBotService,
    oauth2Relay?: OAuth2Relay,
    defaultQuizMethodFactory = () =>
      new DurableQuizManager(
        Config.rest,
        Config.questionStorage,
        durableClient ?? throwError("must have valid durable client"),
      ),
  ): Promise<Config> {
    if (Config._initializePromise) {
      return Config._initializePromise;
    }

    Config._initializePromise = new Promise<Config>((resolve, reject) => {
      try {
        if (Config._initialized) {
          resolve(new Config()); // Return existing instance if already initialized
          return;
        }

        Config.rest = new REST({ version: "10" }).setToken(this.token);
        Config.token = token ?? getEnvVarOrDefault("DISCORD_BOT_TOKEN");
        Config.clientId = clientId ?? getEnvVarOrDefault("DISCORD_CLIENT_ID");
        Config.publicKey =
          publicKey ?? getEnvVarOrDefault("DISCORD_PUBLIC_KEY");

        Config.oauth2Relay =
          oauth2Relay ??
            new OAuth2Relay(
              getEnvVarOrDefault("DISCORD_CLIENT_ID"),
              getEnvVarOrDefault("DISCORD_CLIENT_SECRET"),
              getEnvVarOrDefaultValue("OAUTH_REDIRECT", "https://localhost:5001/authentication/login-callback"),
            );

        Config.imageStorage = imageStorage ?? new QuizImageStorage(getEnvVarOrDefault("AZURE_STORAGE_CONNECTION_STRING"));

        Config.questionStorage =
          questionStorage ?? new QuestionStorage(Config.imageStorage);
        Config.guildStorage = guildStorage ?? new GuildStorage(getEnvVarOrDefault("AZURE_STORAGE_CONNECTION_STRING"));
        Config.stateManager = stateManager ?? new StateManager();
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
          );

        Config._initialized = true;
        resolve(new Config()); // Resolve with the Config instance
      } catch (error) {
        Config._initializePromise = null; // Reset the promise in case of error
        reject(error); // Reject the promise if initialization fails
      }
    });

    return Config._initializePromise;
  }
}

function getEnvVarOrDefault(varName: string): string {
  const value = process.env[varName];
  if (!value) {
    throwError(`Environment variable ${varName} is missing.`);
  }
  return value;
}

function getEnvVarOrDefaultValue(varName: string, defaultValue: string): string {
  const value = process.env[varName];
  if (!value) {
    return defaultValue;
  }

  return value;
}
