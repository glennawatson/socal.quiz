import {
  APIChatInputApplicationCommandInteraction,
  APIInteractionResponse,
  APIModalSubmitInteraction,
} from "discord-api-types/v10";
import { SlashCommandOptionsOnlyBuilder } from "@discordjs/builders";

export interface IDiscordCommand {
  data(): SlashCommandOptionsOnlyBuilder;

  execute(
    interaction: APIChatInputApplicationCommandInteraction,
  ): Promise<APIInteractionResponse>;

  readonly name: string; // Symbol property (optional)
}

export interface IModalHandlerCommand extends IDiscordCommand {
  handleModalSubmit(
    interaction: APIModalSubmitInteraction,
  ): Promise<APIInteractionResponse>; // Handles modal submission
}

export function isIDiscordCommand(command: any): command is IDiscordCommand {
  return (command as IDiscordCommand).data !== undefined;
}
