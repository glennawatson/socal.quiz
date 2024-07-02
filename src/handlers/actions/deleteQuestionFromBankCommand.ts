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

export class DeleteQuestionFromBankCommand implements IDiscordCommand {
  constructor(private readonly questionStorage: IQuestionStorage) {}

  data(): SlashCommandOptionsOnlyBuilder {
    return new SlashCommandBuilder()
      .setName(this.name)
      .setDescription("Delete a question from a question bank")
      .addStringOption((option) =>
        option
          .setName("bankname")
          .setDescription("The name of the question bank")
          .setRequired(true),
      )
      .addStringOption((option) =>
        option
          .setName("questionid")
          .setDescription("The ID of the question")
          .setRequired(true),
      );
  }

  name = "delete_question_from_bank";

  async execute(
    interaction: APIChatInputApplicationCommandInteraction,
  ): Promise<APIInteractionResponse> {
    try {
      const guildId = interaction.guild_id;

      if (!guildId) {
        return createEphemeralResponse("Must have a valid guild id.");
      }

      const bankName = getOptionValue(interaction.data.options, "bankname");
      const questionId = getOptionValue(interaction.data.options, "questionid");

      // ... inside your execute method ...
      if (!bankName) {
        return generateOptionMissingErrorResponse("bankname");
      }

      if (!questionId) {
        return generateOptionMissingErrorResponse("questionid");
      }

      await this.questionStorage.deleteQuestion(guildId, bankName, questionId);

      return createEphemeralResponse(
        `Deleted question: ${questionId} from ${bankName}`,
      );
    } catch (error) {
      return generateErrorResponse(error as Error);
    }
  }
}
