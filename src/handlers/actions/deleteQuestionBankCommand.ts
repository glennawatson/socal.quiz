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
  getOptionValue,
} from "../../util/interactionHelpers.js";

import { IQuestionStorage } from "../../util/IQuestionStorage.interfaces.js";

export class DeleteQuestionBankCommand implements IDiscordCommand {
  constructor(private readonly questionStorage: IQuestionStorage) {}

  public data(): SlashCommandOptionsOnlyBuilder {
    return new SlashCommandBuilder()
      .setName(this.name)
      .setDescription("Delete a question bank")
      .addStringOption((option) =>
        option
          .setName("bankname")
          .setDescription("The name of the question bank")
          .setRequired(true),
      );
  }

  public name = "delete_question_bank";

  public async execute(
    interaction: APIChatInputApplicationCommandInteraction,
  ): Promise<APIInteractionResponse> {
    try {
      const guildId = interaction.guild_id;

      if (!guildId) {
        return createEphemeralResponse("Must have a valid guild id.");
      }

      const bankName = getOptionValue(interaction.data.options, "bankname");

      if (!bankName) {
        return generateOptionMissingErrorResponse("bankname");
      }

      await this.questionStorage.deleteQuestionBank(guildId, bankName);

      return createEphemeralResponse(`Deleted question bank: ${bankName}`);
    } catch (error) {
      return generateErrorResponse(error as Error);
    }
  }
}
