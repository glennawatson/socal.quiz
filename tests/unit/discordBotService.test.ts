import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DiscordBotService } from "../../src/handlers/discordBotService.js";
import {
  createEphemeralResponse,
  generateErrorResponse,
} from "../../src/util/interactionHelpers.js";
import { APIInteraction, InteractionType } from "discord-api-types/v10";
import { GuildStorage } from "../../src/util/guildStorage.js";
import { CommandManager } from "../../src/handlers/actions/commandManager.js";
import { QuizManagerFactoryManager } from "../../src/handlers/quizManagerFactoryManager.js";
import { MockQuizManager } from "./mocks/mockQuizManager.js";

vi.mock("@discordjs/rest");
vi.mock("../../src/util/interactionHelpers.js");

describe("DiscordBotService", () => {
  let guildStorage: GuildStorage;
  let quizManager: QuizManagerFactoryManager;
  let commandManager: CommandManager;
  let service: DiscordBotService;

  beforeEach(() => {
    guildStorage = {
      markGuildAsRegistered: vi.fn(),
      isGuildRegistered: vi.fn(),
    } as any as GuildStorage;

    quizManager = new QuizManagerFactoryManager(() => new MockQuizManager());

    commandManager = {
      registerDefaultCommands: vi.fn(),
      handleInteraction: vi.fn(),
    } as any as CommandManager;
    service = new DiscordBotService(guildStorage, quizManager, commandManager);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should register default commands and mark guild as registered when starting", async () => {
    await service.start("guildId");
    expect(commandManager.registerDefaultCommands).toHaveBeenCalledWith(
      "guildId",
    );
    expect(guildStorage.markGuildAsRegistered).toHaveBeenCalledWith("guildId");
  });

  it("should handle interaction within a guild", async () => {
    const interaction = {
      guild_id: "guildId",
      type: InteractionType.MessageComponent,
      data: { custom_id: "answer_123" },
      channel: { id: "channel123", type: 0 },
      channel_id: "channel123",
    } as any as APIInteraction;

    guildStorage.isGuildRegistered = vi.fn().mockResolvedValue(false);

    await service.handleInteraction(interaction);

    expect(guildStorage.isGuildRegistered).toHaveBeenCalledWith("guildId");
    expect(commandManager.registerDefaultCommands).toHaveBeenCalledWith(
      "guildId",
    );
  });

  it("should handle unknown interaction type", async () => {
    const interaction = {
      guild_id: "guildId",
      type: InteractionType.ApplicationCommand,
      data: { custom_id: "unknown_123" },
      channel: { id: "channel123", type: 0 },
      channel_id: "channel123",
    } as any as APIInteraction;
    guildStorage.isGuildRegistered = vi.fn().mockResolvedValue(true);
    commandManager.handleInteraction = vi.fn().mockResolvedValue(null);

    await service.handleInteraction(interaction);

    expect(createEphemeralResponse).toHaveBeenCalledWith(
      "Unknown command or interaction type.",
    );
  });

  it("should handle interaction errors", async () => {
    const interaction = {
      guild_id: "guildId",
      type: InteractionType.MessageComponent,
      data: { custom_id: "" },
      channel: { id: "channel123", type: 0 },
      channel_id: "channel123",
    } as any as APIInteraction;
    guildStorage.isGuildRegistered = vi.fn().mockResolvedValue(true);
    commandManager.handleInteraction = vi
      .fn()
      .mockRejectedValue(new Error("Test error"));

    await service.handleInteraction(interaction);

    expect(generateErrorResponse).toHaveBeenCalledWith(new Error("Test error"));
  });

  it("should handle interaction outside a guild", async () => {
    const interaction = {
      type: InteractionType.MessageComponent,
      data: { custom_id: "answer_123" },
      channel: { id: "channel123", type: 0 },
      channel_id: "channel123",
    } as any as APIInteraction;

    await service.handleInteraction(interaction);

    expect(createEphemeralResponse).toHaveBeenCalledWith(
      "This interaction must be performed within a guild.",
    );
  });

  it("should return a response when commandManager provides one", async () => {
    const interaction = {
      guild_id: "guildId",
      type: InteractionType.ApplicationCommand,
      data: { custom_id: "command_123" },
      channel: { id: "channel123", type: 0 },
      channel_id: "channel123",
    } as any as APIInteraction;
    const expectedResponse = { type: 4, data: { content: "Response" } };
    guildStorage.isGuildRegistered = vi.fn().mockResolvedValue(true);
    commandManager.handleInteraction = vi
      .fn()
      .mockResolvedValue(expectedResponse);

    const response = await service.handleInteraction(interaction);

    expect(response).toBe(expectedResponse);
  });
});
