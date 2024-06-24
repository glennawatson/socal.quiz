import {DiscordBotService} from "../handlers/discordBotService.js";
import {QuestionStorage} from "./questionStorage.js";
import {GuildStorage} from "./guildStorage.js";
import {throwError} from "./errorHelpers.js";
import {StateManager} from "./stateManager.js";
import {DurableQuizManager} from "../handlers/quizManager.js";
import {REST} from "@discordjs/rest";
import {DurableClient} from "durable-functions";
import {CommandManager} from "../handlers/actions/commandManager.js";

/* eslint-disable @typescript-eslint/no-extraneous-class */
export class Config {
    public static token: string;
    public static clientId: string;
    public static publicKey: string;
    public static questionStorage: QuestionStorage;
    public static guildStorage: GuildStorage;
    public static discordBotService: DiscordBotService;
    public static stateManager: StateManager;

    private static _initialized = false;
    private static _initializePromise: Promise<Config> | null = null;

    private constructor() {
        /* Private constructor */
    }

    public static async initialize(
        client: DurableClient,
        token?: string,
        clientId?: string,
        publicKey?: string,
        questionStorage?: QuestionStorage,
        guildStorage?: GuildStorage,
        stateManager?: StateManager,
        discordBotService?: DiscordBotService): Promise<Config> {
        if (Config._initializePromise) {
            return Config._initializePromise;
        }

        Config._initializePromise = new Promise<Config>((resolve, reject) => {
            try {
                if (Config._initialized) {
                    resolve(new Config()); // Return existing instance if already initialized
                    return;
                }

                var rest = new REST({version: "10"}).setToken(this.token);
                Config.token = token ?? getEnvVarOrDefault("DISCORD_BOT_TOKEN");
                Config.clientId = clientId ?? getEnvVarOrDefault("DISCORD_CLIENT_ID");
                Config.publicKey =
                    publicKey ?? getEnvVarOrDefault("DISCORD_PUBLIC_KEY");

                Config.questionStorage = questionStorage ?? new QuestionStorage();
                Config.guildStorage = guildStorage ?? new GuildStorage();
                Config.stateManager = stateManager ?? new StateManager();
                Config.discordBotService =
                    discordBotService ??
                    new DiscordBotService(
                        Config.guildStorage,
                        () => new DurableQuizManager(rest, Config.questionStorage, Config.stateManager, client),
                        new CommandManager(),
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
