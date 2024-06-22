import {DiscordBotService} from "../handlers/discordBotService";
import {QuestionStorage} from "../util/questionStorage";
import {GuildStorage} from "../util/guildStorage";
import {throwError} from "../util/errorHelpers";

export class Config {
    public static token: string;
    public static clientId: string;
    public static publicKey: string;
    public static questionStorage: QuestionStorage;
    public static guildStorage: GuildStorage;
    public static discordBotService: DiscordBotService;

    private static _initialized = false;
    private static _initializePromise: Promise<Config> | null = null;

    private constructor() { /* Private constructor */
    }

    public static async initialize(
        token?: string,
        clientId?: string,
        publicKey?: string,
        questionStorage?: QuestionStorage,
        guildStorage?: GuildStorage,
        discordBotService?: DiscordBotService
    ): Promise<Config> {
        if (Config._initializePromise) {
            return Config._initializePromise;
        }

        Config._initializePromise = new Promise<Config>(async (resolve, reject) => {
            try {
                if (Config._initialized) {
                    resolve(new Config()); // Return existing instance if already initialized
                    return;
                }

                Config.token = token ?? getEnvVarOrDefault('DISCORD_BOT_TOKEN');
                Config.clientId = clientId ?? getEnvVarOrDefault('DISCORD_CLIENT_ID');
                Config.publicKey = publicKey ?? getEnvVarOrDefault('DISCORD_PUBLIC_KEY');

                Config.questionStorage = questionStorage ?? new QuestionStorage();
                Config.guildStorage = guildStorage ?? new GuildStorage();
                Config.discordBotService = discordBotService ?? new DiscordBotService(
                    Config.token,
                    Config.clientId,
                    Config.guildStorage,
                    Config.questionStorage
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