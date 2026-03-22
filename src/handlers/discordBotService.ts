import { CommandManager } from "./actions/commandManager.js";
import {
  type APIInteraction,
  type APIRole,
  InteractionType,
  Routes,
} from "discord-api-types/v10";
import {
  createEphemeralResponse,
  generateErrorResponse,
} from "../util/interactionHelpers.js";
import { GuildStorage } from "../util/guildStorage.js";
import "../util/mapExtensions.js";
import { throwError } from "../util/errorHelpers.js";
import { QuizManagerFactoryManager } from "./quizManagerFactoryManager.js";
import { REST } from "@discordjs/rest";

export const QUIZ_ADMIN_ROLE_NAME = "QuizAdmin";
const QUIZ_ADMIN_ROLE_COLOR = 0x2ecc71; // Green

export class DiscordBotService {
  private commandManager: CommandManager;

  private readonly guildStorage: GuildStorage;
  private readonly quizManager: QuizManagerFactoryManager;
  private readonly rest: REST;

  constructor(
    guildStorage: GuildStorage,
    quizManager: QuizManagerFactoryManager,
    commandManager: CommandManager,
    rest: REST,
  ) {
    this.guildStorage = guildStorage;
    this.quizManager = quizManager;
    this.rest = rest;
    this.commandManager =
      commandManager ?? throwError("could not find a valid command manager");
  }

  public async start(guildId: string) {
    await this.commandManager.registerDefaultCommands(guildId);
    await this.ensureQuizAdminRole(guildId);
    await this.guildStorage.markGuildAsRegistered(guildId);
  }

  private async ensureQuizAdminRole(guildId: string): Promise<void> {
    try {
      const roles = await this.rest.get(Routes.guildRoles(guildId)) as APIRole[];
      const existing = roles.find(r => r.name === QUIZ_ADMIN_ROLE_NAME);
      if (existing) {
        this.commandManager.setQuizAdminRoleId(existing.id);
        return;
      }

      const newRole = await this.rest.post(Routes.guildRoles(guildId), {
        body: {
          name: QUIZ_ADMIN_ROLE_NAME,
          color: QUIZ_ADMIN_ROLE_COLOR,
          permissions: "0",
          mentionable: false,
          hoist: false,
        },
      }) as APIRole;
      this.commandManager.setQuizAdminRoleId(newRole.id);
      console.log(`Created ${QUIZ_ADMIN_ROLE_NAME} role in guild ${guildId}`);
    } catch (error) {
      console.error(`Failed to create ${QUIZ_ADMIN_ROLE_NAME} role: ${error}`);
    }
  }

  public async handleInteraction(interaction: APIInteraction) {
    try {
      if (!interaction.guild_id) {
        return createEphemeralResponse(
          "This interaction must be performed within a guild.",
        );
      }

      // Register commands for the guild if not already registered
      const isRegistered = await this.guildStorage.isGuildRegistered(
        interaction.guild_id,
      );
      if (!isRegistered) {
        await this.start(interaction.guild_id);
      }

      // Check if the interaction is an answer interaction
      if (
        interaction.type === InteractionType.MessageComponent &&
        interaction.data.custom_id.startsWith("answer_")
      ) {
        const quizManager = await this.quizManager.getQuizManager(
          interaction.guild_id,
        );
        const result = await quizManager.handleAnswerInteraction(interaction);
        return result;
      }

      // Delegate interaction handling to the CommandManager
      const response = await this.commandManager.handleInteraction(interaction);

      if (!response) {
        // Handle cases where the CommandManager doesn't provide a response (e.g., unknown interaction type)
        console.warn(
          "Unknown interaction type or no response from CommandManager.",
        );
        return createEphemeralResponse("Unknown command or interaction type.");
      }

      return response;
    } catch (error) {
      return generateErrorResponse(error as Error);
    }
  }
}
