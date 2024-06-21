import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  APIChatInputApplicationCommandInteraction,
  ApplicationCommandType,
  ChannelType,
  InteractionResponseType,
  InteractionType,
  MessageFlags,
} from "discord-api-types/v10";
import { CommandManager } from "../../src/handlers/actions/commandManager";
import { createEphemeralResponse } from "../../src/util/interactionHelpers";
import { SlashCommandBuilder } from "@discordjs/builders";

describe("CommandManager", () => {
  let commandManager: CommandManager;
  const clientId = "testClientId";
  const guildId = "testGuildId";
  let postSpy: any;
  ////let putSpy: any;

  beforeEach(() => {
    const botServiceMock = {
      // Mock any methods or properties used from DiscordBotService
    } as any;

    const questionStorageMock = {
      // Mock any methods or properties used from QuestionStorage
    } as any;

    const restMock = {
      put: vi.fn().mockResolvedValue({}),
      post: vi.fn().mockResolvedValue({}),
    } as any;

    postSpy = restMock.post;
    ////putSpy = restMock.put;

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
        locale: "en-US",
        token: "",
        version: 1,
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
  });

  describe("registerCommands", () => {
    it("should register all commands", async () => {
      await commandManager.registerDefaultCommands(guildId);

      expect(postSpy).toHaveBeenCalledWith(
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

      expect(postSpy).toHaveBeenCalledWith(
        `/applications/${clientId}/guilds/${guildId}/commands`,
        {
          body: mockCommands.map((cmd) => cmd.data().toJSON()),
        },
      );
    });

    it("should handle API errors during command registration", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error");
      postSpy.mockRejectedValueOnce(new Error("API error"));

      await commandManager.registerDefaultCommands(guildId);

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(Error));
      consoleErrorSpy.mockRestore();
    });
  });
});
