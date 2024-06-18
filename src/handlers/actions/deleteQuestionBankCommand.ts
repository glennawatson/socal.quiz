import { IDiscordCommand } from "./discordCommand";
import {
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
} from "@discordjs/builders";
import {
  APIChatInputApplicationCommandInteraction,
  APIInteractionResponse,
} from "discord-api-types/v10";
import { deleteQuestionBank } from "../../util/questionStorage";
import {
  createEphemeralResponse,
  generateErrorResponse,
  generateOptionMissingErrorResponse,
} from "../../util/interactionHelpers";

export class DeleteQuestionBankCommand implements IDiscordCommand {
  public data(): SlashCommandOptionsOnlyBuilder {
    return new SlashCommandBuilder()
      .setName(this.name)
      .setDescription("Delete a question bank")
      .addStringOption((option) =>
        option
          .setName("questionbankname")
          .setDescription("The name of the question bank")
          .setRequired(true),
      );
  }

  public name = "deleteQuestionBank";

  public async execute(
    interaction: APIChatInputApplicationCommandInteraction,
  ): Promise<APIInteractionResponse> {
    try {
      const bankName =
        interaction.data.options?.getStringOption("questionbankname");

      if (!bankName) {
        return generateOptionMissingErrorResponse("name of the question bank");
      }

      await deleteQuestionBank(bankName);

      return createEphemeralResponse(`Deleted question bank: ${bankName}`);
    } catch (error) {
      return generateErrorResponse(error as Error);
    }
  }
}