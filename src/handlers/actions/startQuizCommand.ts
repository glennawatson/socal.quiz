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

export class StartQuizCommand implements IDiscordCommand {
  private readonly quizStateManager: QuizManagerFactoryManager;
  constructor(quizStateManager: QuizManagerFactoryManager) {
    this.quizStateManager = quizStateManager;
  }

  public data(): SlashCommandOptionsOnlyBuilder {
    return new SlashCommandBuilder()
      .setName(this.name)
      .setDescription("Start a quiz")
      .addStringOption((option) =>
        option
          .setName("bankname")
          .setDescription("The name of the question bank")
          .setRequired(true),
      );
  }

  public name = "start_quiz";

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

      const quizManager = await this.quizStateManager.getQuizManager(guildId);
      return await quizManager.startQuiz(
        guildId,
        interaction.channel.id,
        bankName,
      );
    } catch (error) {
      return generateErrorResponse(error as Error);
    }
  }
}
