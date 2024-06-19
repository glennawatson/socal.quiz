import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {
    APIInteraction,
    APIInteractionResponseChannelMessageWithSource,
    APIMessage,
    APIMessageButtonInteractionData,
    APIMessageComponentInteraction,
    APIUser,
    ChannelType,
    ComponentType,
    GuildMemberFlags,
    InteractionResponseType,
    InteractionType,
    MessageType,
    RESTPostAPIChannelMessageJSONBody,
    Routes,
    UserFlags,
} from "discord-api-types/v10";
import {QuizManager} from "../../src/handlers/quizManager";
import {Question} from "../../src/question";
import {QuizState} from "../../src/handlers/quizState";
import {createEphemeralResponse} from "../../src/util/interactionHelpers";
import {asyncScheduler, SchedulerLike} from "rxjs";
import {EmbedBuilder} from "@discordjs/builders";

describe("QuizManager", () => {
    let quizManager: QuizManager;
    let postSpy: any;
    let quizStateStorageMock: any;
    let questions: Question[];
    let testScheduler: SchedulerLike;

    const channelId = "channel123";

    beforeEach(() => {
        // vi.useFakeTimers();
        vi.useRealTimers();

        // Mock REST
        const rest = {
            post: vi.fn(),
        };

        postSpy = rest.post;

        // Mock quizStateStorage
        quizStateStorageMock = {
            getQuestions: vi.fn(),
        };

        testScheduler = asyncScheduler;

        quizManager = new QuizManager(rest as any, quizStateStorageMock, 20);

        // Mock Questions
        questions = [
            {
                bankName: "bank1",
                questionId: "q1",
                question: "What is 2 + 2?",
                answers: [
                    {answerId: "a1", answer: "3"},
                    {answerId: "a2", answer: "4"},
                    {answerId: "a3", answer: "5"},
                    {answerId: "a4", answer: "6"},
                ],
                correctAnswerIndex: 1, // Index of the correct answer
                questionShowTimeMs: 50,
            },
            {
                bankName: "bank1",
                questionId: "q2",
                question: "What is the capital of France?",
                answers: [
                    {answerId: "b1", answer: "Berlin"},
                    {answerId: "b2", answer: "Paris"},
                    {answerId: "b3", answer: "Madrid"},
                    {answerId: "b4", answer: "Rome"},
                ],
                correctAnswerIndex: 1,
                questionShowTimeMs: 50,
            },
        ];
    });

    afterEach(() => {
        // vi.runOnlyPendingTimers();
        vi.useRealTimers();
        vi.resetAllMocks();
    });

    it("should start a quiz and post the first question", async () => {
        const questionBankName = "bank1";

        quizStateStorageMock.getQuestions.mockResolvedValue(questions);

        // Start the quiz
        await quizManager.startQuiz(channelId, questionBankName, testScheduler);

        console.log('finished quiz interaction for this test');
        // Expected message body
        const expectedMessageBody = {
            body: {
                embeds: [
                    {
                        title: "Quiz Question",
                        description: `**Question**: What is 2 + 2?\nA: 3\nB: 4\nC: 5\nD: 6`,
                        footer: {
                            text: "Select the correct answer by clicking the buttons below.",
                        },
                    },
                ],
                components: [
                    {
                        type: 1,
                        components: [
                            {custom_id: "answer_a1", label: "A", style: 1, type: 2},
                            {custom_id: "answer_a2", label: "B", style: 1, type: 2},
                            {custom_id: "answer_a3", label: "C", style: 1, type: 2},
                            {custom_id: "answer_a4", label: "D", style: 1, type: 2},
                        ],
                    },
                ],
            },
        };

        // Assert
        expect(quizStateStorageMock.getQuestions).toHaveBeenCalledWith(
            questionBankName
        );
        expect(postSpy).toHaveBeenCalledWith(
            Routes.channelMessages(channelId),
            expectedMessageBody
        );
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

        const interaction: APIMessageComponentInteraction = {
            type: InteractionType.MessageComponent,
            data: {
                custom_id: `answer_${questions[0]?.answers[questions[0]?.correctAnswerIndex]?.answerId}`, // Custom ID for the correct answer
            },
            member: {user: {id: "user123"}},
            guild_id: "guild123",
            channel_id: channelId,
            channel: {id: channelId},
        } as any;

        const response = await quizManager.handleAnswer(interaction) as APIInteractionResponseChannelMessageWithSource;

        // Assert
        expect(response.type).toBe(InteractionResponseType.ChannelMessageWithSource);
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
                        description: `0 user(s) answered correctly!\nThe correct answer was: ${questions[questionIndex]?.answers[questions[questionIndex]?.correctAnswerIndex]?.answer ?? ''}`
                    }
                ]
            },
        };

        expect(postSpy).toHaveBeenCalledWith(
            Routes.channelMessages(channelId),
            expectedMessageBody
        );
    });

    it("should show scores correctly", async () => {
        const quizState: QuizState = {
            // ... (your quiz state setup)
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

        expect(postSpy).toHaveBeenCalledWith(
            Routes.channelMessages(channelId),
            {
                body: {
                    embeds: [expectedEmbed.toJSON()],
                },
            }
        );

        expect(postSpy).toHaveBeenCalledWith(
            Routes.channelMessages(channelId),
            {
                body: {
                    embeds: [expectedEmbed.toJSON()],
                },
            }
        );
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
                            {custom_id: "answer_b1", label: "A", style: 1, type: 2},
                            {custom_id: "answer_b2", label: "B", style: 1, type: 2},
                            {custom_id: "answer_b3", label: "C", style: 1, type: 2},
                            {custom_id: "answer_b4", label: "D", style: 1, type: 2},
                        ],
                    },
                ],
            },
        };

        expect(postSpy).toHaveBeenCalledWith(
            Routes.channelMessages(channelId),
            expectedMessageBody
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

        const interactionData: APIMessageButtonInteractionData = {
            custom_id: `answer_${questions[0]?.answers[2]?.answerId}`, // incorrect answer id.
            component_type: ComponentType.Button
        }

        const author: APIUser = {
            avatar: '', discriminator: "", global_name: '', id: "123", username: "123"

        }

        const apiMessage: APIMessage = {
            attachments: [],
            author: author,
            content: "",
            edited_timestamp: '',
            embeds: [],
            mention_everyone: false,
            mention_roles: [],
            mentions: [],
            pinned: false,
            timestamp: "",
            tts: false,
            id: '123',
            channel_id: channelId,
            type: MessageType.ChatInputCommand
        }

        const interaction: APIMessageComponentInteraction = {
            app_permissions: "",
            application_id: "",
            authorizing_integration_owners: {},
            channel: {id: channelId, type: ChannelType.GuildVoice},
            channel_id: channelId,
            data: interactionData,
            entitlements: [],
            id: "",
            locale: 'en-US',
            message: apiMessage,
            token: "",
            type: InteractionType.MessageComponent,
            version: 1,
            member: {
                user: author,
                roles: [],
                permissions: '',
                joined_at: '',
                deaf: false,
                mute: false,
                flags: GuildMemberFlags.CompletedOnboarding
            }
        };

        const response = await quizManager.handleAnswer(interaction) as APIInteractionResponseChannelMessageWithSource;

        expect(response.type).toBe(InteractionResponseType.ChannelMessageWithSource);
        expect(response.data.content).toBe("Incorrect!");
        expect(quizState.activeUsers.get("user123")).toBe(0); // Score should not change
    });

    it("should handle an invalid interaction type", async () => {
        const interaction: APIInteraction = {
            type: InteractionType.ApplicationCommand, // Invalid interaction type
            // ... (other properties)
        } as any;

        const response = await quizManager.handleAnswer(interaction);

        expect(response).toEqual(createEphemeralResponse("Invalid interaction type."));
    });

    it("should handle an empty question bank", async () => {
        // Mock an empty question bank
        quizStateStorageMock.getQuestions.mockResolvedValue([]);

        // Start the quiz (expecting it to fail)
        await quizManager.startQuiz(channelId, "emptyBank", testScheduler);

        // You might expect a specific error message or behavior in this case
        expect(postSpy).not.toHaveBeenCalled();
    });

    it("should not start a quiz if there are no questions in the bank", async () => {
        quizStateStorageMock.getQuestions.mockResolvedValue([]);

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
            answeredUsersForQuestion: new Set(),
            channelId,
        };
        quizManager.quizzes.set(channelId, quizState);

        const interaction: APIMessageComponentInteraction = {
            type: InteractionType.MessageComponent,
            data: {custom_id: `answer_${questions[0]?.answers[1]?.answerId}`},
            member: {user: {id: "user123"}},
            guild_id: "guild123",
            channel_id: channelId,
            channel: {id: channelId},
        } as any;

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

        const user1Interaction: APIMessageComponentInteraction = {
            type: InteractionType.MessageComponent,
            data: {custom_id: `answer_${questions[0]?.answers[1]?.answerId}`},
            member: {user: {id: "user1"}},
            guild_id: "guild123",
            channel_id: channelId,
            channel: {id: channelId},
        } as any;

        const user2Interaction: APIMessageComponentInteraction = {
            type: InteractionType.MessageComponent,
            data: {custom_id: `answer_${questions[0]?.answers[1]?.answerId}`},
            member: {user: {id: "user2"}},
            guild_id: "guild123",
            channel_id: channelId,
            channel: {id: channelId},
        } as any;

        await quizManager.handleAnswer(user1Interaction);
        await quizManager.handleAnswer(user2Interaction);

        expect(quizState.activeUsers.get("user1")).toBe(1);
        expect(quizState.activeUsers.get("user2")).toBe(1);
    });

    it("should correctly handle questions with images", async () => {
        questions[0]!.imageUrl = "https://example.com/image.png";
        const questionBankName = "bankWithImage";

        quizStateStorageMock.getQuestions.mockResolvedValue(questions);

        await quizManager.startQuiz(channelId, questionBankName, testScheduler);

        expect(postSpy).toHaveBeenCalledWith(
            Routes.channelMessages(channelId),
            expect.objectContaining({
                body: expect.objectContaining({
                    embeds: expect.arrayContaining([
                        expect.objectContaining({
                            image: {url: "https://example.com/image.png"},
                        }),
                    ]),
                }),
            })
        );
    });

    it("should handle the scenario where there are no correct answers", async () => {
        questions[0]!.correctAnswerIndex = -1;
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

        const interaction: APIMessageComponentInteraction = {
            type: InteractionType.MessageComponent,
            data: {custom_id: `answer_${questions[0]?.answers[1]?.answerId}`},
            member: {user: {id: "user123"}},
            guild_id: "guild123",
            channel_id: channelId,
            channel: {id: channelId},
        } as any;

        const response = await quizManager.handleAnswer(interaction) as APIInteractionResponseChannelMessageWithSource;

        expect(response.data.content).toBe("Incorrect!");
    });

    it('should handle an invalid question format gracefully', async () => {
        questions[0]!.question = undefined as any;
        quizStateStorageMock.getQuestions.mockResolvedValue(questions);

        const response = await quizManager.startQuiz(channelId, 'invalidBank', testScheduler);

        expect(response).toEqual(
            createEphemeralResponse('There are invalid questions with IDs: q1')
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

        const consoleErrorSpy = vi.spyOn(console, 'error');

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

    const createInteraction = (
        customId: string,
        userId: string,
        messageId: string
    ): APIMessageComponentInteraction => ({
        type: InteractionType.MessageComponent,
        data: {
            custom_id: customId,
            component_type: ComponentType.Button,
        },
        member: {
            deaf: false,
            flags: GuildMemberFlags.CompletedOnboarding,
            user: {
                username: '123',
                id: userId,
                discriminator: '123',
                flags: UserFlags.Collaborator,
                global_name: null,
                avatar: null
            },
            permissions: '',
            joined_at: '',
            roles: [],
            mute: false
        },
        guild_id: "guild123",
        channel_id: channelId,
        channel: {id: channelId, type: ChannelType.GuildVoice},
        message: {id: messageId, channel_id: channelId} as any,
        id: "interaction1",
        token: "token",
        version: 1,
        locale: "en-US",
        app_permissions: "",
        application_id: "",
        authorizing_integration_owners: {},
        entitlements: [],
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
        postSpy.mockImplementation(async (route: string, {body}: { body: RESTPostAPIChannelMessageJSONBody }) => {
            if (route === Routes.channelMessages(channelId)) {
                const content = body.content || body.embeds && body.embeds[0]?.description;

                if (content?.includes("What is 2 + 2?")) {
                    // Simulate user answering the first question correctly
                    await quizManager.handleAnswer(
                        createInteraction(
                            "answer_a2",
                            "user1",
                            "message1"
                        )
                    );
                } else if (content?.includes("What is the capital of France?")) {
                    // Simulate user answering the second question correctly
                    await quizManager.handleAnswer(
                        createInteraction(
                            "answer_b2",
                            "user1",
                            "message2"
                        )
                    );
                }
            }
        });

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
            }
        );
    });

    it("should unsubscribe from quiz timer when the quiz is stopped", async () => {
        const quizState: QuizState = {
            currentQuestionId: questions[0]?.questionId,
            questionBank: questions,
            activeUsers: new Map(),
            correctUsersForQuestion: new Set(),
            quizSubscription: {unsubscribe: vi.fn()} as any,
            channelId,
            answeredUsersForQuestion: new Set(),
        };
        quizManager.quizzes.set(channelId, quizState);

        quizManager.stopQuiz(channelId);

        expect(quizState.quizSubscription?.unsubscribe).toHaveBeenCalled();
    });

    it("should handle case where question time is less than summary duration", async () => {
        questions[0]!.questionShowTimeMs = 10;
        quizStateStorageMock.getQuestions.mockResolvedValue(questions);

        await quizManager.startQuiz(channelId, "quickBank", testScheduler);
        expect(postSpy).toHaveBeenCalledTimes(5);
    });

    it("should correctly handle a quiz with a single question", async () => {
        quizStateStorageMock.getQuestions.mockResolvedValue([questions[0]]);

        await quizManager.startQuiz(channelId, "singleQuestionBank", testScheduler);

        expect(postSpy).toHaveBeenCalledTimes(3);

        expect(postSpy).lastCalledWith(
            Routes.channelMessages(channelId),
            {
                body: {
                    embeds: [{
                        description: "No scores available.",
                        title: 'Quiz Scores'
                    }],
                }
            }
        );
    });
});
