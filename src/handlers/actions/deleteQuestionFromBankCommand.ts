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
  getOptionValue,
} from "../../util/interactionHelpers.js";

import type { IQuestionStorage } from "../../util/IQuestionStorage.interfaces.js";

/** Handles the /delete_question_from_bank slash command to remove a single question from a bank. */
export class DeleteQuestionFromBankCommand implements IDiscordCommand {
  private readonly questionStorage: IQuestionStorage;
  /**
   * @param questionStorage - The storage interface for managing questions.
   */
  constructor(questionStorage: IQuestionStorage) {
    this.questionStorage = questionStorage;
  }

  /**
   * Returns the slash command definition including bankname and questionid options.
   *
   * @returns The slash command builder.
   */
  public data(): SlashCommandOptionsOnlyBuilder {
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

  public name = "delete_question_from_bank";

  /**
   * Removes the specified question from the given bank and persists the updated bank.
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
        return createEphemeralResponse("Must have a valid guild id.");
      }

      const bankName = getOptionValue(interaction.data.options, "bankname");
      const questionId = getOptionValue(interaction.data.options, "questionid");

      if (!bankName) {
        return generateOptionMissingErrorResponse("bankname");
      }

      if (!questionId) {
        return generateOptionMissingErrorResponse("questionid");
      }

      const questionBank = await this.questionStorage.getQuestionBank(guildId, bankName);

      // Deletes the matching question from the array
      questionBank.questions = questionBank.questions.filter(q => q.questionId !== questionId);

      // Upsert the updated question bank
      await this.questionStorage.upsertQuestionBank(questionBank);

      return createEphemeralResponse(
        `Deleted question: ${questionId} from ${bankName}`,
      );
    } catch (error) {
      return generateErrorResponse(error as Error);
    }
  }
}
