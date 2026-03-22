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

/** Handles the /next_question slash command to manually advance to the next quiz question. */
export class NextQuestionCommand implements IDiscordCommand {
  private readonly quizStateManager: QuizManagerFactoryManager;
  /**
   * @param quizStateManager - The factory manager for quiz instances.
   */
  constructor(quizStateManager: QuizManagerFactoryManager) {
    this.quizStateManager = quizStateManager;
  }

  /**
   * Returns the slash command definition for advancing to the next question.
   *
   * @returns The slash command builder.
   */
  public data(): SlashCommandOptionsOnlyBuilder {
    return new SlashCommandBuilder()
      .setName(this.name)
      .setDescription("Show the next quiz question");
  }

  public name = "next_question";

  /**
   * Advances to the next question in the active quiz session for the current guild.
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

      await quizManager.nextQuizQuestion(guildId, interaction.channel.id);

      return createEphemeralResponse("Showing next question.");
    } catch (error) {
      return generateErrorResponse(error as Error);
    }
  }
}
