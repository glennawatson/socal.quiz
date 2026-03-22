import { IQuestionStorage } from "../../../src/util/IQuestionStorage.interfaces.js";
import { Question } from "../../../src/question.interfaces.js";
import { Answer } from "../../../src/answer.interfaces.js";
import { QuestionBank } from "../../../src/questionBank.interfaces.js";

export class MockQuizQuestionStorage implements IQuestionStorage {
  async getQuestionBank(guildId: string, bankName: string): Promise<QuestionBank> {
    return {
      guildId: guildId,
      name: bankName,
      questions: [],
    };
  }

  async deleteQuestionBank(_guildId: string, _bankName: string): Promise<void> {
    // Mock implementation
  }

  async getQuestionBankNames(_guildId: string): Promise<string[]> {
    return ["mock-bank1", "mock-bank2"]; // Return mock data
  }

  async generateQuestion(
    questionText: string,
    answers: Answer[],
    correctAnswerId: string,
    questionShowTimeMs: number,
    imageUrl?: string,
    explanation?: string,
    explanationImageUrl?: string,
  ): Promise<Question> {
    return {
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

  async upsertQuestionBank(_questionBank: QuestionBank): Promise<void> {
    // Mock implementation
  }
}
