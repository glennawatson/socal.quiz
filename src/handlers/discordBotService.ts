import { CommandManager } from "./actions/commandManager.js";
import {
  type APIInteraction,
  type APIInteractionResponse,
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
import { QuizManagerFactoryManager } from "./quizManagerFactoryManager.js";
import { REST } from "@discordjs/rest";

export const QUIZ_ADMIN_ROLE_NAME = "QuizAdmin";
const QUIZ_ADMIN_ROLE_COLOR = 0x2ecc71; // Green

/**
 * Top-level service that bootstraps a guild (registers commands, creates roles)
 * and routes incoming Discord interactions to the appropriate handler.
 */
export class DiscordBotService {
  private commandManager: CommandManager;

  private readonly guildStorage: GuildStorage;
  private readonly quizManager: QuizManagerFactoryManager;
  private readonly rest: REST;

  /**
   * @param guildStorage - The storage interface for guild registration data.
   * @param quizManager - The factory manager for quiz instances.
   * @param commandManager - The command manager for handling Discord commands.
   * @param rest - The Discord REST client.
   */
  constructor(
    guildStorage: GuildStorage,
    quizManager: QuizManagerFactoryManager,
    commandManager: CommandManager,
    rest: REST,
  ) {
    this.guildStorage = guildStorage;
    this.quizManager = quizManager;
    this.rest = rest;
    this.commandManager = commandManager;
  }

  /**
   * Registers slash commands, creates the QuizAdmin role, and marks the guild as registered.
   *
   * @param guildId - The ID of the guild to initialize.
   * @returns A promise that resolves when initialization is complete.
   */
  public async start(guildId: string): Promise<void> {
    await this.commandManager.registerDefaultCommands(guildId);
    await this.ensureQuizAdminRole(guildId);
    await this.guildStorage.markGuildAsRegistered(guildId);
  }

  /**
   * Finds or creates the QuizAdmin role in the guild and records its ID on the command manager.
   *
   * @param guildId - The ID of the guild.
   * @returns A promise that resolves when the role is ensured.
   */
  private async ensureQuizAdminRole(guildId: string): Promise<void> {
    try {
      const roles = await this.rest.get(Routes.guildRoles(guildId)) as APIRole[];
      const existing: APIRole | undefined = roles.find(r => r.name === QUIZ_ADMIN_ROLE_NAME);
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
      console.error(`Failed to create ${QUIZ_ADMIN_ROLE_NAME} role: ${String(error)}`);
    }
  }

  /**
   * Routes an incoming Discord interaction to the correct handler:
   * answer button presses go to the quiz manager, all others to the command manager.
   * Lazily registers the guild on first interaction.
   *
   * @param interaction - The incoming Discord interaction.
   * @returns A promise that resolves to an interaction response.
   */
  public async handleInteraction(interaction: APIInteraction): Promise<APIInteractionResponse> {
    try {
      if (!interaction.guild_id) {
        return createEphemeralResponse(
          "This interaction must be performed within a guild.",
        );
      }

      // Register commands for the guild if not already registered
      const isRegistered: boolean = await this.guildStorage.isGuildRegistered(
        interaction.guild_id,
      );
      if (!isRegistered) {
        await this.start(interaction.guild_id);
      }

      // Route answer button presses to the quiz manager
      if (
        interaction.type === InteractionType.MessageComponent &&
        interaction.data.custom_id.startsWith("answer_")
      ) {
        const quizManager = await this.quizManager.getQuizManager(
          interaction.guild_id,
        );
        return await quizManager.handleAnswerInteraction(interaction);
      }

      // Delegate all other interactions to the command manager
      const response = await this.commandManager.handleInteraction(interaction);

      if (!response) {
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
