import { NextQuestionCommand } from "./nextQuestionCommand";
import { AddQuestionToBankCommand } from "./addQuestionToBankCommand";
import { DeleteQuestionFromBankCommand } from "./deleteQuestionFromBankCommand";
import { StopQuizCommand } from "./stopQuizCommand";
import { StartQuizCommand } from "./startQuizCommand";
import { DeleteQuestionBankCommand } from "./deleteQuestionBankCommand";
import { IDiscordCommand, IModalHandlerCommand } from "./discordCommand";
import { DiscordBotService } from "../discordBotService";
import {
  APIInteraction,
  APIInteractionResponse,
  APIModalSubmitInteraction,
  InteractionResponseType,
  InteractionType,
  MessageFlags,
  Routes,
} from "discord-api-types/v10";
import { isChatInputApplicationCommandInteraction } from "discord-api-types/utils";
import { REST } from "@discordjs/rest";
import { createEphemeralResponse } from "../../util/interactionHelpers";

export class CommandManager {
  private readonly commands: Map<string, IDiscordCommand>;

  constructor(
    private botService: DiscordBotService,
    private clientId: string,
    private rest: REST,
  ) {
    this.commands = new Map();
  }

  public async handleInteraction(
    interaction: APIInteraction,
  ): Promise<APIInteractionResponse | null> {
    if (interaction.type == InteractionType.ModalSubmit) {
      const command = this.commands.get(interaction.data.custom_id);

      if (!command) {
        return createEphemeralResponse(
          "could not find modal: " + interaction.data.custom_id,
        );
      }

      return await (command as IModalHandlerCommand).handleModalSubmit(
        interaction as APIModalSubmitInteraction,
      );
    } else if (
      interaction.type == InteractionType.ApplicationCommand &&
      isChatInputApplicationCommandInteraction(interaction)
    ) {
      const command = this.commands.get(interaction.data.name);

      if (!command) {
        return createEphemeralResponse(
          "could not find command: " + interaction.data.name,
        );
      }

      return await command.execute(interaction);
    } else {
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: "Unknown command!",
          flags: MessageFlags.Ephemeral,
        },
      };
    }
  }

  public async registerCommands(guildId: string): Promise<void> {
    this.registerCommand(new StartQuizCommand(this.botService));
    this.registerCommand(new StopQuizCommand(this.botService));
    this.registerCommand(new NextQuestionCommand(this.botService));
    this.registerCommand(new AddQuestionToBankCommand());
    this.registerCommand(new DeleteQuestionFromBankCommand());
    this.registerCommand(new DeleteQuestionBankCommand());

    const commandData = Object.values(this.commands).map((command) =>
      command.data().toJSON(),
    );
    try {
      console.log("Started refreshing application (/) commands.");
      await this.rest.put(
        Routes.applicationGuildCommands(this.clientId, guildId),
        { body: commandData },
      );
      console.log("Successfully reloaded application (/) commands.");
    } catch (error) {
      console.error(error);
    }
  }

  private registerCommand(command: IDiscordCommand) {
    this.commands.set(command.name, command);
  }
}
