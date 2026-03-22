import { describe, it, expect, vi, beforeEach } from "vitest";
import { HttpRequest, InvocationContext } from "@azure/functions";
import { Config } from "@src/util/config.js";
import { QuestionStorage } from "@src/util/questionStorage.js";
import { QuizImageStorage } from "@src/util/quizImageStorage.js";
import {
  deleteQuestionBankHandler,
  getQuestionBankHandler,
  upsertQuestionBankHandler,
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
    getQuestionBank: vi.fn(),
    deleteQuestionBank: vi.fn(),
    getQuestionBankNames: vi.fn(),
    generateQuestion: vi.fn(),
    generateAnswer: vi.fn(),
    upsertQuestionBank: vi.fn(),
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

  describe("deleteQuestionBankHandler", () => {
    beforeEach(() => {
      mockHttpRequest = createMockHttpRequest({
        bankname: "testBank",
      });
    });

    it("should return 400 if bankName is missing", async () => {
      mockHttpRequest.query.delete("bankname");

      const response = await deleteQuestionBankHandler(
        mockHttpRequest,
        mockInvocationContext,
      );

      expect(response.status).toBe(400);
      expect(response.body).toBe(
        JSON.stringify("Required fields: bankName, questionId"),
      );
    });

    it("should return 200 if question bank is deleted successfully", async () => {
      (mockQuestionStorage.deleteQuestionBank as any).mockResolvedValue(undefined);

      const response = await deleteQuestionBankHandler(
        mockHttpRequest,
        mockInvocationContext,
      );

      expect(response.status).toBe(200);
      expect(response.body).toBe(
        JSON.stringify("Question deleted successfully"),
      );
    });

    it("should return 500 if an error occurs", async () => {
      (mockQuestionStorage.deleteQuestionBank as any).mockRejectedValue(
        new Error("Deletion error"),
      );

      const response = await deleteQuestionBankHandler(
        mockHttpRequest,
        mockInvocationContext,
      );

      expect(response.status).toBe(500);
      expect(response.body).toBe(JSON.stringify("Error deleting question"));
    });
  });

  describe("getQuestionBankHandler", () => {
    beforeEach(() => {
      mockHttpRequest = createMockHttpRequest({
        bankname: "testBank",
        questionId: "testQuestionId",
      });
    });

    it("should return 400 if bankName or questionId is missing", async () => {
      mockHttpRequest.query.delete("bankname");

      const response = await getQuestionBankHandler(
        mockHttpRequest,
        mockInvocationContext,
      );

      expect(response.status).toBe(400);
      expect(response.body).toBe(
        JSON.stringify("Required fields: bankName, questionId"),
      );
    });

    it("should return 200 if question bank is retrieved successfully", async () => {
      const mockQuestionBank = {
        name: "testBank",
        guildId: "testGuildId",
        questions: [{ questionId: "testQuestionId", question: "testQuestion" }],
      };
      (mockQuestionStorage.getQuestionBank as any).mockResolvedValue(mockQuestionBank);

      const response = await getQuestionBankHandler(
        mockHttpRequest,
        mockInvocationContext,
      );

      expect(response.status).toBe(200);
      expect(response.body).toBe(JSON.stringify(mockQuestionBank));
    });

    it("should return 500 if an error occurs", async () => {
      (mockQuestionStorage.getQuestionBank as any).mockRejectedValue(
        new Error("Fetch error"),
      );

      const response = await getQuestionBankHandler(
        mockHttpRequest,
        mockInvocationContext,
      );

      expect(response.status).toBe(500);
      expect(response.body).toBe(JSON.stringify("Error fetching question"));
    });
  });

  describe("upsertQuestionBankHandler", () => {
    beforeEach(() => {
      mockHttpRequest = createMockHttpRequest(
        {},
        {
          name: "testBank",
          guildId: "testGuildId",
          questions: [
            {
              questionId: "testQuestionId",
              question: "updated question",
              answers: [
                { answerId: "a1", answer: "answer1" },
                { answerId: "a2", answer: "answer2" },
              ],
              correctAnswerId: "a2",
              questionShowTimeMs: 30000,
            },
          ],
        },
      );
    });

    it("should return 500 if requestBody is missing", async () => {
      mockHttpRequest = createMockHttpRequest({}, null);
      (mockHttpRequest.text as any).mockResolvedValue(undefined);

      const response = await upsertQuestionBankHandler(
        mockHttpRequest,
        mockInvocationContext,
      );

      expect(response.status).toBe(500);
      expect(response.body).toBe(JSON.stringify("Invalid JSON body"));
    });

    it("should return 200 if question bank is upserted successfully", async () => {
      const response = await upsertQuestionBankHandler(
        mockHttpRequest,
        mockInvocationContext,
      );

      expect(response.status).toBe(200);
      expect(response.body).toBe(
        JSON.stringify("Question updated successfully"),
      );
    });

    it("should return 500 if an error occurs", async () => {
      (mockQuestionStorage.upsertQuestionBank as any).mockRejectedValue(
        new Error("Update error"),
      );

      const response = await upsertQuestionBankHandler(
        mockHttpRequest,
        mockInvocationContext,
      );

      expect(response.status).toBe(500);
      expect(response.body).toBe(JSON.stringify("Error updating question"));
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
