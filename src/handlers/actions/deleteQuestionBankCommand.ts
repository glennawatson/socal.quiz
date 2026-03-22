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

/** Handles the /delete_question_bank slash command to remove an entire question bank. */
export class DeleteQuestionBankCommand implements IDiscordCommand {
  private readonly questionStorage: IQuestionStorage;
  /**
   * @param questionStorage - The storage interface for managing questions.
   */
  constructor(questionStorage: IQuestionStorage) {
    this.questionStorage = questionStorage;
  }

  /**
   * Returns the slash command definition including the bankname option.
   *
   * @returns The slash command builder.
   */
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

  /**
   * Deletes the specified question bank from storage for the current guild.
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
