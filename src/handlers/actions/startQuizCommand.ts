import type { IDiscordCommand } from "./discordCommand.interfaces.js";
import {
  type APIChatInputApplicationCommandInteraction,
  type APIInteractionResponse,
} from "discord-api-types/v10";
import {
  generateErrorResponse,
  generateOptionMissingErrorResponse,
  getOptionValue,
} from "../../util/interactionHelpers.js";
import {
  SlashCommandBuilder,
  type SlashCommandOptionsOnlyBuilder,
} from "@discordjs/builders";
import { QuizManagerFactoryManager } from "../quizManagerFactoryManager.js";
import type { QuizAdvanceMode } from "../../quizConfig.interfaces.js";

/** Handles the /start_quiz slash command to begin a quiz session in a Discord channel. */
export class StartQuizCommand implements IDiscordCommand {
  private readonly quizStateManager: QuizManagerFactoryManager;
  /**
   * @param quizStateManager - The factory manager for quiz instances.
   */
  constructor(quizStateManager: QuizManagerFactoryManager) {
    this.quizStateManager = quizStateManager;
  }

  /**
   * Returns the slash command definition including bankname and mode options.
   *
   * @returns The slash command builder.
   */
  public data(): SlashCommandOptionsOnlyBuilder {
    return new SlashCommandBuilder()
      .setName(this.name)
      .setDescription("Start a quiz")
      .addStringOption((option) =>
        option
          .setName("bankname")
          .setDescription("The name of the question bank")
          .setRequired(true),
      )
      .addStringOption((option) =>
        option
          .setName("mode")
          .setDescription("Quiz advance mode")
          .addChoices(
            { name: "Auto", value: "auto" },
            { name: "Manual", value: "manual" },
          )
          .setRequired(false),
      );
  }

  public name = "start_quiz";

  /**
   * Starts a quiz session using the specified question bank and optional advance mode.
   *
   * @param interaction - The incoming chat command interaction.
   * @returns A promise that resolves to an interaction response.
   */
  public async execute(
    interaction: APIChatInputApplicationCommandInteraction,
  ): Promise<APIInteractionResponse> {
    try {
      const guildId = interaction.guild_id;

      if (!guildId) {
        return generateOptionMissingErrorResponse("guild_id");
      }

      const bankName = getOptionValue(interaction.data.options, "bankname");

      if (!bankName) {
        return generateOptionMissingErrorResponse("bankname");
      }

      const mode = getOptionValue(interaction.data.options, "mode") as
        | QuizAdvanceMode
        | undefined;

      const quizManager = await this.quizStateManager.getQuizManager(guildId);
      return await quizManager.startQuiz(
        guildId,
        interaction.channel.id,
        bankName,
        mode,
      );
    } catch (error) {
      return generateErrorResponse(error as Error);
    }
  }
}
