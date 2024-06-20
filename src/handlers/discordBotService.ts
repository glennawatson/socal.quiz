import {QuizManager} from "./quizManager";
import {CommandManager} from "./actions/commandManager";
import {REST} from "@discordjs/rest";
import {APIInteraction, InteractionType} from "discord-api-types/v10";
import {createEphemeralResponse, generateErrorResponse,} from "../util/interactionHelpers";
import {GuildStorage} from "../util/guildStorage";
import {QuestionStorage} from "../util/questionStorage";
import "../util/mapExtensions";

export class DiscordBotService {
    private quizManagers: Map<string, Promise<QuizManager>>;
    private commandManager: CommandManager;
    private readonly rest: REST;

    constructor(
        private readonly token: string,
        private readonly clientId: string,
        private readonly guildStorage: GuildStorage,
        private readonly questionStorage: QuestionStorage,
        rest?: REST,
        commandManager?: CommandManager
    ) {
        this.rest = rest ?? new REST({version: "10"}).setToken(this.token);
        this.quizManagers = new Map();
        this.commandManager = commandManager ?? new CommandManager(
            this,
            this.questionStorage,
            this.clientId,
            this.rest,
        );
    }

    public async start(guildId: string) {
        await this.commandManager.registerDefaultCommands(guildId);
        await this.guildStorage.markGuildAsRegistered(guildId);
    }

    public async getQuizManager(guildId: string): Promise<QuizManager> {
        const manager = await this.quizManagers.getOrAdd(
            guildId,
            async () => new QuizManager(this.rest, this.questionStorage),
        );

        if (!manager)
            throw new Error(`could not find a quiz manager for guild ${guildId}`);
        return manager;
    }

    public async handleInteraction(interaction: APIInteraction) {
        try {
            if (!interaction.guild_id) {
                return createEphemeralResponse(
                    "This interaction must be performed within a guild.",
                );
            }

            // Register commands for the guild if not already registered
            const isRegistered = await this.guildStorage.isGuildRegistered(
                interaction.guild_id,
            );
            if (!isRegistered) {
                await this.start(interaction.guild_id);
            }

            // Check if the interaction is an answer interaction
            if (
                interaction.type === InteractionType.MessageComponent &&
                interaction.data.custom_id.startsWith("answer_")
            ) {
                const quizManager = await this.getQuizManager(interaction.guild_id);
                return await quizManager.handleAnswer(interaction);
            }

            // Delegate interaction handling to the CommandManager
            const response = await this.commandManager.handleInteraction(interaction);

            if (!response) {
                // Handle cases where the CommandManager doesn't provide a response (e.g., unknown interaction type)
                console.warn(
                    "Unknown interaction type or no response from CommandManager.",
                );
                return createEphemeralResponse("Unknown command or interaction type.");
            }

            return response;
        } catch (error) {
            return generateErrorResponse(error as Error);
        }
    }
}
