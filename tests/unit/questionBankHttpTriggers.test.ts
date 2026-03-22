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
  getGuildsHandler,
} from "@src/functions/questionBankHttpTriggers.js";
import {
  validateAuthAndGuildOwnership,
  validateAuth,
  isErrorResponse,
  isValidationSuccess,
} from "@src/util/authHelper.js";

vi.mock("@src/util/authHelper", () => ({
  validateAuthAndGuildOwnership: vi.fn(),
  validateAuth: vi.fn(),
  isErrorResponse: vi.fn(),
  isValidationSuccess: vi.fn(),
}));

vi.mock("@src/util/config.js");

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

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
    downloadAndValidateAnswerImage: vi.fn(),
  } as any as QuizImageStorage;

  const mockRest = {
    get: vi.fn(),
  };

  Config.initialize = vi.fn().mockResolvedValue(undefined);
  Config.questionStorage = mockQuestionStorage;
  Config.imageStorage = mockImageStorage;
  (Config as any).rest = mockRest;

  return { mockQuestionStorage, mockImageStorage, mockRest };
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
  let mockImageStorage: QuizImageStorage;
  let mockRest: any;
  let mockHttpRequest: HttpRequest;
  let mockInvocationContext: InvocationContext;

  beforeEach(() => {
    const mocks = setupMocks();
    mockQuestionStorage = mocks.mockQuestionStorage;
    mockImageStorage = mocks.mockImageStorage;
    mockRest = mocks.mockRest;
    mockInvocationContext = createMockInvocationContext();
    vi.mocked(validateAuthAndGuildOwnership).mockResolvedValue({
      guildId: "testGuildId",
      userId: "abc",
    });
    vi.mocked(isErrorResponse).mockReturnValue(false);
    mockFetch.mockReset();
  });

  describe("deleteQuestionBankHandler", () => {
    beforeEach(() => {
      mockHttpRequest = createMockHttpRequest({
        bankname: "testBank",
      });
    });

    it("should return auth error when validateAuthAndGuildOwnership fails", async () => {
      const authError = {
        status: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify("Unauthorized"),
      };
      vi.mocked(validateAuthAndGuildOwnership).mockResolvedValue(authError);
      vi.mocked(isErrorResponse).mockReturnValue(true);

      const response = await deleteQuestionBankHandler(
        mockHttpRequest,
        mockInvocationContext,
      );

      expect(response.status).toBe(401);
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

    it("should return auth error when validateAuthAndGuildOwnership fails", async () => {
      const authError = {
        status: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify("Unauthorized"),
      };
      vi.mocked(validateAuthAndGuildOwnership).mockResolvedValue(authError);
      vi.mocked(isErrorResponse).mockReturnValue(true);

      const response = await getQuestionBankHandler(
        mockHttpRequest,
        mockInvocationContext,
      );

      expect(response.status).toBe(401);
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

    it("should return 400 if guildId does not match request body guildId", async () => {
      mockHttpRequest = createMockHttpRequest(
        {},
        {
          name: "testBank",
          guildId: "differentGuildId",
          questions: [],
        },
      );

      const response = await upsertQuestionBankHandler(
        mockHttpRequest,
        mockInvocationContext,
      );

      expect(response.status).toBe(400);
      expect(JSON.parse(response.body as string)).toEqual({
        error: "Guild ID's do not match with logged in guild id",
      });
    });

    it("should return auth error when validateAuthAndGuildOwnership fails", async () => {
      const authError = {
        status: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify("Unauthorized"),
      };
      vi.mocked(validateAuthAndGuildOwnership).mockResolvedValue(authError);
      vi.mocked(isErrorResponse).mockReturnValue(true);

      const response = await upsertQuestionBankHandler(
        mockHttpRequest,
        mockInvocationContext,
      );

      expect(response.status).toBe(401);
    });

    it("should process question images and explanation images", async () => {
      (mockImageStorage.downloadAndValidateImageForDiscord as any).mockResolvedValue("image-key");

      mockHttpRequest = createMockHttpRequest(
        {},
        {
          name: "testBank",
          guildId: "testGuildId",
          questions: [
            {
              questionId: "q1",
              question: "question with images",
              answers: [
                { answerId: "a1", answer: "answer1" },
              ],
              correctAnswerId: "a1",
              questionShowTimeMs: 30000,
              imageUrl: "https://example.com/image.jpg",
              explanationImageUrl: "https://example.com/explanation.jpg",
            },
          ],
        },
      );

      const response = await upsertQuestionBankHandler(
        mockHttpRequest,
        mockInvocationContext,
      );

      expect(response.status).toBe(200);
      expect(mockImageStorage.downloadAndValidateImageForDiscord).toHaveBeenCalledTimes(2);
    });

    it("should return 400 if question image download fails", async () => {
      (mockImageStorage.downloadAndValidateImageForDiscord as any).mockRejectedValue(
        new Error("download failed"),
      );

      mockHttpRequest = createMockHttpRequest(
        {},
        {
          name: "testBank",
          guildId: "testGuildId",
          questions: [
            {
              questionId: "q1",
              question: "question with bad image",
              answers: [],
              questionShowTimeMs: 30000,
              imageUrl: "https://example.com/bad-image.jpg",
            },
          ],
        },
      );

      const response = await upsertQuestionBankHandler(
        mockHttpRequest,
        mockInvocationContext,
      );

      expect(response.status).toBe(400);
    });

    it("should return 400 if explanation image download fails", async () => {
      (mockImageStorage.downloadAndValidateImageForDiscord as any)
        .mockResolvedValueOnce("image-key")
        .mockRejectedValueOnce(new Error("explanation download failed"));

      mockHttpRequest = createMockHttpRequest(
        {},
        {
          name: "testBank",
          guildId: "testGuildId",
          questions: [
            {
              questionId: "q1",
              question: "question with bad explanation image",
              answers: [],
              questionShowTimeMs: 30000,
              imageUrl: "https://example.com/image.jpg",
              explanationImageUrl: "https://example.com/bad-explanation.jpg",
            },
          ],
        },
      );

      const response = await upsertQuestionBankHandler(
        mockHttpRequest,
        mockInvocationContext,
      );

      expect(response.status).toBe(400);
    });

    it("should return 400 if question has no questionId", async () => {
      mockHttpRequest = createMockHttpRequest(
        {},
        {
          name: "testBank",
          guildId: "testGuildId",
          questions: [
            {
              questionId: "",
              question: "question without id",
              answers: [],
              questionShowTimeMs: 30000,
            },
          ],
        },
      );

      const response = await upsertQuestionBankHandler(
        mockHttpRequest,
        mockInvocationContext,
      );

      expect(response.status).toBe(400);
    });

    it("should return 400 if question has answers but no correctAnswerId", async () => {
      mockHttpRequest = createMockHttpRequest(
        {},
        {
          name: "testBank",
          guildId: "testGuildId",
          questions: [
            {
              questionId: "q1",
              question: "question without correct answer",
              answers: [
                { answerId: "a1", answer: "answer1" },
              ],
              correctAnswerId: "",
              questionShowTimeMs: 30000,
            },
          ],
        },
      );

      const response = await upsertQuestionBankHandler(
        mockHttpRequest,
        mockInvocationContext,
      );

      expect(response.status).toBe(400);
    });

    it("should process answer images successfully", async () => {
      (mockImageStorage.downloadAndValidateAnswerImage as any).mockResolvedValue("answer-image-key");

      mockHttpRequest = createMockHttpRequest(
        {},
        {
          name: "testBank",
          guildId: "testGuildId",
          questions: [
            {
              questionId: "q1",
              question: "question with answer images",
              answers: [
                { answerId: "a1", answer: "answer1", imageUrl: "https://example.com/answer-image.jpg" },
              ],
              correctAnswerId: "a1",
              questionShowTimeMs: 30000,
            },
          ],
        },
      );

      const response = await upsertQuestionBankHandler(
        mockHttpRequest,
        mockInvocationContext,
      );

      expect(response.status).toBe(200);
      expect(mockImageStorage.downloadAndValidateAnswerImage).toHaveBeenCalledWith(
        "https://example.com/answer-image.jpg",
        "q1",
        "a1",
      );
    });

    it("should return 400 if answer image download fails", async () => {
      (mockImageStorage.downloadAndValidateAnswerImage as any).mockRejectedValue(
        new Error("answer image download failed"),
      );

      mockHttpRequest = createMockHttpRequest(
        {},
        {
          name: "testBank",
          guildId: "testGuildId",
          questions: [
            {
              questionId: "q1",
              question: "question with bad answer image",
              answers: [
                { answerId: "a1", answer: "answer1", imageUrl: "https://example.com/bad-answer.jpg" },
              ],
              correctAnswerId: "a1",
              questionShowTimeMs: 30000,
            },
          ],
        },
      );

      const response = await upsertQuestionBankHandler(
        mockHttpRequest,
        mockInvocationContext,
      );

      expect(response.status).toBe(400);
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

    it("should return auth error when validateAuthAndGuildOwnership fails", async () => {
      const authError = {
        status: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify("Unauthorized"),
      };
      vi.mocked(validateAuthAndGuildOwnership).mockResolvedValue(authError);
      vi.mocked(isErrorResponse).mockReturnValue(true);

      const response = await getQuestionBankNamesHandler(
        mockHttpRequest,
        mockInvocationContext,
      );

      expect(response.status).toBe(401);
    });
  });

  describe("getGuildsHandler", () => {
    beforeEach(() => {
      mockHttpRequest = createMockHttpRequest(
        {},
        undefined,
        { Authorization: "Bearer test-token" },
      );
    });

    it("should return auth error when validateAuth fails", async () => {
      const authError = {
        status: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify("Unauthorized"),
      };
      vi.mocked(validateAuth).mockResolvedValue(authError);
      vi.mocked(isValidationSuccess).mockReturnValue(false);

      const response = await getGuildsHandler(
        mockHttpRequest,
        mockInvocationContext,
      );

      expect(response.status).toBe(401);
    });

    it("should return 200 with accessible guilds on success", async () => {
      vi.mocked(validateAuth).mockResolvedValue({ token: "test-token" });
      vi.mocked(isValidationSuccess).mockReturnValue(true);

      const userGuilds = [
        { id: "guild1", name: "Guild 1" },
        { id: "guild2", name: "Guild 2" },
        { id: "guild3", name: "Guild 3" },
      ];
      const botGuilds = [
        { id: "guild1", name: "Guild 1" },
        { id: "guild3", name: "Guild 3" },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => userGuilds,
      });
      mockRest.get.mockResolvedValueOnce(botGuilds);

      const response = await getGuildsHandler(
        mockHttpRequest,
        mockInvocationContext,
      );

      expect(response.status).toBe(200);
      const body = JSON.parse(response.body as string);
      expect(body).toHaveLength(2);
      expect(body[0].id).toBe("guild1");
      expect(body[1].id).toBe("guild3");
    });

    it("should return 500 if user guilds fetch fails", async () => {
      vi.mocked(validateAuth).mockResolvedValue({ token: "test-token" });
      vi.mocked(isValidationSuccess).mockReturnValue(true);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Forbidden",
      });

      const response = await getGuildsHandler(
        mockHttpRequest,
        mockInvocationContext,
      );

      expect(response.status).toBe(500);
      expect(response.body).toBe(
        JSON.stringify("Error retrieving user guilds"),
      );
    });

    it("should return 500 if bot guilds fetch fails", async () => {
      vi.mocked(validateAuth).mockResolvedValue({ token: "test-token" });
      vi.mocked(isValidationSuccess).mockReturnValue(true);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: "guild1", name: "Guild 1" }],
      });
      mockRest.get.mockRejectedValueOnce(new Error("Bot API error"));

      const response = await getGuildsHandler(
        mockHttpRequest,
        mockInvocationContext,
      );

      expect(response.status).toBe(500);
      expect(response.body).toBe(
        JSON.stringify("Error retrieving guilds"),
      );
    });
  });
});
