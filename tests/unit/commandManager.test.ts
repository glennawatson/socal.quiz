import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  APIChatInputApplicationCommandInteraction,
  APIInteractionResponse,
  APIModalSubmitInteraction,
  ApplicationCommandType,
  ChannelType,
  InteractionResponseType,
  InteractionType,
  Locale,
  MessageFlags,
} from "discord-api-types/v10";
import { CommandManager } from "../../src/handlers/actions/commandManager.js";
import { createEphemeralResponse } from "../../src/util/interactionHelpers.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { IModalHandlerCommand } from "../../src/handlers/actions/discordCommand.interfaces.js";

describe("CommandManager", () => {
  let commandManager: CommandManager;
  const clientId = "testClientId";
  const guildId = "testGuildId";
  let putSpy: any;

  beforeEach(() => {
    const botServiceMock = {
      // Mock any methods or properties used from DiscordBotService
    } as any;

    const questionStorageMock = {
      getQuestionBankNames: vi.fn().mockResolvedValue([]),
    } as any;

    const restMock = {
      put: vi.fn().mockResolvedValue({}),
      post: vi.fn().mockResolvedValue({}),
    } as any;

    putSpy = restMock.put;

    commandManager = new CommandManager(
      botServiceMock,
      questionStorageMock,
      clientId,
      restMock,
    );
  });

  describe("handleInteraction", () => {
    it("should handle unknown interaction type", async () => {
      const interaction = {
        type: InteractionType.Ping,
      };

      const response = await commandManager.handleInteraction(
        interaction as any,
      );

      expect(response).toEqual({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: "Unknown command!",
          flags: MessageFlags.Ephemeral,
        },
      });
    });

    it("should handle unknown command for ApplicationCommand", async () => {
      // noinspection JSDeprecatedSymbols
      const interaction: APIChatInputApplicationCommandInteraction = {
        app_permissions: "",
        application_id: "",
        authorizing_integration_owners: {},
        channel: { id: "123", type: ChannelType.GuildVoice },
        channel_id: "123",
        entitlements: [],
        id: "",
        locale: Locale.EnglishUS,
        token: "",
        version: 1,
        attachment_size_limit: 8388608,
        type: InteractionType.ApplicationCommand,
        data: {
          name: "unknownCommand",
          id: "",
          type: ApplicationCommandType.ChatInput,
        },
      };

      const response = await commandManager.handleInteraction(
        interaction as any,
      );

      expect(response).toEqual(
        createEphemeralResponse("could not find command: unknownCommand"),
      );
    });

    it("should handle unknown command for ModalSubmit", async () => {
      const interaction = {
        type: InteractionType.ModalSubmit,
        data: {
          custom_id: "unknownModal",
        },
      };

      const response = await commandManager.handleInteraction(
        interaction as any,
      );

      expect(response).toEqual(
        createEphemeralResponse("could not find modal: unknownModal"),
      );
    });

    // Additional test cases to cover uncovered lines
    it("should execute the command for ApplicationCommand interaction", async () => {
      const mockCommand = {
        data: () =>
          new SlashCommandBuilder()
            .setName("test")
            .setDescription("A test command"),
        execute: vi.fn().mockResolvedValue({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: "Command executed!",
          },
        }),
        name: "test",
      };

      commandManager.registerCommand(mockCommand);

      const interaction: APIChatInputApplicationCommandInteraction = {
        app_permissions: "",
        application_id: "",
        authorizing_integration_owners: {},
        channel: { id: "123", type: ChannelType.GuildVoice },
        channel_id: "123",
        entitlements: [],
        id: "",
        locale: Locale.EnglishUS,
        token: "",
        version: 1,
        attachment_size_limit: 8388608,
        type: InteractionType.ApplicationCommand,
        data: {
          name: "test",
          id: "",
          type: ApplicationCommandType.ChatInput,
        },
      };

      const response = await commandManager.handleInteraction(
        interaction as any,
      );

      expect(response).toEqual({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: "Command executed!",
        },
      });
      expect(mockCommand.execute).toHaveBeenCalledWith(interaction);
    });

    it("should handle modal submit interaction", async () => {
      const mockModalCommand: IModalHandlerCommand = {
        execute(
          _: APIChatInputApplicationCommandInteraction,
        ): Promise<APIInteractionResponse> {
          return Promise.resolve({} as unknown as APIInteractionResponse);
        },
        data: () =>
          new SlashCommandBuilder()
            .setName("testModal")
            .setDescription("A test modal command"),
        handleModalSubmit: vi.fn().mockResolvedValue({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: "Modal handled!",
          },
        }),
        name: "testModal",
      };

      commandManager.registerCommand(mockModalCommand);

      const interaction: APIModalSubmitInteraction = {
        app_permissions: "",
        application_id: "",
        authorizing_integration_owners: {},
        channel: { id: "123", type: ChannelType.GuildVoice },
        channel_id: "123",
        entitlements: [],
        id: "",
        locale: Locale.EnglishUS,
        token: "",
        version: 1,
        attachment_size_limit: 8388608,
        type: InteractionType.ModalSubmit,
        data: {
          custom_id: "testModal",
          components: [],
        },
      };

      const response = await commandManager.handleInteraction(
        interaction as any,
      );

      expect(response).toEqual({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: "Modal handled!",
        },
      });
      expect(mockModalCommand.handleModalSubmit).toHaveBeenCalledWith(
        interaction,
      );
    });

    it("should deny modal submit for admin command without permission", async () => {
      const mockModalCommand: IModalHandlerCommand = {
        execute(
          _: APIChatInputApplicationCommandInteraction,
        ): Promise<APIInteractionResponse> {
          return Promise.resolve({} as unknown as APIInteractionResponse);
        },
        data: () =>
          new SlashCommandBuilder()
            .setName("add_question_to_bank")
            .setDescription("An admin modal command"),
        handleModalSubmit: vi.fn().mockResolvedValue({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: "Should not reach here",
          },
        }),
        name: "add_question_to_bank",
      };

      commandManager.registerCommand(mockModalCommand);

      const interaction: APIModalSubmitInteraction = {
        app_permissions: "",
        application_id: "",
        authorizing_integration_owners: {},
        channel: { id: "123", type: ChannelType.GuildVoice },
        channel_id: "123",
        entitlements: [],
        id: "",
        locale: Locale.EnglishUS,
        token: "",
        version: 1,
        attachment_size_limit: 8388608,
        type: InteractionType.ModalSubmit,
        data: {
          custom_id: "add_question_to_bank",
          components: [],
        },
        member: {
          user: {
            id: "user-id",
            username: "username",
            discriminator: "0001",
            avatar: "avatar-hash",
            global_name: "user-id",
          },
          roles: [],
          premium_since: null,
          permissions: "0",
          pending: false,
          mute: false,
          deaf: false,
          joined_at: "",
          flags: 0,
        },
      };

      const response = await commandManager.handleInteraction(
        interaction as any,
      );

      expect(response).toEqual(
        createEphemeralResponse(
          "You need the Manage Server permission or the QuizAdmin role to use this command.",
        ),
      );
      expect(mockModalCommand.handleModalSubmit).not.toHaveBeenCalled();
    });

    it("should allow modal submit for admin command with QuizAdmin role", async () => {
      commandManager.setQuizAdminRoleId("quiz-admin-role-id");

      const mockModalCommand: IModalHandlerCommand = {
        execute(
          _: APIChatInputApplicationCommandInteraction,
        ): Promise<APIInteractionResponse> {
          return Promise.resolve({} as unknown as APIInteractionResponse);
        },
        data: () =>
          new SlashCommandBuilder()
            .setName("add_question_to_bank")
            .setDescription("An admin modal command"),
        handleModalSubmit: vi.fn().mockResolvedValue({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: "Modal handled with role!",
          },
        }),
        name: "add_question_to_bank",
      };

      commandManager.registerCommand(mockModalCommand);

      const interaction: APIModalSubmitInteraction = {
        app_permissions: "",
        application_id: "",
        authorizing_integration_owners: {},
        channel: { id: "123", type: ChannelType.GuildVoice },
        channel_id: "123",
        entitlements: [],
        id: "",
        locale: Locale.EnglishUS,
        token: "",
        version: 1,
        attachment_size_limit: 8388608,
        type: InteractionType.ModalSubmit,
        data: {
          custom_id: "add_question_to_bank",
          components: [],
        },
        member: {
          user: {
            id: "user-id",
            username: "username",
            discriminator: "0001",
            avatar: "avatar-hash",
            global_name: "user-id",
          },
          roles: ["quiz-admin-role-id"],
          premium_since: null,
          permissions: "0",
          pending: false,
          mute: false,
          deaf: false,
          joined_at: "",
          flags: 0,
        },
      };

      const response = await commandManager.handleInteraction(
        interaction as any,
      );

      expect(response).toEqual({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: "Modal handled with role!",
        },
      });
      expect(mockModalCommand.handleModalSubmit).toHaveBeenCalledWith(
        interaction,
      );
    });

    it("should allow ApplicationCommand for admin command with MANAGE_GUILD permission", async () => {
      const mockCommand = {
        data: () =>
          new SlashCommandBuilder()
            .setName("start_quiz")
            .setDescription("Start quiz"),
        execute: vi.fn().mockResolvedValue({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: { content: "Started!" },
        }),
        name: "start_quiz",
      };

      commandManager.registerCommand(mockCommand);

      const MANAGE_GUILD = (1n << 5n).toString();
      const interaction: APIChatInputApplicationCommandInteraction = {
        app_permissions: "",
        application_id: "",
        authorizing_integration_owners: {},
        channel: { id: "123", type: ChannelType.GuildVoice },
        channel_id: "123",
        entitlements: [],
        id: "",
        locale: Locale.EnglishUS,
        token: "",
        version: 1,
        attachment_size_limit: 8388608,
        type: InteractionType.ApplicationCommand,
        data: {
          name: "start_quiz",
          id: "",
          type: ApplicationCommandType.ChatInput,
        },
        member: {
          user: {
            id: "user-id",
            username: "username",
            discriminator: "0001",
            avatar: "avatar-hash",
            global_name: "user-id",
          },
          roles: [],
          premium_since: null,
          permissions: MANAGE_GUILD,
          pending: false,
          mute: false,
          deaf: false,
          joined_at: "",
          flags: 0,
        },
      };

      const response = await commandManager.handleInteraction(
        interaction as any,
      );

      expect(response).toEqual({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: "Started!" },
      });
      expect(mockCommand.execute).toHaveBeenCalledWith(interaction);
    });

    it("should deny ApplicationCommand for admin command without permission", async () => {
      const mockCommand = {
        data: () =>
          new SlashCommandBuilder()
            .setName("start_quiz")
            .setDescription("Start quiz"),
        execute: vi.fn().mockResolvedValue({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: { content: "Started!" },
        }),
        name: "start_quiz",
      };

      commandManager.registerCommand(mockCommand);

      const interaction: APIChatInputApplicationCommandInteraction = {
        app_permissions: "",
        application_id: "",
        authorizing_integration_owners: {},
        channel: { id: "123", type: ChannelType.GuildVoice },
        channel_id: "123",
        entitlements: [],
        id: "",
        locale: Locale.EnglishUS,
        token: "",
        version: 1,
        attachment_size_limit: 8388608,
        type: InteractionType.ApplicationCommand,
        data: {
          name: "start_quiz",
          id: "",
          type: ApplicationCommandType.ChatInput,
        },
        member: {
          user: {
            id: "user-id",
            username: "username",
            discriminator: "0001",
            avatar: "avatar-hash",
            global_name: "user-id",
          },
          roles: [],
          premium_since: null,
          permissions: "0",
          pending: false,
          mute: false,
          deaf: false,
          joined_at: "",
          flags: 0,
        },
      };

      const response = await commandManager.handleInteraction(
        interaction as any,
      );

      expect(response).toEqual(
        createEphemeralResponse(
          "You need the Manage Server permission or the QuizAdmin role to use this command.",
        ),
      );
      expect(mockCommand.execute).not.toHaveBeenCalled();
    });
  });

  describe("autocomplete", () => {
    it("should return matching bank names for bankname autocomplete", async () => {
      const questionStorageMock = {
        getQuestionBankNames: vi.fn().mockResolvedValue(["trivia", "history", "science"]),
      } as any;

      const restMock = { put: vi.fn().mockResolvedValue({}), post: vi.fn().mockResolvedValue({}) } as any;
      const cm = new CommandManager({} as any, questionStorageMock, clientId, restMock);

      const interaction = {
        type: InteractionType.ApplicationCommandAutocomplete,
        guild_id: "guild1",
        data: {
          name: "start_quiz",
          options: [
            { name: "bankname", type: 3, value: "tri", focused: true },
          ],
        },
      };

      const response = await cm.handleInteraction(interaction as any);

      expect(response).toEqual({
        type: InteractionResponseType.ApplicationCommandAutocompleteResult,
        data: { choices: [{ name: "trivia", value: "trivia" }] },
      });
    });

    it("should return empty choices when no guild_id", async () => {
      const interaction = {
        type: InteractionType.ApplicationCommandAutocomplete,
        guild_id: undefined,
        data: {
          name: "start_quiz",
          options: [
            { name: "bankname", type: 3, value: "tri", focused: true },
          ],
        },
      };

      const response = await commandManager.handleInteraction(interaction as any);

      expect(response).toEqual({
        type: InteractionResponseType.ApplicationCommandAutocompleteResult,
        data: { choices: [] },
      });
    });

    it("should return empty choices when focused option is not bankname", async () => {
      const questionStorageMock = {
        getQuestionBankNames: vi.fn().mockResolvedValue(["trivia"]),
      } as any;

      const restMock = { put: vi.fn().mockResolvedValue({}), post: vi.fn().mockResolvedValue({}) } as any;
      const cm = new CommandManager({} as any, questionStorageMock, clientId, restMock);

      const interaction = {
        type: InteractionType.ApplicationCommandAutocomplete,
        guild_id: "guild1",
        data: {
          name: "start_quiz",
          options: [
            { name: "mode", type: 3, value: "au", focused: true },
          ],
        },
      };

      const response = await cm.handleInteraction(interaction as any);

      expect(response).toEqual({
        type: InteractionResponseType.ApplicationCommandAutocompleteResult,
        data: { choices: [] },
      });
    });

    it("should delegate to command handleAutocomplete if available", async () => {
      const mockAutocompleteData = { choices: [{ name: "custom", value: "custom" }] };
      const mockCommand = {
        data: () => new SlashCommandBuilder().setName("test_cmd").setDescription("test"),
        execute: vi.fn(),
        handleAutocomplete: vi.fn().mockResolvedValue(mockAutocompleteData),
        name: "test_cmd",
      };

      commandManager.registerCommand(mockCommand);

      const interaction = {
        type: InteractionType.ApplicationCommandAutocomplete,
        guild_id: "guild1",
        data: {
          name: "test_cmd",
          options: [
            { name: "bankname", type: 3, value: "c", focused: true },
          ],
        },
      };

      const response = await commandManager.handleInteraction(interaction as any);

      expect(mockCommand.handleAutocomplete).toHaveBeenCalledWith(interaction);
      expect(response).toEqual({
        type: InteractionResponseType.ApplicationCommandAutocompleteResult,
        data: mockAutocompleteData,
      });
    });
  });

  describe("filterBankNames", () => {
    it("should filter bank names by partial query", () => {
      const result = CommandManager.filterBankNames(
        ["trivia", "history", "science"],
        "tri",
      );
      expect(result).toEqual([{ name: "trivia", value: "trivia" }]);
    });

    it("should return all names when query is null", () => {
      const result = CommandManager.filterBankNames(
        ["trivia", "history"],
        null,
      );
      expect(result).toEqual([
        { name: "trivia", value: "trivia" },
        { name: "history", value: "history" },
      ]);
    });

    it("should return all names when query is undefined", () => {
      const result = CommandManager.filterBankNames(
        ["trivia", "history"],
        undefined,
      );
      expect(result).toEqual([
        { name: "trivia", value: "trivia" },
        { name: "history", value: "history" },
      ]);
    });

    it("should be case-insensitive", () => {
      const result = CommandManager.filterBankNames(
        ["Trivia", "HISTORY"],
        "hist",
      );
      expect(result).toEqual([{ name: "HISTORY", value: "HISTORY" }]);
    });

    it("should limit results to 25", () => {
      const names = Array.from({ length: 30 }, (_, i) => `bank${i}`);
      const result = CommandManager.filterBankNames(names, "bank");
      expect(result).toHaveLength(25);
    });
  });

  describe("registerCommands", () => {
    it("should register all commands", async () => {
      await commandManager.registerDefaultCommands(guildId);

      expect(putSpy).toHaveBeenCalledWith(
        `/applications/${clientId}/guilds/${guildId}/commands`,
        { body: expect.any(Array) },
      );
    });

    it("should register commands with correct structure", async () => {
      const mockCommand = {
        data: () =>
          new SlashCommandBuilder()
            .setName("test")
            .setDescription("A test command"),
        execute: vi.fn(),
        name: "dodgy",
      };

      const mockCommands = [mockCommand];

      commandManager.registerCommand(mockCommand);

      await commandManager.registerCommandsForGuild(guildId);

      expect(putSpy).toHaveBeenCalledWith(
        `/applications/${clientId}/guilds/${guildId}/commands`,
        {
          body: mockCommands.map((cmd) => cmd.data().toJSON()),
        },
      );
    });

    it("should handle invalid command during registration", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error");

      const invalidCommand = {
        name: "invalid",
      };

      commandManager.registerCommand(invalidCommand as any);

      await commandManager.registerCommandsForGuild(guildId);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Invalid command:",
        invalidCommand,
      );
      consoleErrorSpy.mockRestore();
    });

    it("should handle API errors during command registration", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error");
      putSpy.mockRejectedValueOnce(new Error("API error"));

      await commandManager.registerDefaultCommands(guildId);

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(Error));
      consoleErrorSpy.mockRestore();
    });
  });
});
