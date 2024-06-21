import { beforeEach, describe, expect, it, vi } from "vitest";
import { DiscordBotService } from "../../src/handlers/discordBotService";
import { StartQuizCommand } from "../../src/handlers/actions/startQuizCommand";
import {
  createEphemeralResponse,
  generateOptionMissingErrorResponse,
} from "../../src/util/interactionHelpers";
import { APIChatInputApplicationCommandInteraction } from "discord-api-types/v10";
import { generateBankOptions } from "./optionsHelper";

describe("StartQuizCommand", () => {
  let discordBotServiceMock: DiscordBotService;
  let startQuizCommand: StartQuizCommand;

  beforeEach(() => {
    discordBotServiceMock = {
      getQuizManager: vi.fn(),
    } as unknown as DiscordBotService;

    startQuizCommand = new StartQuizCommand(discordBotServiceMock);
  });

  describe("data", () => {
    it("should return the correct command data", () => {
      const commandData = startQuizCommand.data();
      expect(commandData.name).toBe("start_quiz");
    });
  });

  describe("execute", () => {
    it("should start the quiz and return a confirmation message", async () => {
      const quizManagerMock = {
        startQuiz: vi
          .fn()
          .mockResolvedValue(createEphemeralResponse("Quiz started")),
      };

      discordBotServiceMock.getQuizManager = vi
        .fn()
        .mockResolvedValue(quizManagerMock);

      const interaction: APIChatInputApplicationCommandInteraction =
        generateBankOptions("123", "sampleBank");

      const response = await startQuizCommand.execute(interaction);

      expect(quizManagerMock.startQuiz).toHaveBeenCalledWith(
        "channel-id",
        "sampleBank",
      );
      expect(response).toEqual(createEphemeralResponse("Quiz started"));
    });

    it("should return an error if the guild id or bank name is missing", async () => {
      const response = await startQuizCommand.execute(
        generateBankOptions("", ""),
      );

      expect(response).toEqual(generateOptionMissingErrorResponse("guild_id"));

      const response2 = await startQuizCommand.execute(
        generateBankOptions("123", ""),
      );

      expect(response2).toEqual(generateOptionMissingErrorResponse("bankname"));
    });
  });
});
