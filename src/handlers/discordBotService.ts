import { CommandManager } from "./actions/commandManager.js";
import { APIInteraction, InteractionType } from "discord-api-types/v10";
import {
  createEphemeralResponse,
  generateErrorResponse,
} from "../util/interactionHelpers.js";
import { GuildStorage } from "../util/guildStorage.js";
import "../util/mapExtensions.js";
import { throwError } from "../util/errorHelpers.js";
import { QuizManagerFactoryManager } from "./quizManagerFactoryManager.js";

export class DiscordBotService {
  private commandManager: CommandManager;

  constructor(
    private readonly guildStorage: GuildStorage,
    private readonly quizManager: QuizManagerFactoryManager,
    commandManager: CommandManager,
  ) {
    this.commandManager =
      commandManager ?? throwError("could not find a valid command manager");
  }

  public async start(guildId: string) {
    await this.commandManager.registerDefaultCommands(guildId);
    await this.guildStorage.markGuildAsRegistered(guildId);
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
        const quizManager = await this.quizManager.getQuizManager(
          interaction.guild_id,
        );
        var result = await quizManager.handleAnswerInteraction(interaction);
        return result;
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
