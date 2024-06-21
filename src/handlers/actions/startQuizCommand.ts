import { IDiscordCommand } from "./discordCommand";
import { DiscordBotService } from "../discordBotService";
import {
  APIChatInputApplicationCommandInteraction,
  APIInteractionResponse,
} from "discord-api-types/v10";
import {
  generateErrorResponse,
  generateOptionMissingErrorResponse,
  getOptionValue,
} from "../../util/interactionHelpers";
import {
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
} from "@discordjs/builders";

export class StartQuizCommand implements IDiscordCommand {
  constructor(private discordBotService: DiscordBotService) {}

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

      const quizManager = await this.discordBotService.getQuizManager(guildId);
      return await quizManager.startQuiz(interaction.channel.id, bankName);
    } catch (error) {
      return generateErrorResponse(error as Error);
    }
  }
}
