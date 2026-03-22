import { NextQuestionCommand } from "./nextQuestionCommand.js";
import { AddQuestionToBankCommand } from "./addQuestionToBankCommand.js";
import { DeleteQuestionFromBankCommand } from "./deleteQuestionFromBankCommand.js";
import { StopQuizCommand } from "./stopQuizCommand.js";
import { StartQuizCommand } from "./startQuizCommand.js";
import { DeleteQuestionBankCommand } from "./deleteQuestionBankCommand.js";
import type {
  IDiscordCommand,
  IModalHandlerCommand,
} from "./discordCommand.interfaces.js";
import {
  type APIInteraction,
  type APIInteractionResponse,
  type APIModalSubmitInteraction,
  InteractionResponseType,
  InteractionType,
  MessageFlags,
  Routes,
} from "discord-api-types/v10";
import { isChatInputApplicationCommandInteraction } from "discord-api-types/utils";
import { REST } from "@discordjs/rest";
import { createEphemeralResponse } from "../../util/interactionHelpers.js";
import { EditQuestionCommand } from "./editQuestionCommand.js";
import type { IQuestionStorage } from "../../util/IQuestionStorage.interfaces.js";
import { QuizManagerFactoryManager } from "../quizManagerFactoryManager.js";

export class CommandManager {
  private readonly commands: Map<string, IDiscordCommand>;

  private readonly quizStateManager: QuizManagerFactoryManager;
  private readonly questionStorage: IQuestionStorage;
  private readonly clientId: string;
  private readonly rest: REST;

  constructor(
    quizStateManager: QuizManagerFactoryManager,
    questionStorage: IQuestionStorage,
    clientId: string,
    rest: REST,
  ) {
    this.quizStateManager = quizStateManager;
    this.questionStorage = questionStorage;
    this.clientId = clientId;
    this.rest = rest;
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

  public async registerDefaultCommands(guildId: string): Promise<void> {
    this.registerCommand(new StartQuizCommand(this.quizStateManager));
    this.registerCommand(new StopQuizCommand(this.quizStateManager));
    this.registerCommand(new NextQuestionCommand(this.quizStateManager));
    this.registerCommand(new AddQuestionToBankCommand(this.questionStorage));
    this.registerCommand(
      new DeleteQuestionFromBankCommand(this.questionStorage),
    );
    this.registerCommand(new DeleteQuestionBankCommand(this.questionStorage));
    this.registerCommand(new EditQuestionCommand(this.questionStorage));
    await this.registerCommandsForGuild(guildId);
  }

  public async registerCommandsForGuild(guildId: string) {
    console.debug(
      `Sending registrations to the server for ${this.commands.size} commands.`,
    );
    const commandData = this.commands.values()
      .map((command) => {
        if (command && typeof command.data === "function") {
          return command.data().toJSON();
        } else {
          console.error("Invalid command:", command);
          return null;
        }
      })
      .filter((data) => data !== null)
      .toArray();

    try {
      console.log("Started refreshing application (/) commands.");
      await this.rest.post(
        Routes.applicationGuildCommands(this.clientId, guildId),
        { body: commandData },
      );
      console.log("Successfully reloaded application (/) commands.");
    } catch (error) {
      console.error(error);
    }
  }

  public registerCommand(command: IDiscordCommand) {
    this.commands.set(command.name, command);
  }
}
