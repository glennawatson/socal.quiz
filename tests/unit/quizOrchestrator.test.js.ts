import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DateTime } from 'luxon';
import {Config} from "../../src/util/config.js";
import {QuizState} from "../../src/handlers/quizState.interfaces.js";

// Mocks
vi.mock('durable-functions', () => {
    return {
        getClient: vi.fn(),
        app: {
            orchestration: vi.fn(),
            activity: vi.fn()
        },
        Task: {
            any: vi.fn()
        }
    };
});
vi.mock('../handlers/quizStateManager.js');
vi.mock('../util/config.js');

const mockCallActivity = vi.fn();
const mockGetInput = vi.fn();
const mockWaitForExternalEvent = vi.fn();
const mockCreateTimer = vi.fn();
const mockTaskAny = vi.fn();
const mockGetClient = vi.fn();

const orchestrationContext = {
    df: {
        getInput: mockGetInput,
        callActivity: mockCallActivity,
        waitForExternalEvent: mockWaitForExternalEvent,
        createTimer: mockCreateTimer,
        Task: { any: mockTaskAny }
    }
};

const mockRest = {
    post: vi.fn()
};
const mockImageStorage = {
    getExplanationImagePresignedUrl: vi.fn(),
    getQuestionImagePresignedUrl: vi.fn()
};

Config.rest = mockRest;
Config.imageStorage = mockImageStorage;

describe('QuizOrchestrator', () => {
    let quiz : QuizState;

    beforeEach(() => {
        vi.clearAllMocks();

        quiz = {
            answeredUsersForQuestion: new Set(),
            currentQuestionId: '',
            guildId: "123",
            questionBank: [
                {
                    questionId: 'q1',
                    question: 'What is the capital of France?',
                    answers: [
                        { answerId: '1', answer: 'Paris' },
                        { answerId: '2', answer: 'London' },
                        { answerId: '3', answer: 'Berlin' }
                    ],
                    correctAnswerId: '1',
                    questionShowTimeMs: 5000
                }
            ],
            correctUsersForQuestion: new Set(),
            channelId: 'channel-id',
            activeUsers: new Map()
        };

        mockGetInput.mockReturnValue(quiz);
        mockTaskAny.mockImplementation((tasks) => Promise.race(tasks));
    });

    it('should execute quiz orchestrator normally', async () => {
        const questionTime = DateTime.now().plus({ milliseconds: quiz.questionBank[0].questionShowTimeMs });
        mockCreateTimer.mockReturnValue(Promise.resolve());
        mockWaitForExternalEvent.mockReturnValue(Promise.resolve());

        const orchestrator = (await import('../handlers/quizOrchestrator.js')).QuizOrchestrator;
        await orchestrator(orchestrationContext);

        expect(mockCallActivity).toHaveBeenCalledWith('PostQuestion', quiz);
        expect(mockCallActivity).toHaveBeenCalledWith('SendQuestionSummary', { quiz, questionNumber: 1 });
        expect(mockCallActivity).toHaveBeenCalledWith('ShowScores', quiz);
    });

    it('should skip question when skipQuestion event is received', async () => {
        const questionTime = DateTime.now().plus({ milliseconds: quiz.questionBank[0].questionShowTimeMs });
        mockCreateTimer.mockReturnValue(Promise.resolve());
        mockWaitForExternalEvent.mockReturnValueOnce(Promise.resolve('skipQuestion')).mockReturnValue(Promise.resolve());

        const orchestrator = (await import('../handlers/quizOrchestrator.js')).QuizOrchestrator;
        await orchestrator(orchestrationContext);

        expect(mockCallActivity).toHaveBeenCalledWith('PostQuestion', quiz);
        expect(mockCallActivity).toHaveBeenCalledWith('ShowScores', quiz);
    });

    it('should cancel quiz when cancelQuiz event is received', async () => {
        mockCreateTimer.mockReturnValue(Promise.resolve());
        mockWaitForExternalEvent.mockReturnValueOnce(Promise.resolve('cancelQuiz')).mockReturnValue(Promise.resolve());

        const orchestrator = (await import('../handlers/quizOrchestrator.js')).QuizOrchestrator;
        await orchestrator(orchestrationContext);

        expect(mockCallActivity).not.toHaveBeenCalledWith('SendQuestionSummary', { quiz, questionNumber: 1 });
        expect(mockCallActivity).toHaveBeenCalledWith('ShowScores', quiz);
    });
});

describe('Activity Functions', () => {
    const context = {
        invocationId: '123',
        log: vi.fn()
    };

    describe('PostQuestion', () => {
        it('should post question', async () => {
            const input = {
                channelId: 'channel-id',
                currentQuestionId: 'q1',
                questionBank: [
                    {
                        questionId: 'q1',
                        question: 'What is the capital of France?',
                        answers: [
                            { answerId: '1', answer: 'Paris' },
                            { answerId: '2', answer: 'London' },
                            { answerId: '3', answer: 'Berlin' }
                        ],
                        correctAnswerId: '1',
                        questionShowTimeMs: 5000
                    }
                ]
            };

            await (await import('../handlers/quizOrchestrator.js')).PostQuestion(input, context);

            expect(postQuestion).toHaveBeenCalledWith(Config.rest, Config.imageStorage, 'channel-id', context.invocationId, input.questionBank[0]);
        });
    });

    describe('SendQuestionSummary', () => {
        it('should send question summary', async () => {
            const input = {
                currentQuestionId: 'q1',
                questionBank: [
                    {
                        questionId: 'q1',
                        question: 'What is the capital of France?',
                        answers: [
                            { answerId: '1', answer: 'Paris' },
                            { answerId: '2', answer: 'London' },
                            { answerId: '3', answer: 'Berlin' }
                        ],
                        correctAnswerId: '1',
                        questionShowTimeMs: 5000
                    }
                ],
                correctUsersForQuestion: new Set(['user1']),
                activeUsers: new Map([['user1', 1]])
            };

            await (await import('../handlers/quizOrchestrator.js')).SendQuestionSummary(input, context);

            expect(sendQuestionSummary).toHaveBeenCalledWith(Config.rest, Config.imageStorage, input.questionBank[0], input, 1);
        });
    });

    describe('ShowScores', () => {
        it('should show scores', async () => {
            const input = {
                channelId: 'channel-id',
                activeUsers: new Map([['user1', 1], ['user2', 2]])
            };

            await (await import('../handlers/quizOrchestrator.js')).ShowScores(input, context);

            expect(showScores).toHaveBeenCalledWith(Config.rest, input);
        });
    });
});
