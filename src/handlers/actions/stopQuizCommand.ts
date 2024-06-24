import { IDiscordCommand } from "./discordCommand.interfaces.js";
import { DiscordBotService } from "../discordBotService.js";
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

export class StopQuizCommand implements IDiscordCommand {
  constructor(private discordBotService: DiscordBotService) {}

  data(): SlashCommandOptionsOnlyBuilder {
    return new SlashCommandBuilder()
      .setName(this.name)
      .setDescription("Stop the current quiz");
  }

  name = "stop_quiz";

  async execute(
    interaction: APIChatInputApplicationCommandInteraction,
  ): Promise<APIInteractionResponse> {
    try {
      const guildId = interaction.guild_id;

      if (!guildId) {
        return generateOptionMissingErrorResponse("guild id");
      }

      const quizManager = await this.discordBotService.getQuizManager(guildId);

      await quizManager.stopQuiz(guildId, interaction.channel.id);

      return createEphemeralResponse(`Stopped quiz`);
    } catch (error) {
      return generateErrorResponse(error as Error);
    }
  }
}
