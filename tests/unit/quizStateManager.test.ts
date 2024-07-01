import { describe, it, expect, vi, beforeEach } from 'vitest';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import { QuizState } from "../../src/handlers/quizState.interfaces.js";
import { Question } from "../../src/question.interfaces.js";
import { postQuestion, sendQuestionSummary, showScores } from "../../src/handlers/quizStateManager.js";
import {QuizImageStorage} from "../../src/util/quizImageStorage.js";

vi.mock("../../src/util/quizImageStorage.js");

describe('Quiz Functions', () => {
    let rest: REST;
    let imageStorage: QuizImageStorage;
    let quiz: QuizState;
    let question: Question;

    let mockRestPost = vi.fn();
    let mockGetExplanationImagePresignedUrl = vi.fn();
    let mockGetQuestionImagePresignedUrl = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        mockRestPost = vi.fn();
        mockGetExplanationImagePresignedUrl = vi.fn();
        mockGetQuestionImagePresignedUrl = vi.fn();

        rest = new REST();
        imageStorage = new QuizImageStorage();

        rest.post = mockRestPost;

        imageStorage.getExplanationImagePresignedUrl = mockGetExplanationImagePresignedUrl;
        imageStorage.getQuestionImagePresignedUrl = mockGetQuestionImagePresignedUrl;


        quiz = {
            answeredUsersForQuestion: new Set(),
            currentQuestionId: '',
            guildId: "123",
            questionBank: [],
            correctUsersForQuestion: new Set(['user1', 'user2']),
            channelId: 'channel-id',
            activeUsers: new Map([
                ['user1', 10],
                ['user2', 8],
                ['user3', 5],
            ])
        };
        question = {
            questionShowTimeMs: 10,
            bankName: 'bankName',
            questionId: 'questionId',
            question: 'What is the capital of France?',
            answers: [
                { answerId: '1', answer: 'Paris' },
                { answerId: '2', answer: 'London' },
                { answerId: '3', answer: 'Berlin' },
            ],
            correctAnswerId: '1',
            explanation: 'Paris is the capital of France.',
            explanationImagePartitionKey: 'explanationImage',
            imagePartitionKey: 'questionImage'
        };
    });

    it('should send question summary', async () => {
        mockGetExplanationImagePresignedUrl.mockResolvedValue('https://example.com/ImageUrl');

        await sendQuestionSummary(rest, imageStorage, question, quiz, 1);

        expect(mockRestPost).toHaveBeenCalledWith(Routes.channelMessages('channel-id'), {
            body: {
                embeds: [
                    {
                        title: 'Summary for Question 1',
                        description: '2 user(s) answered correctly!\nThe correct answer was: Paris\nExplanation: Paris is the capital of France.',
                        image: {
                            url: 'https://example.com/ImageUrl',
                        },
                    },
                ],
            },
        });
    });

    it('should post question', async () => {
        mockGetQuestionImagePresignedUrl.mockResolvedValue("https://example.com/ImageUrl");

        await postQuestion(rest, imageStorage, 'channel-id', 'interaction-id', question);

        expect(mockRestPost).toHaveBeenCalledWith(Routes.channelMessages('channel-id'), {
            body: {
                embeds: [
                    {
                        title: 'Quiz Question',
                        description: '**Question**: What is the capital of France?\nA: Paris\nB: London\nC: Berlin',
                        footer: {
                            text: 'Select the correct answer by clicking the buttons below.',
                        },
                        image: {
                            url: 'https://example.com/ImageUrl',
                        },
                    },
                ],
                components: [
                    {
                        type: 1,
                        components: [
                            { type: 2, style: 1, custom_id: 'answer_interaction-id_1', label: 'A' },
                            { type: 2, style: 1, custom_id: 'answer_interaction-id_2', label: 'B' },
                            { type: 2, style: 1, custom_id: 'answer_interaction-id_3', label: 'C' },
                        ],
                    },
                ],
            },
        });
    });

    it('should show scores', async () => {
        await showScores(rest, quiz);

        expect(mockRestPost).toHaveBeenCalledWith(Routes.channelMessages('channel-id'), {
            body: {
                embeds: [
                    {
                        title: 'Quiz Scores',
                        description: '<@user1>: 10 points\n<@user2>: 8 points\n<@user3>: 5 points\n',
                    },
                ],
            },
        });
    });

    it('should handle no scores', async () => {
        quiz.activeUsers.clear();

        await showScores(rest, quiz);

        expect(mockRestPost).toHaveBeenCalledWith(Routes.channelMessages('channel-id'), {
            body: {
                embeds: [
                    {
                        title: 'Quiz Scores',
                        description: 'No scores available.',
                    },
                ],
            },
        });
    });

    it('should log and return if quiz is invalid', async () => {
        const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        await showScores(rest, null!);

        expect(consoleLogSpy).toHaveBeenCalledWith("invalid quiz");
        expect(mockRestPost).not.toHaveBeenCalled();

        consoleLogSpy.mockRestore();
    });

    it('should log and return if channelId is invalid', async () => {
        const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        quiz.channelId = '';

        await showScores(rest, quiz);

        expect(consoleLogSpy).toHaveBeenCalledWith("no valid channel defined for the quiz to send scores to");
        expect(mockRestPost).not.toHaveBeenCalled();

        consoleLogSpy.mockRestore();
    });

    it('should handle question summary without explanation', async () => {
        question.explanation = '';

        await sendQuestionSummary(rest, imageStorage, question, quiz, 1);

        expect(mockRestPost).toHaveBeenCalledWith(Routes.channelMessages('channel-id'), {
            body: {
                embeds: [
                    {
                        title: 'Summary for Question 1',
                        description: '2 user(s) answered correctly!\nThe correct answer was: Paris',
                    },
                ],
            },
        });
    });
});
