import { IQuestionStorage } from "../../../src/util/IQuestionStorage.interfaces.js";
import { Question } from "../../../src/question.interfaces.js";
import { Answer } from "../../../src/answer.interfaces.js";

export class MockQuizQuestionStorage implements IQuestionStorage {
  async getQuestions(_guildId: string, _bankName: string): Promise<Question[]> {
    return []; // Return an empty array or mock data
  }

  async getQuestion(
    guildId: string,
    bankName: string,
    id: string,
  ): Promise<Question> {
    return {
      guildId: guildId,
      bankName: bankName,
      questionId: id,
      question: "mock question",
      answers: [],
      correctAnswerId: "mock-correct-answer-id",
      questionShowTimeMs: 20000,
      imagePartitionKey: undefined,
      explanation: undefined,
      explanationImagePartitionKey: undefined,
    };
  }

  async deleteQuestionBank(_guildId: string, _bankName: string): Promise<void> {
    // Mock implementation
  }

  async deleteQuestion(
    _guildId: string,
    _bankName: string,
    _questionId: string,
  ): Promise<void> {
    // Mock implementation
  }

  async getQuestionBankNames(_guildId: string): Promise<string[]> {
    return ["mock-bank1", "mock-bank2"]; // Return mock data
  }

  async generateAndAddQuestion(
    _guildId: string,
    _bankName: string,
    _questionText: string,
    _answers: Answer[],
    _correctAnswerId: string,
    _questionShowTimeMs: number,
    _imageUrl?: string,
    _explanation?: string,
    _explanationImageUrl?: string,
  ): Promise<void> {
    // Mock implementation
  }

  async generateQuestion(
    guildId: string,
    bankName: string,
    questionText: string,
    answers: Answer[],
    correctAnswerId: string,
    questionShowTimeMs: number,
    imageUrl?: string,
    explanation?: string,
    explanationImageUrl?: string,
  ): Promise<Question> {
    return {
      guildId: guildId,
      bankName: bankName,
      questionId: "mock-question-id",
      question: questionText,
      answers: answers,
      correctAnswerId: correctAnswerId,
      questionShowTimeMs: questionShowTimeMs,
      imagePartitionKey: imageUrl,
      explanation: explanation,
      explanationImagePartitionKey: explanationImageUrl,
    };
  }

  async generateAnswer(_answerText: string): Promise<Answer> {
    return {
      answerId: "mock-answer-id",
      answer: _answerText,
    };
  }

  async updateQuestion(_guildId: string, _question: Question): Promise<void> {
    // Mock implementation
  }
}
