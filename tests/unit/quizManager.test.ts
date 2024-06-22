import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  APIInteraction,
  APIInteractionResponseChannelMessageWithSource,
  APIMessage,
  APIMessageComponentInteraction,
  APIUser,
  ApplicationCommandType,
  ChannelType,
  ComponentType,
  GuildMemberFlags,
  InteractionResponseType,
  InteractionType,
  MessageActivityType,
  MessageFlags,
  MessageType,
  RESTPostAPIChannelMessageJSONBody,
  Routes,
} from "discord-api-types/v10";
import { QuizManager } from "../../src/handlers/quizManager";
import { Question } from "../../src/question";
import { QuizState } from "../../src/handlers/quizState";
import { createEphemeralResponse } from "../../src/util/interactionHelpers";
import { asyncScheduler, SchedulerLike } from "rxjs";
import { EmbedBuilder } from "@discordjs/builders";

describe("QuizManager", () => {
  let quizManager: QuizManager;
  let postSpy: ReturnType<typeof vi.fn>;
  let questionStorageMock: any;
  let questions: Question[];
  let testScheduler: SchedulerLike;

  const channelId = "channel123";

  const createAPIUser = (id: string): APIUser => ({
    id,
    username: "user",
    discriminator: "0001",
    avatar: null,
    bot: false,
    system: false,
    mfa_enabled: false,
    global_name: "",
    banner: null,
    accent_color: null,
    locale: "en-US",
    verified: true,
    email: null,
  });

  const createAPIMessage = (channelId: string, userId: string): APIMessage => ({
    id: "message1",
    channel_id: channelId,
    author: createAPIUser(userId),
    content: "",
    timestamp: new Date().toISOString(),
    edited_timestamp: null,
    tts: false,
    mention_everyone: false,
    mentions: [],
    mention_roles: [],
    attachments: [],
    embeds: [],
    pinned: false,
    type: MessageType.Default,
    mention_channels: [],
    webhook_id: "",
    activity: { type: MessageActivityType.Join },
    application: {},
    message_reference: { channel_id: channelId },
    flags: MessageFlags.Urgent,
    referenced_message: null,
    components: [],
  });

  const createAPIMessageComponentInteraction = (
      channelId: string,
      userId: string,
      customId: string,
  ): APIMessageComponentInteraction => ({
    type: InteractionType.MessageComponent,
    data: { custom_id: customId, component_type: ComponentType.Button },
    member: {
      user: createAPIUser(userId),
      roles: [],
      premium_since: null,
      permissions: "0",
      pending: false,
      nick: null,
      mute: false,
      joined_at: new Date().toISOString(),
      deaf: false,
      communication_disabled_until: null,
      flags: GuildMemberFlags.CompletedOnboarding,
    },
    user: createAPIUser(userId),
    channel_id: channelId,
    channel: { id: channelId, type: ChannelType.GuildVoice },
    message: createAPIMessage(channelId, userId),
    guild_id: "guild123",
    app_permissions: "0",
    locale: "en-US",
    id: "interaction1",
    application_id: "application1",
    token: "token",
    version: 1,
    entitlements: [],
    authorizing_integration_owners: {},
  });

  beforeEach(() => {
    vi.useRealTimers();

    // Mock REST
    const rest = {
      post: vi.fn(),
    };

    postSpy = rest.post;

    // Mock quizStateStorage
    questionStorageMock = {
      getQuestions: vi.fn(),
      deleteQuestionBank: vi.fn(),
      deleteQuestion: vi.fn(),
      getPresignedUrl: vi.fn(),
      getQuestionImagePresignedUrl: vi.fn(),
      getExplanationImagePresignedUrl: vi.fn(),
      generateAndAddQuestion: vi.fn(),
      generateQuestion: vi.fn(),
    };

    testScheduler = asyncScheduler;

    quizManager = new QuizManager(rest as any, questionStorageMock, 20);

    // Mock Questions
    questions = [
      {
        bankName: "bank1",
        questionId: "q1",
        question: "What is 2 + 2?",
        answers: [
          { answerId: "a1", answer: "3" },
          { answerId: "a2", answer: "4" },
          { answerId: "a3", answer: "5" },
          { answerId: "a4", answer: "6" },
        ],
        correctAnswerIndex: 1,
        questionShowTimeMs: 50,
      },
      {
        bankName: "bank1",
        questionId: "q2",
        question: "What is the capital of France?",
        answers: [
          { answerId: "b1", answer: "Berlin" },
          { answerId: "b2", answer: "Paris" },
          { answerId: "b3", answer: "Madrid" },
          { answerId: "b4", answer: "Rome" },
        ],
        correctAnswerIndex: 1,
        questionShowTimeMs: 50,
      },
    ];
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it("should start a quiz and post the first question", async () => {
    const questionBankName = "bank1";

    questionStorageMock.getQuestions.mockResolvedValue(questions);

    // Start the quiz
    await quizManager.startQuiz(channelId, questionBankName, testScheduler);

    // Expected message bodies (for each question and summary)
    const expectedMessageBodies = [
      {
        // First question
        embeds: [
          expect.objectContaining({
            description: expect.stringContaining("What is 2 + 2?"),
          }),
        ],
        components: [expect.objectContaining({ type: 1 })], // Button component
      },
      {
        // Summary for the first question
        embeds: [
          expect.objectContaining({
            title: expect.stringContaining("Summary for Question 1"),
          }),
        ],
      },
      {
        // Second question
        embeds: [
          expect.objectContaining({
            description: expect.stringContaining(
                "What is the capital of France?",
            ),
          }),
        ],
        components: [expect.objectContaining({ type: 1 })], // Button component
      },
      {
        // Summary for the second question
        embeds: [
          expect.objectContaining({
            title: expect.stringContaining("Summary for Question 2"),
          }),
        ],
      },
      {
        // Final scores
        embeds: [expect.objectContaining({ title: "Quiz Scores" })],
      },
    ];

    // Assert that the postSpy was called with the expected message bodies
    expect(postSpy).toHaveBeenCalledTimes(expectedMessageBodies.length);

    // Ensure the correct order of calls with the right data
    expectedMessageBodies.forEach((body, index) => {
      expect(postSpy).toHaveBeenNthCalledWith(
          index + 1,
          Routes.channelMessages(channelId),
          { body },
      );

      // Check if this call is for a question (not a summary or scores)
      if (index % 2 === 0) {
        const questionIndex = index / 2; // Get the corresponding question index
        const call = postSpy.mock.calls[index];
        if (!call) {
          throw new Error("hey not found here");
        }

        const embed = call[1].body.embeds?.[0];

        // Check if the image is present only when it's expected AND the embed exists
        if (questions[questionIndex]?.imagePartitionKey && embed) {
          expect(embed).toHaveProperty("image");
        } else if (embed) {
          // Ensure the embed is not undefined before checking for the absence of "image"
          expect(embed).not.toHaveProperty("image");
        }
      }
    });
  });

  it("should handle a correct answer", async () => {
    // Set up quiz state with active users
    const quizState: QuizState = {
      currentQuestionId: questions[0]?.questionId,
      questionBank: questions,
      activeUsers: new Map([["user123", 0]]), // User with initial score of 0
      correctUsersForQuestion: new Set(),
      quizSubscription: null,
      channelId,
      answeredUsersForQuestion: new Set(),
    };
    quizManager.quizzes.set(channelId, quizState);

    const interaction = createAPIMessageComponentInteraction(
        channelId,
        "user123",
        `answer_${questions[0]?.answers[questions[0]?.correctAnswerIndex]?.answerId}`,
    );

    const response = (await quizManager.handleAnswer(
        interaction,
    )) as APIInteractionResponseChannelMessageWithSource;

    // Assert
    expect(response.type).toBe(
        InteractionResponseType.ChannelMessageWithSource,
    );
    expect(response.data.content).toBe("Correct!");
    expect(quizState.activeUsers.get("user123")).toBe(1);
    expect(quizState.correctUsersForQuestion.has("user123")).toBe(true);
  });

  it("should send a question summary", async () => {
    // Set up quiz state
    const quizState: QuizState = {
      currentQuestionId: questions[0]?.questionId,
      questionBank: questions,
      activeUsers: new Map(),
      correctUsersForQuestion: new Set(),
      quizSubscription: null,
      channelId,
      answeredUsersForQuestion: new Set(),
    };
    quizManager.quizzes.set(channelId, quizState);

    const questionIndex = 0;

    const currentQuestion = questions[questionIndex];

    expect(currentQuestion).toBeDefined();

    if (!currentQuestion) throw Error();

    await quizManager.sendQuestionSummary(channelId, currentQuestion, 1);

    const expectedMessageBody = {
      body: {
        embeds: [
          {
            title: `Summary for Question 1`,
            description: `0 user(s) answered correctly!\nThe correct answer was: ${
                questions[questionIndex]?.answers[
                    questions[questionIndex]?.correctAnswerIndex
                    ]?.answer ?? ""
            }`,
          },
        ],
      },
    };

    expect(postSpy).toHaveBeenCalledWith(
        Routes.channelMessages(channelId),
        expectedMessageBody,
    );
  });

  it("should show scores correctly", async () => {
    const quizState: QuizState = {
      currentQuestionId: questions[0]?.questionId,
      questionBank: questions,
      activeUsers: new Map([
        ["user1", 2],
        ["user2", 1],
        ["user3", 3],
      ]),
      correctUsersForQuestion: new Set(["user1", "user2", "user3"]),
      quizSubscription: null,
      channelId: channelId,
      answeredUsersForQuestion: new Set(),
    };

    await quizManager.showScores(quizState);

    const expectedDescription =
        "<@user3>: 3 points\n<@user1>: 2 points\n<@user2>: 1 points\n";

    const expectedEmbed = new EmbedBuilder()
        .setTitle("Quiz Scores")
        .setDescription(expectedDescription);

    expect(postSpy).toHaveBeenCalledWith(Routes.channelMessages(channelId), {
      body: {
        embeds: [expectedEmbed.toJSON()],
      },
    });

    expect(postSpy).toHaveBeenCalledWith(Routes.channelMessages(channelId), {
      body: {
        embeds: [expectedEmbed.toJSON()],
      },
    });
  });

  it("should move to the next question", async () => {
    // Arrange
    quizManager.quizzes.set(channelId, {
      currentQuestionId: questions[0]?.questionId,
      questionBank: questions,
      activeUsers: new Map(),
      correctUsersForQuestion: new Set(),
      quizSubscription: null,
      channelId: channelId,
      answeredUsersForQuestion: new Set(),
    });

    // Act
    await quizManager.nextQuizQuestion(channelId);

    const expectedMessageBody = {
      body: {
        embeds: [
          {
            title: "Quiz Question",
            description: `**Question**: What is the capital of France?\nA: Berlin\nB: Paris\nC: Madrid\nD: Rome`,
            footer: {
              text: "Select the correct answer by clicking the buttons below.",
            },
          },
        ],
        components: [
          {
            type: 1,
            components: [
              { custom_id: "answer_b1", label: "A", style: 1, type: 2 },
              { custom_id: "answer_b2", label: "B", style: 1, type: 2 },
              { custom_id: "answer_b3", label: "C", style: 1, type: 2 },
              { custom_id: "answer_b4", label: "D", style: 1, type: 2 },
            ],
          },
        ],
      },
    };

    expect(postSpy).toHaveBeenCalledWith(
        Routes.channelMessages(channelId),
        expectedMessageBody,
    );
  });

  it("should handle an incorrect answer", async () => {
    const quizState: QuizState = {
      currentQuestionId: questions[0]?.questionId,
      questionBank: questions,
      activeUsers: new Map([["user123", 0]]), // User with initial score of 0
      correctUsersForQuestion: new Set(),
      quizSubscription: null,
      answeredUsersForQuestion: new Set(),
      channelId,
    };

    quizManager.quizzes.set(channelId, quizState);

    const interaction = createAPIMessageComponentInteraction(
        channelId,
        "user123",
        `answer_${questions[0]?.answers[2]?.answerId}`,
    );

    const response = (await quizManager.handleAnswer(
        interaction,
    )) as APIInteractionResponseChannelMessageWithSource;

    expect(response.type).toBe(
        InteractionResponseType.ChannelMessageWithSource,
    );
    expect(response.data.content).toBe("Incorrect!");
    expect(quizState.activeUsers.get("user123")).toBe(0); // Score should not change
  });

  it("should handle an invalid interaction type", async () => {
    const interaction: APIInteraction = {
      app_permissions: "",
      channel: { id: channelId, type: ChannelType.GuildVoice },
      channel_id: channelId,
      type: InteractionType.ApplicationCommand, // Invalid interaction type
      id: "interaction1",
      application_id: "application1",
      token: "token",
      version: 1,
      user: createAPIUser("user1"),
      locale: "en-US",
      entitlements: [],
      authorizing_integration_owners: {},
      data: {
        type: ApplicationCommandType.ChatInput,
        id: "",
        options: [],
        name: "",
      },
    };

    const response = await quizManager.handleAnswer(interaction);

    expect(response).toEqual(
        createEphemeralResponse("Invalid interaction type."),
    );
  });

  it("should handle an empty question bank", async () => {
    // Mock an empty question bank
    questionStorageMock.getQuestions.mockResolvedValue([]);

    // Start the quiz (expecting it to fail)
    await quizManager.startQuiz(channelId, "emptyBank", testScheduler);

    // You might expect a specific error message or behavior in this case
    expect(postSpy).not.toHaveBeenCalled();
  });

  it("should not start a quiz if there are no questions in the bank", async () => {
    questionStorageMock.getQuestions.mockResolvedValue([]);

    await quizManager.startQuiz(channelId, "emptyBank", testScheduler);

    expect(postSpy).not.toHaveBeenCalled();
  });

  it("should stop an active quiz and clean up properly", async () => {
    const quizState: QuizState = {
      currentQuestionId: questions[0]?.questionId,
      questionBank: questions,
      activeUsers: new Map(),
      correctUsersForQuestion: new Set(),
      quizSubscription: null,
      channelId,
      answeredUsersForQuestion: new Set(),
    };
    quizManager.quizzes.set(channelId, quizState);

    quizManager.stopQuiz(channelId);

    expect(quizManager.quizzes.has(channelId)).toBe(false);
  });

  it("should correctly handle user answering the same question multiple times", async () => {
    const quizState: QuizState = {
      currentQuestionId: questions[0]?.questionId,
      questionBank: questions,
      activeUsers: new Map(),
      correctUsersForQuestion: new Set(),
      quizSubscription: null,
      channelId,
      answeredUsersForQuestion: new Set(),
    };
    quizManager.quizzes.set(channelId, quizState);

    const interaction = createAPIMessageComponentInteraction(
        channelId,
        "user123",
        `answer_${questions[0]?.answers[1]?.answerId}`,
    );

    await quizManager.handleAnswer(interaction);
    await quizManager.handleAnswer(interaction);

    expect(quizState.activeUsers.get("user123")).toBe(1);
    expect(quizState.correctUsersForQuestion.has("user123")).toBe(true);
  });

  it("should correctly update the score for multiple users", async () => {
    const quizState: QuizState = {
      currentQuestionId: questions[0]?.questionId,
      questionBank: questions,
      activeUsers: new Map(),
      correctUsersForQuestion: new Set(),
      quizSubscription: null,
      channelId,
      answeredUsersForQuestion: new Set(),
    };
    quizManager.quizzes.set(channelId, quizState);

    const user1Interaction = createAPIMessageComponentInteraction(
        channelId,
        "user1",
        `answer_${questions[0]?.answers[1]?.answerId}`,
    );
    const user2Interaction = createAPIMessageComponentInteraction(
        channelId,
        "user2",
        `answer_${questions[0]?.answers[1]?.answerId}`,
    );

    await quizManager.handleAnswer(user1Interaction);
    await quizManager.handleAnswer(user2Interaction);

    expect(quizState.activeUsers.get("user1")).toBe(1);
    expect(quizState.activeUsers.get("user2")).toBe(1);
  });

  it("should correctly handle questions with images", async () => {
    questions[0]!.imagePartitionKey = "question-image-key";
    const questionBankName = "bankWithImage";
    const presignedImageUrl =
        "https://example.com/presigned-question-image-url";

    questionStorageMock.getQuestions.mockResolvedValue(questions);
    questionStorageMock.getQuestionImagePresignedUrl.mockResolvedValue(
        presignedImageUrl,
    );

    await quizManager.startQuiz(channelId, questionBankName, testScheduler);

    expect(postSpy).toHaveBeenCalledWith(
        Routes.channelMessages(channelId),
        expect.objectContaining({
          body: expect.objectContaining({
            embeds: expect.arrayContaining([
              expect.objectContaining({
                image: { url: presignedImageUrl },
              }),
            ]),
          }),
        }),
    );
  });

  it("should handle the scenario where there are no correct answers", async () => {
    questions[0]!.correctAnswerIndex = -1;
    const quizState: QuizState = {
      currentQuestionId: questions[0]?.questionId,
      questionBank: questions,
      activeUsers: new Map([["user123", 0]]),
      correctUsersForQuestion: new Set(),
      quizSubscription: null,
      channelId,
      answeredUsersForQuestion: new Set(),
    };

    quizManager.quizzes.set(channelId, quizState);

    const interaction = createAPIMessageComponentInteraction(
        channelId,
        "user123",
        `answer_${questions[0]?.answers[1]?.answerId}`,
    );

    const response = (await quizManager.handleAnswer(
        interaction,
    )) as APIInteractionResponseChannelMessageWithSource;

    expect(response.data.content).toBe("Incorrect!");
  });

  it("should handle an invalid question format gracefully", async () => {
    questions[0]!.question = undefined as any;
    questionStorageMock.getQuestions.mockResolvedValue(questions);

    const response = await quizManager.startQuiz(
        channelId,
        "invalidBank",
        testScheduler,
    );

    expect(response).toEqual(
        createEphemeralResponse("There are invalid questions with IDs: q1"),
    );
  });

  it("should continue to the next question even if the summary message fails to send", async () => {
    postSpy.mockRejectedValueOnce(new Error("Failed to send summary"));

    const quizState: QuizState = {
      currentQuestionId: questions[0]?.questionId,
      questionBank: questions,
      activeUsers: new Map(),
      correctUsersForQuestion: new Set(),
      quizSubscription: null,
      channelId,
      answeredUsersForQuestion: new Set(),
    };
    quizManager.quizzes.set(channelId, quizState);

    const consoleErrorSpy = vi.spyOn(console, "error");

    await quizManager.nextQuizQuestion(channelId);

    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(Error));

    consoleErrorSpy.mockRestore();
  });

  it("should not proceed to the next question if the quiz is stopped", async () => {
    const quizState: QuizState = {
      currentQuestionId: questions[0]?.questionId,
      questionBank: questions,
      activeUsers: new Map(),
      correctUsersForQuestion: new Set(),
      quizSubscription: null,
      channelId,
      answeredUsersForQuestion: new Set(),
    };
    quizManager.quizzes.set(channelId, quizState);

    quizManager.stopQuiz(channelId);
    await quizManager.nextQuizQuestion(channelId);

    const expectedNextQuestion = questions[0];
    expect(quizState.currentQuestionId).toBe(expectedNextQuestion!.questionId);
  });

  it("should send a final score message when the quiz ends", async () => {
    const quizState: QuizState = {
      currentQuestionId: questions[questions.length - 1]!.questionId,
      questionBank: questions,
      activeUsers: new Map([["user1", 2]]),
      correctUsersForQuestion: new Set(["user1"]),
      quizSubscription: null,
      channelId,
      answeredUsersForQuestion: new Set(),
    };

    quizManager.quizzes.set(channelId, quizState);

    // Mock the REST post method to simulate user answers
    postSpy.mockImplementation(
        async (
            route: string,
            { body }: { body: RESTPostAPIChannelMessageJSONBody },
        ) => {
          if (route === Routes.channelMessages(channelId)) {
            const content =
                body.content || (body.embeds && body.embeds[0]?.description);

            if (content?.includes("What is 2 + 2?")) {
              // Simulate user answering the first question correctly
              await quizManager.handleAnswer(
                  createAPIMessageComponentInteraction(
                      channelId,
                      "user1",
                      `answer_${questions[0]?.answers[1]?.answerId}`,
                  ),
              );
            } else if (content?.includes("What is the capital of France?")) {
              // Simulate user answering the second question correctly
              await quizManager.handleAnswer(
                  createAPIMessageComponentInteraction(
                      channelId,
                      "user1",
                      `answer_${questions[1]?.answers[1]?.answerId}`,
                  ),
              );
            }
          }
        },
    );

    await quizManager.startQuizInternal(questions, channelId, testScheduler);

    expect(postSpy).toHaveBeenCalledTimes(5);

    const expectedDescription = "<@user1>: 2 points\n";

    const expectedEmbed = new EmbedBuilder()
        .setTitle("Quiz Scores")
        .setDescription(expectedDescription);

    expect(postSpy).toHaveBeenNthCalledWith(
        5,
        Routes.channelMessages(channelId),
        {
          body: {
            embeds: [expectedEmbed.toJSON()],
          },
        },
    );
  });

  it("should unsubscribe from quiz timer when the quiz is stopped", async () => {
    const quizState: QuizState = {
      currentQuestionId: questions[0]?.questionId,
      questionBank: questions,
      activeUsers: new Map(),
      correctUsersForQuestion: new Set(),
      quizSubscription: { unsubscribe: vi.fn() } as any,
      channelId,
      answeredUsersForQuestion: new Set(),
    };
    quizManager.quizzes.set(channelId, quizState);

    quizManager.stopQuiz(channelId);

    expect(quizState.quizSubscription?.unsubscribe).toHaveBeenCalled();
  });

  it("should handle case where question time is less than summary duration", async () => {
    questions[0]!.questionShowTimeMs = 10;
    questionStorageMock.getQuestions.mockResolvedValue(questions);

    await quizManager.startQuiz(channelId, "quickBank", testScheduler);
    expect(postSpy).toHaveBeenCalledTimes(5);
  });

  it("should correctly handle a quiz with a single question", async () => {
    questionStorageMock.getQuestions.mockResolvedValue([questions[0]]);

    await quizManager.startQuiz(channelId, "singleQuestionBank", testScheduler);

    expect(postSpy).toHaveBeenCalledTimes(3);

    expect(postSpy).lastCalledWith(Routes.channelMessages(channelId), {
      body: {
        embeds: [
          {
            description: "No scores available.",
            title: "Quiz Scores",
          },
        ],
      },
    });
  });

  // New Tests for Uncovered Lines

  it("should return an ephemeral response if there are no valid questions", async () => {
    const response = await quizManager.startQuizInternal([], channelId, testScheduler);
    expect(response).toEqual(createEphemeralResponse("There are no valid questions"));
  });

  it("should include explanation in question summary if provided", async () => {
    const quizState: QuizState = {
      currentQuestionId: questions[0]?.questionId,
      questionBank: questions,
      activeUsers: new Map(),
      correctUsersForQuestion: new Set(),
      quizSubscription: null,
      channelId,
      answeredUsersForQuestion: new Set(),
    };
    quizManager.quizzes.set(channelId, quizState);

    const questionIndex = 0;
    const currentQuestion = questions[questionIndex];
    if (!currentQuestion)
    {
      throw new Error("No such question");
    }

    currentQuestion.explanation = "Sample explanation";

    await quizManager.sendQuestionSummary(channelId, currentQuestion, 1);

    const expectedMessageBody = {
      body: {
        embeds: [
          {
            title: `Summary for Question 1`,
            description: `0 user(s) answered correctly!\nThe correct answer was: ${
                currentQuestion.answers[currentQuestion.correctAnswerIndex]?.answer
            }\nExplanation: Sample explanation`,
          },
        ],
      },
    };

    expect(postSpy).toHaveBeenCalledWith(
        Routes.channelMessages(channelId),
        expectedMessageBody,
    );
  });

  it("should include explanation image in question summary if provided", async () => {
    const quizState: QuizState = {
      currentQuestionId: questions[0]?.questionId,
      questionBank: questions,
      activeUsers: new Map(),
      correctUsersForQuestion: new Set(),
      quizSubscription: null,
      channelId,
      answeredUsersForQuestion: new Set(),
    };
    quizManager.quizzes.set(channelId, quizState);

    const questionIndex = 0;
    const currentQuestion = questions[questionIndex];

    if (!currentQuestion)
    {
      throw new Error("No such question");
    }

    currentQuestion.explanationImagePartitionKey = "explanation-image-key";
    const presignedImageUrl = "https://example.com/presigned-explanation-image-url";

    questionStorageMock.getExplanationImagePresignedUrl.mockResolvedValue(presignedImageUrl);

    await quizManager.sendQuestionSummary(channelId, currentQuestion, 1);

    const expectedMessageBody = {
      body: {
        embeds: [
          {
            title: `Summary for Question 1`,
            description: `0 user(s) answered correctly!\nThe correct answer was: ${
                currentQuestion.answers[currentQuestion.correctAnswerIndex]?.answer
            }`,
            image: { url: presignedImageUrl },
          },
        ],
      },
    };

    expect(postSpy).toHaveBeenCalledWith(
        Routes.channelMessages(channelId),
        expectedMessageBody,
    );
  });

  it("should return an error response if no quiz is found in handleAnswer", async () => {
    const interaction = createAPIMessageComponentInteraction(channelId, "user123", "answer_a1");

    const response = await quizManager.handleAnswer(interaction);

    expect(response).toEqual(createEphemeralResponse("No quiz found for this channel."));
  });

  it("should return an error response if no active question is found in handleAnswer", async () => {
    const quizState: QuizState = {
      currentQuestionId: null,
      questionBank: questions,
      activeUsers: new Map(),
      correctUsersForQuestion: new Set(),
      quizSubscription: null,
      channelId,
      answeredUsersForQuestion: new Set(),
    };
    quizManager.quizzes.set(channelId, quizState);

    const interaction = createAPIMessageComponentInteraction(channelId, "user123", "answer_a1");

    const response = await quizManager.handleAnswer(interaction);

    expect(response).toEqual(createEphemeralResponse("No active question"));
  });

  it("should return an error response if no quiz question is found for the current question ID in handleAnswer", async () => {
    const quizState: QuizState = {
      currentQuestionId: "nonexistent",
      questionBank: questions,
      activeUsers: new Map(),
      correctUsersForQuestion: new Set(),
      quizSubscription: null,
      channelId,
      answeredUsersForQuestion: new Set(),
    };
    quizManager.quizzes.set(channelId, quizState);

    const interaction = createAPIMessageComponentInteraction(channelId, "user123", "answer_a1");

    const response = await quizManager.handleAnswer(interaction);

    expect(response).toEqual(createEphemeralResponse("No quiz question found for this channel."));
  });

  it("should return an error response if no user ID is present in the interaction", async () => {
    const quizState: QuizState = {
      currentQuestionId: questions[0]?.questionId,
      questionBank: questions,
      activeUsers: new Map(),
      correctUsersForQuestion: new Set(),
      quizSubscription: null,
      channelId,
      answeredUsersForQuestion: new Set(),
    };
    quizManager.quizzes.set(channelId, quizState);

    const interaction = {
      ...createAPIMessageComponentInteraction(channelId, "user123", "answer_a1"),
      member: { user: null }, // No user ID
    } as any;

    const response = await quizManager.handleAnswer(interaction);

    expect(response).toEqual(createEphemeralResponse("Invalid user id"));
  });

  it("should return an error response if the selected answer is not part of the current quiz", async () => {
    const quizState: QuizState = {
      currentQuestionId: questions[0]?.questionId,
      questionBank: questions,
      activeUsers: new Map(),
      correctUsersForQuestion: new Set(),
      quizSubscription: null,
      channelId,
      answeredUsersForQuestion: new Set(),
    };
    quizManager.quizzes.set(channelId, quizState);

    const interaction = createAPIMessageComponentInteraction(channelId, "user123", "answer_invalid");

    const response = await quizManager.handleAnswer(interaction);

    expect(response).toEqual(createEphemeralResponse("This answer is not part of the current quiz, answer again."));
  });

  it("should log and return if no quiz state is found in showScores", async () => {
    const consoleLogSpy = vi.spyOn(console, "log");

    await quizManager.showScores(null as any);

    expect(consoleLogSpy).toHaveBeenCalledWith("invalid quiz");
    consoleLogSpy.mockRestore();
  });

  it("should log and return if no valid channel is defined in showScores", async () => {
    const quizState: QuizState = {
      currentQuestionId: questions[0]?.questionId,
      questionBank: questions,
      activeUsers: new Map(),
      correctUsersForQuestion: new Set(),
      quizSubscription: null,
      channelId: null as any,
      answeredUsersForQuestion: new Set(),
    };

    const consoleLogSpy = vi.spyOn(console, "log");

    await quizManager.showScores(quizState);

    expect(consoleLogSpy).toHaveBeenCalledWith("no valid channel defined for the quiz to send scores to");
    consoleLogSpy.mockRestore();
  });

  it("should return an error response if the current question index is not found in nextQuizQuestion", async () => {
    const quizState: QuizState = {
      currentQuestionId: "nonexistent",
      questionBank: questions,
      activeUsers: new Map(),
      correctUsersForQuestion: new Set(),
      quizSubscription: null,
      channelId,
      answeredUsersForQuestion: new Set(),
    };
    quizManager.quizzes.set(channelId, quizState);

    const response = await quizManager.nextQuizQuestion(channelId);

    expect(response).toEqual(createEphemeralResponse("No quiz question found for this channel."));
  });

  it("should return an error response if there are no more questions in nextQuizQuestion", async () => {
    const quizState: QuizState = {
      currentQuestionId: questions[questions.length - 1]?.questionId,
      questionBank: questions,
      activeUsers: new Map(),
      correctUsersForQuestion: new Set(),
      quizSubscription: null,
      channelId,
      answeredUsersForQuestion: new Set(),
    };
    quizManager.quizzes.set(channelId, quizState);

    const response = await quizManager.nextQuizQuestion(channelId);

    expect(response).toEqual(createEphemeralResponse("No more questions in the quiz."));
  });
});
