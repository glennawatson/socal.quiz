import type { IDiscordCommand } from "./discordCommand.interfaces.js";
import {
  SlashCommandBuilder,
  type SlashCommandOptionsOnlyBuilder,
} from "@discordjs/builders";
import {
  type APIChatInputApplicationCommandInteraction,
  type APIInteractionResponse,
} from "discord-api-types/v10";
import {
  createEphemeralResponse,
  generateErrorResponse,
  generateOptionMissingErrorResponse,
} from "../../util/interactionHelpers.js";
import { QuizManagerFactoryManager } from "../quizManagerFactoryManager.js";

/** Handles the /stop_quiz slash command to end an active quiz session. */
export class StopQuizCommand implements IDiscordCommand {
  private readonly quizStateManager: QuizManagerFactoryManager;
  /**
   * @param quizStateManager - The factory manager for quiz instances.
   */
  constructor(quizStateManager: QuizManagerFactoryManager) {
    this.quizStateManager = quizStateManager;
  }

  /**
   * Returns the slash command definition for stopping a quiz.
   *
   * @returns The slash command builder.
   */
  public data(): SlashCommandOptionsOnlyBuilder {
    return new SlashCommandBuilder()
      .setName(this.name)
      .setDescription("Stop the current quiz");
  }

  public name = "stop_quiz";

  /**
   * Stops the active quiz in the current guild and channel.
   *
   * @param interaction - The incoming chat command interaction.
   * @returns A promise that resolves to an ephemeral interaction response.
   */
  public async execute(
    interaction: APIChatInputApplicationCommandInteraction,
  ): Promise<APIInteractionResponse> {
    try {
      const guildId = interaction.guild_id;

      if (!guildId) {
        return generateOptionMissingErrorResponse("guild id");
      }

      const quizManager = await this.quizStateManager.getQuizManager(guildId);

      await quizManager.stopQuiz(guildId, interaction.channel.id);

      return createEphemeralResponse(`Stopped quiz`);
    } catch (error) {
      return generateErrorResponse(error as Error);
    }
  }
}
