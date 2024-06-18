import { IDiscordCommand } from "./discordCommand";
import { DiscordBotService } from "../discordBotService";
import {
  APIChatInputApplicationCommandInteraction,
  APIInteractionResponse,
} from "discord-api-types/v10";
import {
  createEphemeralResponse,
  generateErrorResponse,
  generateOptionMissingErrorResponse,
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

  public name = "startquiz";

  public async execute(
    interaction: APIChatInputApplicationCommandInteraction,
  ): Promise<APIInteractionResponse> {
    try {
      const guildId = interaction.guild_id;

      if (!guildId) {
        return generateOptionMissingErrorResponse("guild id");
      }

      const bankName = interaction.data.options?.getStringOption("bankname");

      if (!bankName) {
        return generateOptionMissingErrorResponse("name of the question bank");
      }

      const quizManager = await this.discordBotService.getQuizManager(guildId);
      await quizManager.startQuiz(interaction.channel.id, bankName);
      return createEphemeralResponse(
        `Started quiz with question bank: ${bankName}`,
      );
    } catch (error) {
      return generateErrorResponse(error as Error);
    }
  }
}
