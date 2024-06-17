import {QuizManager} from "./quizManager";
import {CommandManager} from "./actions/commandManager";
import {REST} from "@discordjs/rest";
import {APIInteraction, InteractionResponseType} from "discord-api-types/v10";

export class DiscordBotService {
    private readonly rest: REST;
    private quizManagers: Map<string, Promise<QuizManager>>;
    private commandManager : CommandManager;

    constructor(private readonly token: string, private readonly clientId: string) {
        this.rest = new REST({ version: '10' }).setToken(this.token);
        this.quizManagers = new Map();
        this.commandManager = new CommandManager(this, this.clientId, this.rest);
    }

    public async start(guildId : string) {
        await this.commandManager.registerCommands(guildId);
    }

    public async getQuizManager(guildId: string) : Promise<QuizManager> {
        const manager = await this.quizManagers.getOrAdd(
            guildId,
            async () =>
            {
                const quizManager = new QuizManager(this.rest);
                return quizManager;
            });

        if (!manager) throw new Error();
        return manager;
    }

    public async handleInteraction(interaction: APIInteraction) {
        // Delegate interaction handling to the CommandManager
        const response = await this.commandManager.handleInteraction(interaction);

        if (!response) {
            // Handle cases where the CommandManager doesn't provide a response (e.g., unknown interaction type)
            console.warn("Unknown interaction type or no response from CommandManager.");
            return { type: InteractionResponseType.Pong }; // Or provide a more appropriate default response
        }

        return response;
    }
}