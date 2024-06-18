import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import * as questionStorage from '../../src/util/questionStorage';
import { QuizManager } from '../../src/handlers/quizManager';
import { Question } from '../../src/question';

describe('QuizManager', () => {
    let quizManager: QuizManager;
    let mockRest: REST;
    let mockGetQuestions: any;
    let postSpy: any;

    const mockQuestions: Question[] = [
        {
            bankName: 'testBank',
            questionId: 'q1',
            question: 'What is 2 + 2?',
            answers: [
                { answerId: 'a1', answer: '3' },
                { answerId: 'a2', answer: '4' },
                { answerId: 'a3', answer: '5' },
                { answerId: 'a4', answer: '6' },
            ],
            correctAnswerIndex: 1,
            questionShowTimeMs: 1000, // 1 second for quicker test
            explanation: '',
            explanationImageUrl: undefined,
            imageUrl: undefined,
        },
    ];

    beforeEach(() => {
        mockRest = new REST();
        mockGetQuestions = vi.spyOn(questionStorage, 'getQuestions').mockResolvedValue(mockQuestions);
        postSpy = vi.spyOn(mockRest, 'post').mockResolvedValue({});
        quizManager = new QuizManager(mockRest);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should start a quiz and post the first question', async () => {
        // Arrange
        const channelId = 'channel123';
        const questionBankName = 'testBank';

        // Act
        await quizManager.startQuiz(channelId, questionBankName);

        // Wait for the question to be posted (simulate the passage of time)
        await new Promise((resolve) => setTimeout(resolve, (mockQuestions[0]?.questionShowTimeMs ?? 1000) + 100)); // +100ms buffer

        // Assert
        expect(mockGetQuestions).toHaveBeenCalledWith(questionBankName);
        expect(postSpy).toHaveBeenCalledWith(
            Routes.channelMessages(channelId),
            expect.objectContaining({
                body: expect.objectContaining({
                    embeds: expect.arrayContaining([
                        expect.objectContaining({
                            title: 'Quiz Question',
                            description: `${mockQuestions[0]?.question}\n${mockQuestions[0]?.answers
                                .map((answer, index) => `${String.fromCharCode(65 + index)}: ${answer.answer}`)
                                .join('\n')}`,
                        }),
                    ]),
                    components: expect.arrayContaining([
                        expect.objectContaining({
                            type: 1,
                            components: expect.arrayContaining([
                                expect.objectContaining({
                                    custom_id: `answer_${mockQuestions[0]?.answers[0]?.answerId}`,
                                    label: 'A',
                                    style: 1, // ButtonStyle.Primary
                                }),
                            ]),
                        }),
                    ]),
                }),
            })
        );
    });

    // ... other tests (stopQuiz, handleAnswer, etc.)
});
