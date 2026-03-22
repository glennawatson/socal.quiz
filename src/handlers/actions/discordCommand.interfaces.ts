import type {
  APIChatInputApplicationCommandInteraction,
  APIApplicationCommandAutocompleteInteraction,
  APIInteractionResponse,
  APICommandAutocompleteInteractionResponseCallbackData,
  APIModalSubmitInteraction,
} from "discord-api-types/v10";
import type { SlashCommandOptionsOnlyBuilder } from "@discordjs/builders";

export interface IDiscordCommand {
  data(): SlashCommandOptionsOnlyBuilder;

  execute(
    interaction: APIChatInputApplicationCommandInteraction,
  ): Promise<APIInteractionResponse>;

  /** Optional handler for autocomplete interactions on this command's options. */
  handleAutocomplete?(
    interaction: APIApplicationCommandAutocompleteInteraction,
  ): Promise<APICommandAutocompleteInteractionResponseCallbackData>;

  readonly name: string; // Symbol property (optional)
}

export interface IModalHandlerCommand extends IDiscordCommand {
  handleModalSubmit(
    interaction: APIModalSubmitInteraction,
  ): Promise<APIInteractionResponse>; // Handles modal submission
}
