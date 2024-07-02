import { beforeEach, describe, expect, it, vi } from "vitest";
import { REST } from "@discordjs/rest";
import { QuizManagerBase } from "../../src/handlers/quizManagerBase.js";
import {
  APIChatInputApplicationCommandInteraction,
  APIInteraction,
  APIInteractionResponse,
  ChannelType,
  ComponentType,
  InteractionType,
} from "discord-api-types/v10";
import { createEphemeralResponse } from "../../src/util/interactionHelpers.js";
import { IQuestionStorage } from "../../src/util/IQuestionStorage.interfaces.js";
import { QuizState } from "../../src/handlers/quizState.interfaces.js";
import { Question } from "../../src/question.interfaces.js";

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

describe("QuizManagerBase", () => {
  let quizManagerBase: QuizManagerBaseImpl;
  let restMock: REST;
  let quizStateStorageMock: IQuestionStorage;

  beforeEach(() => {
    restMock = {} as REST;
    quizStateStorageMock = {
      getQuestions: vi.fn(),
      updateQuestion: vi.fn(),
      deleteQuestion: vi.fn(),
      deleteQuestionBank: vi.fn(),
      generateAndAddQuestion: vi.fn(),
      generateQuestion: vi.fn(),
    } as unknown as IQuestionStorage;

    quizManagerBase = new QuizManagerBaseImpl(restMock, quizStateStorageMock);
  });

  describe("startQuiz", () => {
    it("should return an error if question bank name is null", async () => {
      const response = await quizManagerBase.startQuiz(
        "guild123",
        "channel123",
        null as any,
      );
      expect(response).toEqual(
        createEphemeralResponse("There is no valid question bank name"),
      );
    });

    it("should return an error if question bank name is empty", async () => {
      const response = await quizManagerBase.startQuiz(
        "guild123",
        "channel123",
        "",
      );
      expect(response).toEqual(
        createEphemeralResponse("There is no valid question bank name"),
      );
    });

    it("should return an error if no questions are found", async () => {
      quizStateStorageMock.getQuestions = vi.fn().mockResolvedValue([]);
      const response = await quizManagerBase.startQuiz(
        "guild123",
        "channel123",
        "bank123",
      );
      expect(response).toEqual(
        createEphemeralResponse(
          "There are no valid questions in the question bank bank123",
        ),
      );
    });

    it("should call startQuizInternal with valid questions", async () => {
      const questions: Question[] = [
        {
          guildId: "guild-id",
          bankName: "bank1",
          questionId: "q1",
          question: "What is 2 + 2?",
          answers: [
            { answerId: "a1", answer: "3" },
            { answerId: "a2", answer: "4" },
            { answerId: "a3", answer: "5" },
            { answerId: "a4", answer: "6" },
          ],
          correctAnswerId: "a1",
          questionShowTimeMs: 50,
        },
      ];

      quizStateStorageMock.getQuestions = vi.fn().mockResolvedValue(questions);

      const startQuizInternalSpy = vi.spyOn(
        quizManagerBase,
        "startQuizInternal",
      );

      await quizManagerBase.startQuiz("guild123", "channel123", "bank1");

      expect(startQuizInternalSpy).toHaveBeenCalledWith(
        questions,
        "guild123",
        "channel123",
      );
    });
  });

  describe("startQuizInternal", () => {
    it("should return an error if there are no valid questions", async () => {
      const response = await quizManagerBase.startQuizInternal(
        [],
        "guild123",
        "channel123",
      );
      expect(response).toEqual(
        createEphemeralResponse("There are no valid questions"),
      );
    });

    it("should return an error if there are invalid questions", async () => {
      const questions: Question[] = [
        {
          guildId: "guild-id",
          bankName: "bank1",
          questionId: "q1",
          question: "",
          answers: [
            { answerId: "a1", answer: "3" },
            { answerId: "a2", answer: "4" },
            { answerId: "a3", answer: "5" },
            { answerId: "a4", answer: "6" },
          ],
          correctAnswerId: "a1",
          questionShowTimeMs: 50,
        },
      ];

      const response = await quizManagerBase.startQuizInternal(
        questions,
        "guild123",
        "channel123",
      );
      expect(response).toEqual(
        createEphemeralResponse("There are invalid questions with IDs: q1"),
      );
    });

    it("should call stopQuiz and runQuiz with valid questions", async () => {
      const questions: Question[] = [
        {
          guildId: "guild-id",
          bankName: "bank1",
          questionId: "q1",
          question: "What is 2 + 2?",
          answers: [
            { answerId: "a1", answer: "3" },
            { answerId: "a2", answer: "4" },
            { answerId: "a3", answer: "5" },
            { answerId: "a4", answer: "6" },
          ],
          correctAnswerId: "a1",
          questionShowTimeMs: 50,
        },
      ];

      const stopQuizSpy = vi.spyOn(quizManagerBase, "stopQuiz");
      const runQuizSpy = vi.spyOn(quizManagerBase, "runQuiz");

      await quizManagerBase.startQuizInternal(
        questions,
        "guild123",
        "channel123",
      );

      expect(stopQuizSpy).toHaveBeenCalledWith("guild123", "channel123");
      expect(runQuizSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          questionBank: questions,
          guildId: "guild123",
          channelId: "channel123",
        }),
      );
    });
  });

  describe("handleAnswerInteraction", () => {
    it("should return an error if interaction ID is missing", async () => {
      const interaction: APIInteraction = {
        type: InteractionType.MessageComponent,
        guild_id: "guild123",
        channel: { id: "channel123", type: 0 },
        channel_id: "channel123",
        id: "interaction1",
        application_id: "app123",
        token: "token123",
        version: 1,
        data: {
          id: "data1",
          type: 1,
          name: "name1",
          custom_id: "quiz__answer123",
        },
        user: { id: "user123", username: "user", discriminator: "0001" },
      } as any;

      const response =
        await quizManagerBase.handleAnswerInteraction(interaction);
      expect(response).toEqual(
        createEphemeralResponse("Could not find a valid interaction id"),
      );
    });

    it("should return an error if interaction type is invalid", async () => {
      const interaction: APIInteraction = {
        type: InteractionType.ApplicationCommand,
        guild_id: "guild123",
        channel: { id: "channel123", type: 0 },
        channel_id: "channel123",
        id: "interaction1",
        application_id: "app123",
        token: "token123",
        version: 1,
        data: { id: "data1", type: 1, name: "name1" },
      } as any;

      const response =
        await quizManagerBase.handleAnswerInteraction(interaction);
      expect(response).toEqual(
        createEphemeralResponse("Invalid interaction type."),
      );
    });

    it("should return an error if guild_id is missing", async () => {
      const interaction: APIInteraction = {
        type: InteractionType.MessageComponent,
        guild_id: undefined,
        channel: { id: "channel123", type: 0 },
        channel_id: "channel123",
        id: "interaction1",
        application_id: "app123",
        token: "token123",
        version: 1,
        data: { id: "data1", type: 1, name: "name1" },
      } as any;

      const response =
        await quizManagerBase.handleAnswerInteraction(interaction);
      expect(response).toEqual(
        createEphemeralResponse("Must have a valid guild id."),
      );
    });

    it("should return an error if channel id is missing", async () => {
      const interaction: APIInteraction = {
        type: InteractionType.MessageComponent,
        guild_id: "guild123",
        channel: { id: undefined, type: 0 },
        channel_id: undefined,
        id: "interaction1",
        application_id: "app123",
        token: "token123",
        version: 1,
        data: { id: "data1", type: 1, name: "name1" },
      } as any;

      const response =
        await quizManagerBase.handleAnswerInteraction(interaction);
      expect(response).toEqual(
        createEphemeralResponse("Must have a valid channel"),
      );
    });

    it("should return an error if interaction ID is missing", async () => {
      const interaction: APIInteraction = {
        app_permissions: "",
        authorizing_integration_owners: {},
        entitlements: [],
        locale: "en-US",
        type: InteractionType.MessageComponent,
        guild_id: "guild123",
        channel: { id: "channel123", type: ChannelType.GuildVoice },
        channel_id: "channel123",
        id: "interaction1",
        application_id: "app123",
        token: "token123",
        version: 1,
        data: { component_type: ComponentType.Button, custom_id: "_" },
      } as any as APIInteraction;

      const response =
        await quizManagerBase.handleAnswerInteraction(interaction);
      expect(response).toEqual(
        createEphemeralResponse("Could not find a valid answer response"),
      );
    });

    it("should return an error if selected answer ID is missing", async () => {
      const interaction: APIChatInputApplicationCommandInteraction = {
        type: InteractionType.MessageComponent,
        guild_id: "guild123",
        channel: { id: "channel123", type: 0 },
        channel_id: "channel123",
        id: "interaction1",
        application_id: "app123",
        token: "token123",
        version: 1,
        data: {
          id: "data1",
          type: 1,
          name: "name1",
          component_type: ComponentType.Button,
          custom_id: "quiz_",
        },
      } as any as APIChatInputApplicationCommandInteraction;

      const response =
        await quizManagerBase.handleAnswerInteraction(interaction);
      expect(response).toEqual(
        createEphemeralResponse("Could not find a valid answer response"),
      );
    });

    it("should return an error if user ID is missing", async () => {
      const interaction: APIChatInputApplicationCommandInteraction = {
        type: InteractionType.MessageComponent,
        guild_id: "guild123",
        channel: { id: "channel123", type: 0 },
        channel_id: "channel123",
        id: "interaction1",
        application_id: "app123",
        token: "token123",
        version: 1,
        data: {
          id: "data1",
          type: 1,
          name: "name1",
          component_type: ComponentType.Button,
          custom_id: "quiz_123_answer123",
        },
        user: undefined,
      } as any as APIChatInputApplicationCommandInteraction;

      const response =
        await quizManagerBase.handleAnswerInteraction(interaction);
      expect(response).toEqual(
        createEphemeralResponse("Could not find a valid user id"),
      );
    });

    it("should call answerInteraction with correct parameters", async () => {
      const interaction: APIChatInputApplicationCommandInteraction = {
        type: InteractionType.MessageComponent,
        guild_id: "guild123",
        channel: { id: "channel123", type: 0 },
        channel_id: "channel123",
        id: "interaction1",
        application_id: "app123",
        token: "token123",
        version: 1,
        data: {
          id: "data1",
          type: 1,
          name: "name1",
          custom_id: "quiz_123_answer123",
        },
        user: { id: "user123", username: "user", discriminator: "0001" },
      } as any;

      const answerInteractionSpy = vi.spyOn(
        quizManagerBase,
        "answerInteraction",
      );

      await quizManagerBase.handleAnswerInteraction(interaction);

      expect(answerInteractionSpy).toHaveBeenCalledWith(
        "guild123",
        "channel123",
        "user123",
        "answer123",
      );
    });
  });
});
