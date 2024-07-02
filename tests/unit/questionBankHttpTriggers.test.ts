import { describe, it, expect, vi, beforeEach } from "vitest";
import { HttpRequest, InvocationContext } from "@azure/functions";
import { Config } from "@src/util/config.js";
import { QuestionStorage } from "@src/util/questionStorage.js";
import { QuizImageStorage } from "@src/util/quizImageStorage.js";
import {
  deleteQuestionHandler,
  getQuestionHandler,
  getQuestionsHandler,
  updateQuestionHandler,
  getQuestionBankNamesHandler,
} from "@src/functions/questionBankHttpTriggers.js";
import {
  validateAuthAndGuildOwnership,
  isErrorResponse,
} from "@src/util/authHelper.js";

vi.mock("@src/util/authHelper", () => ({
  validateAuthAndGuildOwnership: vi.fn(),
  isErrorResponse: vi.fn(),
}));

vi.mock("@src/util/config.js");

const setupMocks = () => {
  const mockQuestionStorage = {
    deleteQuestion: vi.fn(),
    getQuestion: vi.fn(),
    getQuestions: vi.fn(),
    updateQuestion: vi.fn(),
    getQuestionBankNames: vi.fn(),
    generateAnswer: vi.fn(),
  } as any as QuestionStorage;

  const mockImageStorage = {
    downloadAndValidateImageForDiscord: vi.fn(),
  } as any as QuizImageStorage;

  Config.initialize = vi.fn().mockResolvedValue(undefined);
  Config.questionStorage = mockQuestionStorage;
  Config.imageStorage = mockImageStorage;

  return { mockQuestionStorage, mockImageStorage };
};

const createMockHttpRequest = (
  queryParams: Record<string, string>,
  body?: any,
  headers: Record<string, string> = {},
): HttpRequest =>
  ({
    query: new Map(Object.entries(queryParams)),
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
    headers: new Map(Object.entries(headers)),
  }) as any as HttpRequest;

const createMockInvocationContext = (): InvocationContext =>
  ({
    log: vi.fn(),
    error: vi.fn(),
  }) as any as InvocationContext;

describe("Question Handlers", () => {
  let mockQuestionStorage: QuestionStorage;
  let mockHttpRequest: HttpRequest;
  let mockInvocationContext: InvocationContext;

  beforeEach(() => {
    const mocks = setupMocks();
    mockQuestionStorage = mocks.mockQuestionStorage;
    mockInvocationContext = createMockInvocationContext();
    vi.mocked(validateAuthAndGuildOwnership).mockResolvedValue({
      guildId: "testGuildId",
      userId: "abc",
    });
    vi.mocked(isErrorResponse).mockReturnValue(false);
  });

  describe("deleteQuestionHandler", () => {
    beforeEach(() => {
      mockHttpRequest = createMockHttpRequest({
        bankname: "testBank",
        questionId: "testQuestionId",
      });
    });

    it("should return 400 if bankName or questionId is missing", async () => {
      mockHttpRequest.query.delete("bankname");

      const response = await deleteQuestionHandler(
        mockHttpRequest,
        mockInvocationContext,
      );

      expect(response.status).toBe(400);
      expect(response.body).toBe(
        JSON.stringify("Required fields: bankName, questionId"),
      );
    });

    it("should return 200 if question is deleted successfully", async () => {
      (mockQuestionStorage.deleteQuestion as any).mockResolvedValue(undefined);

      const response = await deleteQuestionHandler(
        mockHttpRequest,
        mockInvocationContext,
      );

      expect(response.status).toBe(200);
      expect(response.body).toBe(
        JSON.stringify("Question deleted successfully"),
      );
    });

    it("should return 500 if an error occurs", async () => {
      (mockQuestionStorage.deleteQuestion as any).mockRejectedValue(
        new Error("Deletion error"),
      );

      const response = await deleteQuestionHandler(
        mockHttpRequest,
        mockInvocationContext,
      );

      expect(response.status).toBe(500);
      expect(response.body).toBe(JSON.stringify("Error deleting question"));
    });
  });

  describe("getQuestionHandler", () => {
    beforeEach(() => {
      mockHttpRequest = createMockHttpRequest({
        bankname: "testBank",
        questionId: "testQuestionId",
      });
    });

    it("should return 400 if bankName or questionId is missing", async () => {
      mockHttpRequest.query.delete("bankname");

      const response = await getQuestionHandler(
        mockHttpRequest,
        mockInvocationContext,
      );

      expect(response.status).toBe(400);
      expect(response.body).toBe(
        JSON.stringify("Required fields: bankName, questionId"),
      );
    });

    it("should return 200 if question is retrieved successfully", async () => {
      const mockQuestion = {
        questionId: "testQuestionId",
        question: "testQuestion",
      };
      (mockQuestionStorage.getQuestion as any).mockResolvedValue(mockQuestion);

      const response = await getQuestionHandler(
        mockHttpRequest,
        mockInvocationContext,
      );

      expect(response.status).toBe(200);
      expect(response.body).toBe(JSON.stringify(mockQuestion));
    });

    it("should return 500 if an error occurs", async () => {
      (mockQuestionStorage.getQuestion as any).mockRejectedValue(
        new Error("Fetch error"),
      );

      const response = await getQuestionHandler(
        mockHttpRequest,
        mockInvocationContext,
      );

      expect(response.status).toBe(500);
      expect(response.body).toBe(JSON.stringify("Error fetching question"));
    });
  });

  describe("updateQuestionHandler", () => {
    beforeEach(() => {
      mockHttpRequest = createMockHttpRequest(
        {},
        {
          bankName: "testBank",
          questionId: "testQuestionId",
          questionText: "updated question",
          answers: ["answer1", "answer2"],
          correctAnswerIndex: 1,
          imageUrl: "http://example.com/image.png",
          explanation: "updated explanation",
          explanationImageUrl: "http://example.com/explanation.png",
          showTimeMs: 30000,
        },
      );
    });

    it("should return 400 if requestBody is missing", async () => {
      mockHttpRequest = createMockHttpRequest({}, null); // Simulate missing request body
      (mockHttpRequest.text as any).mockResolvedValue(undefined);

      const response = await updateQuestionHandler(
        mockHttpRequest,
        mockInvocationContext,
      );

      expect(response.status).toBe(500);
      expect(response.body).toBe(JSON.stringify("Invalid JSON body"));
    });

    it("should return 400 if answers are provided without correctAnswerIndex", async () => {
      (mockHttpRequest.text as any).mockResolvedValue(
        JSON.stringify({
          bankName: "testBank",
          questionId: "testQuestionId",
          questionText: "updated question",
          answers: ["answer1", "answer2"],
          imageUrl: "http://example.com/image.png",
          explanation: "updated explanation",
          explanationImageUrl: "http://example.com/explanation.png",
          showTimeMs: 30000,
        }),
      );

      const response = await updateQuestionHandler(
        mockHttpRequest,
        mockInvocationContext,
      );

      expect(response.status).toBe(400);
      expect(response.body).toBe(
        JSON.stringify("Must have correct answer ID with answers"),
      );
    });

    it("should return 400 if correctAnswerIndex is out of bounds", async () => {
      (mockHttpRequest.text as any).mockResolvedValue(
        JSON.stringify({
          bankName: "testBank",
          questionId: "testQuestionId",
          questionText: "updated question",
          answers: ["answer1", "answer2"],
          correctAnswerIndex: 3,
          imageUrl: "http://example.com/image.png",
          explanation: "updated explanation",
          explanationImageUrl: "http://example.com/explanation.png",
          showTimeMs: 30000,
        }),
      );

      const response = await updateQuestionHandler(
        mockHttpRequest,
        mockInvocationContext,
      );

      expect(response.status).toBe(400);
      expect(response.body).toBe(
        JSON.stringify("Correct answer index must be between 0 and 1"),
      );
    });

    it("should update the correctAnswerId if correctAnswer is found", async () => {
      const mockQuestion = {
        questionId: "testQuestionId",
        question: "testQuestion",
        answers: [],
        correctAnswerId: "",
      };
      (mockQuestionStorage.getQuestion as any).mockResolvedValue(mockQuestion);
      (mockQuestionStorage.generateAnswer as any).mockImplementation(
        (answerText: string) => ({ answerId: answerText, answer: answerText }),
      );

      const requestBody = {
        bankName: "testBank",
        questionId: "testQuestionId",
        questionText: "updated question",
        answers: ["answer1", "answer2"],
        correctAnswerIndex: 1,
        imageUrl: "http://example.com/image.png",
        explanation: "updated explanation",
        explanationImageUrl: "http://example.com/explanation.png",
        showTimeMs: 30000,
      };
      (mockHttpRequest.text as any).mockResolvedValue(
        JSON.stringify(requestBody),
      );

      await updateQuestionHandler(mockHttpRequest, mockInvocationContext);

      expect(mockQuestion.correctAnswerId).toBe("answer2");
    });

    it("should return 400 if bankName or questionId is missing", async () => {
      (mockHttpRequest.text as any).mockResolvedValue(
        JSON.stringify({
          questionId: "testQuestionId",
          questionText: "updated question",
          answers: ["answer1", "answer2"],
          correctAnswerIndex: 1,
          imageUrl: "http://example.com/image.png",
          explanation: "updated explanation",
          explanationImageUrl: "http://example.com/explanation.png",
          showTimeMs: 30000,
        }),
      );

      const response = await updateQuestionHandler(
        mockHttpRequest,
        mockInvocationContext,
      );

      expect(response.status).toBe(400);
      expect(response.body).toBe(
        JSON.stringify("Required fields: bankName, questionId"),
      );
    });

    it("should return 200 if question is updated successfully", async () => {
      const mockQuestion = {
        questionId: "testQuestionId",
        question: "testQuestion",
      };
      (mockQuestionStorage.getQuestion as any).mockResolvedValue(mockQuestion);

      const response = await updateQuestionHandler(
        mockHttpRequest,
        mockInvocationContext,
      );

      expect(response.status).toBe(200);
      expect(response.body).toBe(
        JSON.stringify("Question updated successfully"),
      );
    });

    it("should return 500 if an error occurs", async () => {
      (mockQuestionStorage.getQuestion as any).mockRejectedValue(
        new Error("Update error"),
      );

      const response = await updateQuestionHandler(
        mockHttpRequest,
        mockInvocationContext,
      );

      expect(response.status).toBe(500);
      expect(response.body).toBe(JSON.stringify("Error updating question"));
    });
  });

  describe("getQuestionsHandler", () => {
    beforeEach(() => {
      mockHttpRequest = createMockHttpRequest({ bankname: "testBank" });
    });

    it("should return 400 if bankName is missing", async () => {
      mockHttpRequest.query.delete("bankname");

      const response = await getQuestionsHandler(
        mockHttpRequest,
        mockInvocationContext,
      );

      expect(response.status).toBe(400);
      expect(response.body).toBe(JSON.stringify("Required field: bankname"));
    });

    it("should return 200 if questions are retrieved successfully", async () => {
      const mockQuestions = [
        { questionId: "testQuestionId", question: "testQuestion" },
      ];
      (mockQuestionStorage.getQuestions as any).mockResolvedValue(
        mockQuestions,
      );

      const response = await getQuestionsHandler(
        mockHttpRequest,
        mockInvocationContext,
      );

      expect(response.status).toBe(200);
      expect(response.body).toBe(JSON.stringify(mockQuestions));
    });

    it("should return 500 if an error occurs", async () => {
      (mockQuestionStorage.getQuestions as any).mockRejectedValue(
        new Error("Fetch error"),
      );

      const response = await getQuestionsHandler(
        mockHttpRequest,
        mockInvocationContext,
      );

      expect(response.status).toBe(500);
      expect(response.body).toBe(JSON.stringify("Error retrieving questions"));
    });
  });

  describe("getQuestionBankNamesHandler", () => {
    beforeEach(() => {
      mockHttpRequest = createMockHttpRequest({});
    });

    it("should return 200 if question bank names are retrieved successfully", async () => {
      const mockBankNames = ["testBank1", "testBank2"];
      (mockQuestionStorage.getQuestionBankNames as any).mockResolvedValue(
        mockBankNames,
      );

      const response = await getQuestionBankNamesHandler(
        mockHttpRequest,
        mockInvocationContext,
      );

      expect(response.status).toBe(200);
      expect(response.body).toBe(JSON.stringify(mockBankNames));
    });

    it("should return 500 if an error occurs", async () => {
      (mockQuestionStorage.getQuestionBankNames as any).mockRejectedValue(
        new Error("Fetch error"),
      );

      const response = await getQuestionBankNamesHandler(
        mockHttpRequest,
        mockInvocationContext,
      );

      expect(response.status).toBe(500);
      expect(response.body).toBe(
        JSON.stringify("Error retrieving question bank names"),
      );
    });
  });
});
