import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QuestionStorage } from "../../src/util/questionStorage.js";
import { odata, TableClient, TableEntity } from "@azure/data-tables";
import { QuestionBank } from "../../src/questionBank.interfaces.js";
import { fileTypeFromBuffer } from "file-type";
import { BlobServiceClient } from "@azure/storage-blob";
import { QuizImageStorage } from "../../src/util/quizImageStorage.js";
import { ImageType } from "../../src/util/IQuestionStorage.interfaces.js";

vi.mock("@azure/data-tables", () => ({
  TableClient: {
    fromConnectionString: vi.fn(),
  },
  TableTransaction: vi.fn().mockImplementation(function (this: any) {
    this.upsertEntity = vi.fn();
    this.actions = [];
  }),
  odata: vi.fn(),
}));

vi.mock("@azure/storage-blob", () => ({
  BlobServiceClient: {
    fromConnectionString: vi.fn().mockReturnValue({
      getContainerClient: vi.fn().mockReturnValue({
        getBlockBlobClient: vi.fn().mockReturnValue({
          url: "mock-url",
          uploadData: vi.fn().mockResolvedValue(undefined),
        }),
      }),
    }),
  },
  BlobSASPermissions: {
    parse: vi.fn(),
  },
  StorageSharedKeyCredential: vi.fn(),
  generateBlobSASQueryParameters: vi.fn().mockReturnValue({
    toString: vi.fn().mockReturnValue("mock-sas-token"),
  }),
}));

vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:crypto")>();
  return {
    ...actual,
    randomUUID: vi.fn(() => "mock-uuid"),
  };
});

vi.mock("file-type", () => ({
  __esModule: true,
  fileTypeFromBuffer: vi.fn(),
}));

vi.mock("../../src/util/errorHelpers", () => ({
  throwError: vi.fn((msg) => {
    throw new Error(msg);
  }),
}));

global.fetch = vi.fn();

describe("QuestionStorage", () => {
  let questionStorage: QuestionStorage;
  let tableClientMock: any;
  let blobServiceClientMock: any;
  let previousConnectionString: string | undefined;
  let previousStorageAccountName: string | undefined;
  let previousStorageAccountKey: string | undefined;
  let quizImageStorage: QuizImageStorage;

  beforeEach(() => {
    previousConnectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    previousStorageAccountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    previousStorageAccountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
    vi.resetModules();
    vi.clearAllMocks();
    tableClientMock = {
      createEntity: vi.fn(),
      listEntities: vi.fn(),
      deleteEntity: vi.fn(),
      updateEntity: vi.fn(),
      getEntity: vi.fn(),
      submitTransaction: vi.fn(),
    };

    blobServiceClientMock = {
      getContainerClient: vi.fn().mockReturnValue({
        getBlockBlobClient: vi.fn().mockReturnValue({
          url: "mock-url",
          uploadData: vi.fn(),
          exists: vi.fn().mockResolvedValue(false),
        }),
      }),
    };

    quizImageStorage = new QuizImageStorage(
      "mock-connection-string",
      "mock-key",
      "mock-name",
      blobServiceClientMock,
    );
    questionStorage = new QuestionStorage(
      quizImageStorage,
      "mock-connection-string",
      tableClientMock,
    );

    vi.mocked(fileTypeFromBuffer).mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
    if (previousConnectionString) {
      process.env.AZURE_STORAGE_CONNECTION_STRING = previousConnectionString;
    } else {
      delete process.env.AZURE_STORAGE_CONNECTION_STRING;
    }

    if (previousStorageAccountName) {
      process.env.AZURE_STORAGE_ACCOUNT_NAME = previousStorageAccountName;
    } else {
      delete process.env.AZURE_STORAGE_ACCOUNT_NAME;
    }

    if (previousStorageAccountKey) {
      process.env.AZURE_STORAGE_ACCOUNT_KEY = previousStorageAccountKey;
    } else {
      delete process.env.AZURE_STORAGE_ACCOUNT_KEY;
    }
  });

  describe("generateAnswer", () => {
    it("should generate an answer with a unique ID", async () => {
      const answerText = "This is an answer";
      const expectedAnswerId = "mock-uuid";

      const answer = await questionStorage.generateAnswer(answerText);

      expect(answer).toEqual({
        answer: answerText,
        answerId: expectedAnswerId,
      });
    });
  });

  describe("constructor", () => {
    it("should throw an error if connection string is missing and quizImageClient is not set", () => {
      delete process.env.AZURE_STORAGE_CONNECTION_STRING;
      expect(() => {
        new QuestionStorage(new QuizImageStorage("mock-connection-string"));
      }).toThrow("invalid azure storage connection string");
    });

    it("should throw an error if connection string is missing and clients are not provided", () => {
      delete process.env.AZURE_STORAGE_CONNECTION_STRING;
      expect(() => {
        new QuestionStorage(new QuizImageStorage("mock-connection-string"));
      }).toThrow("invalid azure storage connection string");
    });

    it("should create default clients when connection string is provided", () => {
      new QuestionStorage(
        new QuizImageStorage("mock-connection-string"),
        "mock-connection-string",
      );

      expect(TableClient.fromConnectionString).toHaveBeenCalledWith(
        "mock-connection-string",
        "QuizQuestionBanks",
      );
    });

    it("should use provided clients when they are specified", () => {
      const customTableClient = {
        createEntity: vi.fn(),
        listEntities: vi.fn(),
        deleteEntity: vi.fn(),
      };
      const customBlobServiceClient = {
        getContainerClient: vi.fn().mockReturnValue({
          getBlockBlobClient: vi.fn().mockReturnValue({
            url: "custom-mock-url",
            uploadData: vi.fn(),
          }),
        }),
      } as unknown as BlobServiceClient;

      const storage = new QuestionStorage(
        new QuizImageStorage(
          "mock-connection-string",
          "mock-key",
          "mock-name",
          customBlobServiceClient,
        ),
        "mock-connection-string",
        customTableClient as any,
      );

      expect(storage["quizQuestionsClient"]).toBe(customTableClient);
    });
  });

  describe("getQuestionBank", () => {
    it("should return a question bank", async () => {
      const mockQuestionBank: TableEntity<QuestionBank> = {
        partitionKey: "guild1",
        rowKey: "bank1",
        guildId: "guild1",
        name: "bank1",
        questions: [
          {
            questionId: "question1",
            question: "What is 2+2?",
            answers: [
              { answerId: "1", answer: "3" },
              { answerId: "2", answer: "4" },
            ],
            correctAnswerId: "2",
            questionShowTimeMs: 20000,
          },
        ],
      };
      tableClientMock.getEntity.mockResolvedValue(mockQuestionBank);

      const questionBank = await questionStorage.getQuestionBank("guild1", "bank1");

      expect(tableClientMock.getEntity).toHaveBeenCalledWith("guild1", "bank1");
      expect(questionBank).toEqual(mockQuestionBank);
    });
  });

  describe("upsertQuestionBank", () => {
    it("should upsert a question bank", async () => {
      const questionBank: QuestionBank = {
        guildId: "guild1",
        name: "bank1",
        questions: [
          {
            questionId: "mock-uuid",
            question: "What is 2+2?",
            answers: [
              { answerId: "1", answer: "3" },
              { answerId: "2", answer: "4" },
            ],
            correctAnswerId: "2",
            questionShowTimeMs: 20000,
          },
        ],
      };

      await questionStorage.upsertQuestionBank(questionBank);

      expect(tableClientMock.submitTransaction).toHaveBeenCalled();
    });
  });

  describe("deleteQuestionBank", () => {
    it("should delete a question bank", async () => {
      tableClientMock.deleteEntity.mockResolvedValue(undefined);

      await questionStorage.deleteQuestionBank("guild1", "bank1");

      expect(tableClientMock.deleteEntity).toHaveBeenCalledWith(
        "guild1",
        "bank1",
      );
    });
  });

  describe("getQuestionBankNames", () => {
    it("should return a list of unique question bank names", async () => {
      (odata as any).mockImplementation(() => {
        return "PartitionKey eq 'guild1'";
      });

      const mockEntities = [
        { partitionKey: "guild1", rowKey: "bank1" },
        { partitionKey: "guild1", rowKey: "bank2" },
        { partitionKey: "guild1", rowKey: "bank1" }, // Duplicate bank name
      ];

      tableClientMock.listEntities.mockReturnValue({
        async *[Symbol.asyncIterator]() {
          for (const entity of mockEntities) {
            yield entity;
          }
        },
      });

      const bankNames = await questionStorage.getQuestionBankNames("guild1");

      expect(tableClientMock.listEntities).toHaveBeenCalledWith(
        expect.objectContaining({
          queryOptions: expect.objectContaining({
            filter: "PartitionKey eq 'guild1'",
          }),
        }),
      );

      expect(bankNames).toEqual(["bank1", "bank2"]);
    });

    it("should return an empty array if no question banks are found", async () => {
      tableClientMock.listEntities.mockReturnValue({
        async *[Symbol.asyncIterator]() {
          // No entities
        },
      });

      const bankNames = await questionStorage.getQuestionBankNames("guild1");

      expect(bankNames).toEqual([]);
    });
  });

  describe("generateQuestion", () => {
    it("should generate a question", async () => {
      const question = await questionStorage.generateQuestion(
        "What is 2+2?",
        [
          { answerId: "1", answer: "3" },
          { answerId: "2", answer: "4" },
        ],
        "2",
        20000,
      );

      expect(question).toEqual({
        questionId: "mock-uuid",
        question: "What is 2+2?",
        answers: [
          { answerId: "1", answer: "3" },
          { answerId: "2", answer: "4" },
        ],
        correctAnswerId: "2",
        questionShowTimeMs: 20000,
        imagePartitionKey: undefined,
        explanation: undefined,
        explanationImagePartitionKey: undefined,
      });
    });

    it("should generate a question with images", async () => {
      quizImageStorage.downloadAndValidateImageForDiscord = vi
        .fn()
        .mockResolvedValue("mock-url");

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: {
          get: () => "1024",
        },
        body: {
          getReader: () => {
            let done = false;
            return {
              read: () => {
                if (done) {
                  return Promise.resolve({ done: true });
                }
                done = true;
                return Promise.resolve({
                  value: Buffer.from("mock-image-buffer"),
                  done: false,
                });
              },
            };
          },
        },
        status: 200,
        statusText: "OK",
      } as unknown as Response);

      (fileTypeFromBuffer as any)
        .mockResolvedValueOnce({ mime: "image/jpeg" })
        .mockResolvedValueOnce({ mime: "image/png" });

      const question = await questionStorage.generateQuestion(
        "What is 2+2?",
        [
          { answerId: "1", answer: "3" },
          { answerId: "2", answer: "4" },
        ],
        "2",
        20000,
        "https://image-url.com",
        "Explanation",
        "https://explanation-image-url.com",
      );

      expect(question).toEqual({
        questionId: "mock-uuid",
        question: "What is 2+2?",
        answers: [
          { answerId: "1", answer: "3" },
          { answerId: "2", answer: "4" },
        ],
        correctAnswerId: "2",
        questionShowTimeMs: 20000,
        imagePartitionKey: "mock-uuid-question",
        explanation: "Explanation",
        explanationImagePartitionKey: "mock-uuid-explanation",
      });

      expect(
        quizImageStorage.downloadAndValidateImageForDiscord,
      ).toHaveBeenCalledWith(
        "https://image-url.com",
        "mock-uuid",
        ImageType.Question,
      );

      expect(
        quizImageStorage.downloadAndValidateImageForDiscord,
      ).toHaveBeenCalledWith(
        "https://explanation-image-url.com",
        "mock-uuid",
        ImageType.Explanation,
      );
    });
  });
});
