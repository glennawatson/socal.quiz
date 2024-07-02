import { describe, it, beforeEach, expect, vi } from "vitest";
import { QuizManagerBase } from "../../src/handlers/quizManagerBase.js";
import { QuizState } from "../../src/handlers/quizState.interfaces.js";
import { APIInteractionResponse } from "discord-api-types/v10";
import { createEphemeralResponse } from "../../src/util/interactionHelpers.js";
import {
  QuizManagerFactory,
  QuizManagerFactoryManager,
} from "../../src/handlers/quizManagerFactoryManager.js";
import { REST } from "@discordjs/rest";
import { IQuestionStorage } from "../../src/util/IQuestionStorage.interfaces.js";
import "../../src/util/mapExtensions.js";

class QuizManagerBaseImpl extends QuizManagerBase {
  public async runQuiz(_quiz: QuizState): Promise<void> {}
  public async stopQuiz(_guildId: string, _channelId: string): Promise<void> {}
  public async nextQuizQuestion(
    _guildId: string,
    _channelId: string,
  ): Promise<void> {}
  public async answerInteraction(
    _guildId: string,
    _channelId: string,
    _userId: string,
    _selectedAnswerId: string,
  ): Promise<APIInteractionResponse> {
    return createEphemeralResponse("answerInteraction called");
  }

  constructor(rest: REST, quizStorage: IQuestionStorage) {
    super(rest, quizStorage);
  }
}

describe("QuizManagerFactoryManager", () => {
  let quizManagerFactory: QuizManagerFactory;
  let quizManagerFactoryManager: QuizManagerFactoryManager;
  let quizManagerBaseMock: QuizManagerBaseImpl;

  beforeEach(() => {
    quizManagerBaseMock = new QuizManagerBaseImpl({} as any, {} as any);
    quizManagerFactory = vi.fn().mockReturnValue(quizManagerBaseMock);
    quizManagerFactoryManager = new QuizManagerFactoryManager(
      quizManagerFactory,
    );
  });

  describe("getQuizManager", () => {
    it("should return a quiz manager for a given guild", async () => {
      const guildId = "guild123";
      const manager = await quizManagerFactoryManager.getQuizManager(guildId);

      expect(manager).toBe(quizManagerBaseMock);
      expect(quizManagerFactory).toHaveBeenCalledTimes(1);
    });

    it("should return the same quiz manager for the same guild", async () => {
      const guildId = "guild123";
      const manager1 = await quizManagerFactoryManager.getQuizManager(guildId);
      const manager2 = await quizManagerFactoryManager.getQuizManager(guildId);

      expect(manager1).toBe(manager2);
      expect(quizManagerFactory).toHaveBeenCalledTimes(1);
    });

    it("should return different quiz managers for different guilds", async () => {
      quizManagerFactory = vi.fn().mockImplementation(() => {
        return new QuizManagerBaseImpl({} as any, {} as any);
      });
      quizManagerFactoryManager = new QuizManagerFactoryManager(
        quizManagerFactory,
      );

      const guildId1 = "guild123";
      const guildId2 = "guild456";
      const manager1 = await quizManagerFactoryManager.getQuizManager(guildId1);
      const manager2 = await quizManagerFactoryManager.getQuizManager(guildId2);

      expect(manager1).not.toBe(manager2);
      expect(quizManagerFactory).toHaveBeenCalledTimes(2);
    });

    it("should throw an error if the manager cannot be created", async () => {
      quizManagerFactory = vi.fn().mockReturnValue(null);
      quizManagerFactoryManager = new QuizManagerFactoryManager(
        quizManagerFactory,
      );

      const guildId = "guild123";

      await expect(
        quizManagerFactoryManager.getQuizManager(guildId),
      ).rejects.toThrowError(
        `could not find a quiz manager for guild ${guildId}`,
      );
    });
  });
});
