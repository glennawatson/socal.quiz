import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QuestionStorage } from "../../src/util/questionStorage.js";
import { odata, TableClient, TableEntity } from "@azure/data-tables";
import { Question } from "../../src/question.interfaces.js";
import { fileTypeFromBuffer } from "file-type";
import { BlobServiceClient } from "@azure/storage-blob";
import { QuizImageStorage } from "../../src/util/quizImageStorage.js";

vi.mock("@azure/data-tables", () => ({
  TableClient: {
    fromConnectionString: vi.fn(),
  },
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

vi.mock("uuid", () => ({
  v4: vi.fn(() => "mock-uuid"),
}));

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
    it("should throw an error if storage account key is missing", () => {
      delete process.env.AZURE_STORAGE_ACCOUNT_KEY;
      expect(() => {
        new QuestionStorage(
          new QuizImageStorage("mock-connection-string"),
          "mock-connection-string",
        );
      }).toThrow("invalid storage account key");
    });

    it("should throw an error if connection string is missing account name", () => {
      expect(() => {
        delete process.env.AZURE_STORAGE_ACCOUNT_NAME;
        new QuestionStorage(new QuizImageStorage("mock-connection-string"), "");
      }).toThrow("invalid storage account name");
    });

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
        "QuizQuestions",
      );
      expect(BlobServiceClient.fromConnectionString).toHaveBeenCalledWith(
        "mock-connection-string",
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

  describe("getQuestions", () => {
    it("should return a list of questions", async () => {
      const mockQuestions: TableEntity<Question>[] = [
        {
          partitionKey: "guild1-bank1",
          rowKey: "question1",
          question: "What is 2+2?",
          answers: [
            { answerId: "1", answer: "3" },
            { answerId: "2", answer: "4" },
          ],
          correctAnswerId: "2",
          guildId: "guild1",
          bankName: "bank1",
          questionId: "question1",
          questionShowTimeMs: 20000,
        },
      ];
      tableClientMock.listEntities.mockReturnValue(mockQuestions);

      const questions = await questionStorage.getQuestions("guild1", "bank1");

      expect(questions).toEqual([
        {
          guildId: "guild1",
          bankName: "bank1",
          questionId: "question1",
          question: "What is 2+2?",
          answers: [
            { answerId: "1", answer: "3" },
            { answerId: "2", answer: "4" },
          ],
          correctAnswerId: "2",
          questionShowTimeMs: 20000,
        },
      ]);
    });
  });

  describe("addQuestion", () => {
    it("should add a question", async () => {
      const question: Question = {
        guildId: "guild1",
        bankName: "bank1",
        questionId: "mock-uuid",
        question: "What is 2+2?",
        answers: [
          { answerId: "1", answer: "3" },
          { answerId: "2", answer: "4" },
        ],
        correctAnswerId: "2",
        questionShowTimeMs: 20000,
      };

      await questionStorage.addQuestion("guild1", question);

      expect(tableClientMock.createEntity).toHaveBeenCalledWith({
        partitionKey: "guild1-bank1",
        rowKey: "mock-uuid",
        guildId: "guild1",
        question: "What is 2+2?",
        questionId: "mock-uuid",
        bankName: "bank1",
        answers: [
          { answerId: "1", answer: "3" },
          { answerId: "2", answer: "4" },
        ],
        correctAnswerId: "2",
        questionShowTimeMs: 20000,
      });
    });
  });

  describe("deleteQuestion", () => {
    it("should delete a question", async () => {
      await questionStorage.deleteQuestion("guild1", "bank1", "question1");

      expect(tableClientMock.deleteEntity).toHaveBeenCalledWith(
        "guild1-bank1",
        "question1",
      );
    });
  });

  describe("getQuestion", () => {
    it("should return a question by its ID", async () => {
      const mockEntity = {
        partitionKey: "guild1-bank1",
        rowKey: "question1",
        question: "What is 2+2?",
        answers: [
          { answerId: "1", answer: "3" },
          { answerId: "2", answer: "4" },
        ],
        correctAnswerId: "2",
        bankName: "bank1",
        questionId: "question1",
        questionShowTimeMs: 20000,
      };

      tableClientMock.getEntity = vi.fn().mockResolvedValue(mockEntity);

      const question = await questionStorage.getQuestion(
        "guild1",
        "bank1",
        "question1",
      );

      expect(tableClientMock.getEntity).toHaveBeenCalledWith(
        "guild1-bank1",
        "question1",
      );

      expect(question).toEqual({
        bankName: "bank1",
        questionId: "question1",
        question: "What is 2+2?",
        answers: [
          { answerId: "1", answer: "3" },
          { answerId: "2", answer: "4" },
        ],
        correctAnswerId: "2",
        questionShowTimeMs: 20000,
      });
    });

    it("should throw an error if the question is not found", async () => {
      tableClientMock.getEntity = vi
        .fn()
        .mockRejectedValue(new Error("Entity not found"));

      await expect(
        questionStorage.getQuestion("guild1", "bank1", "question1"),
      ).rejects.toThrow("Entity not found");
    });
  });

  describe("getQuestionBankNames", () => {
    it("should return a list of unique question bank names", async () => {
      (odata as any).mockImplementation(() => {
        return "PartitionKey ge 'guild1_'";
      });

      const mockEntities = [
        { partitionKey: "guild1_bank1" },
        { partitionKey: "guild1_bank2" },
        { partitionKey: "guild1_bank1" }, // Duplicate bank name
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
            filter: "PartitionKey ge 'guild1_'",
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

  describe("deleteQuestionBank", () => {
    it("should delete all questions in a bank", async () => {
      const mockEntities = [
        { partitionKey: "guild1-bank1", rowKey: "question1" },
        { partitionKey: "guild1-bank1", rowKey: "question2" },
      ];

      (odata as any).mockImplementation(() => {
        return "PartitionKey eq 'guild1-bank1'";
      });

      tableClientMock.listEntities.mockReturnValue({
        async *[Symbol.asyncIterator]() {
          for (const entity of mockEntities) {
            yield entity;
          }
        },
      });

      tableClientMock.deleteEntity.mockResolvedValue(undefined);

      await questionStorage.deleteQuestionBank("guild1", "bank1");

      expect(tableClientMock.listEntities).toHaveBeenCalledWith(
        expect.objectContaining({
          queryOptions: expect.objectContaining({
            filter: "PartitionKey eq 'guild1-bank1'",
          }),
        }),
      );

      expect(tableClientMock.deleteEntity).toHaveBeenCalledTimes(2);
      expect(tableClientMock.deleteEntity).toHaveBeenCalledWith(
        "guild1-bank1",
        "question1",
      );
      expect(tableClientMock.deleteEntity).toHaveBeenCalledWith(
        "guild1-bank1",
        "question2",
      );
    });
  });

  describe("generateAndAddQuestion", () => {
    it("should generate and add a question", async () => {
      const mockQuestion: Question = {
        guildId: "guild1",
        bankName: "bank1",
        questionId: "mock-uuid",
        question: "What is 2+2?",
        answers: [
          { answerId: "1", answer: "3" },
          { answerId: "2", answer: "4" },
        ],
        correctAnswerId: "2",
        questionShowTimeMs: 20000,
      };

      vi.spyOn(questionStorage, "generateQuestion").mockResolvedValue(
        mockQuestion,
      );

      await questionStorage.generateAndAddQuestion(
        "guild1",
        "bank1",
        "What is 2+2?",
        [
          { answerId: "1", answer: "3" },
          { answerId: "2", answer: "4" },
        ],
        "2",
        20000,
      );

      expect(questionStorage.generateQuestion).toHaveBeenCalledWith(
        "guild1",
        "bank1",
        "What is 2+2?",
        [
          { answerId: "1", answer: "3" },
          { answerId: "2", answer: "4" },
        ],
        "2",
        20000,
        undefined,
        undefined,
        undefined,
      );

      expect(tableClientMock.createEntity).toHaveBeenCalledWith({
        partitionKey: "guild1-bank1",
        rowKey: "mock-uuid",
        guildId: "guild1",
        question: "What is 2+2?",
        questionId: "mock-uuid",
        bankName: "bank1",
        answers: [
          { answerId: "1", answer: "3" },
          { answerId: "2", answer: "4" },
        ],
        correctAnswerId: "2",
        questionShowTimeMs: 20000,
      });
    });
  });

  describe("generateQuestion", () => {
    it("should generate a question", async () => {
      const question = await questionStorage.generateQuestion(
        "guild1",
        "bank1",
        "What is 2+2?",
        [
          { answerId: "1", answer: "3" },
          { answerId: "2", answer: "4" },
        ],
        "2",
        20000,
      );

      expect(question).toEqual({
        guildId: "guild1",
        bankName: "bank1",
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
        "guild1",
        "bank1",
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
        guildId: "guild1",
        bankName: "bank1",
        questionId: "mock-uuid",
        question: "What is 2+2?",
        answers: [
          { answerId: "1", answer: "3" },
          { answerId: "2", answer: "4" },
        ],
        correctAnswerId: "2",
        questionShowTimeMs: 20000,
        imagePartitionKey: "guild1-bank1-mock-uuid-question",
        explanation: "Explanation",
        explanationImagePartitionKey: "guild1-bank1-mock-uuid-explanation",
      });

      expect(
        quizImageStorage.downloadAndValidateImageForDiscord,
      ).toHaveBeenCalledWith(
        "guild1",
        "https://image-url.com",
        "bank1",
        "mock-uuid",
        "QuestionImage",
      );

      expect(
        quizImageStorage.downloadAndValidateImageForDiscord,
      ).toHaveBeenCalledWith(
        "guild1",
        "https://explanation-image-url.com",
        "bank1",
        "mock-uuid",
        "ExplanationImage",
      );
    });
  });

  describe("addQuestions", () => {
    it("should add multiple questions", async () => {
      const questions: Question[] = [
        {
          guildId: "guild1",
          bankName: "bank1",
          questionId: "mock-uuid-1",
          question: "What is 2+2?",
          answers: [
            { answerId: "1", answer: "3" },
            { answerId: "2", answer: "4" },
          ],
          correctAnswerId: "2",
          questionShowTimeMs: 20000,
        },
        {
          guildId: "guild1",
          bankName: "bank2",
          questionId: "mock-uuid-2",
          question: "What is the capital of France?",
          answers: [
            { answerId: "1", answer: "Berlin" },
            { answerId: "2", answer: "Paris" },
          ],
          correctAnswerId: "2",
          questionShowTimeMs: 20000,
        },
      ];

      await questionStorage.addQuestions("guild1", questions);

      expect(tableClientMock.createEntity).toHaveBeenCalledTimes(2);
      expect(tableClientMock.createEntity).toHaveBeenCalledWith({
        partitionKey: "guild1-bank1",
        rowKey: "mock-uuid-1",
        guildId: "guild1",
        bankName: "bank1",
        questionId: "mock-uuid-1",
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

      expect(tableClientMock.createEntity).toHaveBeenCalledWith({
        partitionKey: "guild1-bank2",
        rowKey: "mock-uuid-2",
        guildId: "guild1",
        bankName: "bank2",
        questionId: "mock-uuid-2",
        question: "What is the capital of France?",
        answers: [
          { answerId: "1", answer: "Berlin" },
          { answerId: "2", answer: "Paris" },
        ],
        correctAnswerId: "2",
        questionShowTimeMs: 20000,
        imagePartitionKey: undefined,
        explanation: undefined,
        explanationImagePartitionKey: undefined,
      });
    });
  });

  describe("updateQuestion", () => {
    it("should update an existing question", async () => {
      const question: Question = {
        guildId: "guild1",
        bankName: "bank1",
        questionId: "mock-uuid",
        question: "What is 2+2?",
        answers: [
          { answerId: "1", answer: "3" },
          { answerId: "2", answer: "4" },
        ],
        correctAnswerId: "2",
        questionShowTimeMs: 20000,
      };

      await questionStorage.updateQuestion("guild1", question);

      expect(tableClientMock.updateEntity).toHaveBeenCalledWith(
        {
          partitionKey: "guild1-bank1",
          rowKey: "mock-uuid",
          guildId: "guild1",
          question: "What is 2+2?",
          questionId: "mock-uuid",
          bankName: "bank1",
          answers: [
            { answerId: "1", answer: "3" },
            { answerId: "2", answer: "4" },
          ],
          correctAnswerId: "2",
          questionShowTimeMs: 20000,
        },
        "Merge",
      );
    });
  });
});
