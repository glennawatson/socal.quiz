import {IQuestionStorage} from "../../../src/util/IQuestionStorage.interfaces.js";
import {Question} from "../../../src/question.interfaces.js";
import {Answer} from "../../../src/answer.interfaces.js";

export class MockQuizQuestionStorage implements IQuestionStorage {
    async getQuestions(_bankName: string): Promise<Question[]> {
        return []; // Return an empty array or mock data
    }

    async deleteQuestionBank(_bankName: string): Promise<void> {
        // Mock implementation
    }

    async deleteQuestion(_bankName: string, _questionId: string): Promise<void> {
        // Mock implementation
    }

    async generateAndAddQuestion(
        _bankName: string,
        _questionText: string,
        _answers: Answer[],
        _correctAnswerId: string,
        _questionShowTimeMs: number,
        _imageUrl?: string,
        _explanation?: string,
        _explanationImageUrl?: string
    ): Promise<void> {
        // Mock implementation
    }

    async generateQuestion(
        bankName: string,
        questionText: string,
        answers: Answer[],
        correctAnswerId: string,
        questionShowTimeMs: number,
        imageUrl?: string,
        explanation?: string,
        explanationImageUrl?: string
    ): Promise<Question> {
        return {
            bankName: bankName,
            questionId: "mock-question-id",
            question: questionText,
            answers: answers,
            correctAnswerId: correctAnswerId,
            questionShowTimeMs: questionShowTimeMs,
            imagePartitionKey: imageUrl,
            explanation: explanation,
            explanationImagePartitionKey: explanationImageUrl
        };
    }

    async generateAnswer(_answerText: string): Promise<Answer> {
        return {
            answerId: "mock-answer-id",
            answer: _answerText
        };
    }

    async updateQuestion(_question: Question): Promise<void> {
        // Mock implementation
    }
}