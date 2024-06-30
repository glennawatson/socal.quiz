import { IDiscordCommand } from "./discordCommand.interfaces.js";
import {
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
} from "@discordjs/builders";
import {
  APIChatInputApplicationCommandInteraction,
  APIInteractionResponse,
} from "discord-api-types/v10";
import {
  createEphemeralResponse,
  generateErrorResponse,
  generateOptionMissingErrorResponse,
} from "../../util/interactionHelpers.js";
import {QuizManagerFactoryManager} from "../quizManagerFactoryManager.js";

export class NextQuestionCommand implements IDiscordCommand {
  constructor(private readonly quizStateManager: QuizManagerFactoryManager) {}

  data(): SlashCommandOptionsOnlyBuilder {
    return new SlashCommandBuilder()
      .setName(this.name)
      .setDescription("Show the next quiz question");
  }

  name = "next_question";

  async execute(
    interaction: APIChatInputApplicationCommandInteraction,
  ): Promise<APIInteractionResponse> {
    try {
      const guildId = interaction.guild_id;

      if (!guildId) {
        return generateOptionMissingErrorResponse("guild id");
      }

      const quizManager = await this.quizStateManager.getQuizManager(guildId);

      if (!quizManager) {
        return generateOptionMissingErrorResponse("invalid quiz manager");
      }

      await quizManager.nextQuizQuestion(guildId, interaction.channel.id);

      return createEphemeralResponse("Showing next question.");
    } catch (error) {
      return generateErrorResponse(error as Error);
    }
  }
}
