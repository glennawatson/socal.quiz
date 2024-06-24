import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { QuestionStorage } from "../../src/util/questionStorage.js";
import { odata, TableClient, TableEntity } from "@azure/data-tables";
import { Question } from "../../src/question.interfaces.js";
import { fileTypeFromBuffer } from 'file-type';
import { BlobServiceClient } from "@azure/storage-blob";

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

// Mock necessary modules
vi.mock("sharp", () => ({
  __esModule: true,
  default: vi.fn().mockImplementation(() => ({
    jpeg: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from("mock-image-buffer")),
  })),
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

// Mock fetch function
global.fetch = vi.fn();

// Create a subclass to expose the private method for testing
class TestableQuestionStorage extends QuestionStorage {
  public async downloadAndValidateImageForDiscord(
    imageUrl: string,
    containerName: string,
    partitionKey: string,
  ): Promise<string> {
    return await super.downloadAndValidateImageForDiscord(
      imageUrl,
      containerName,
      partitionKey,
    );
  }
}

describe("QuestionStorage", () => {
  let questionStorage: TestableQuestionStorage;
  let tableClientMock: any;
  let blobServiceClientMock: any;
  let previousConnectionString: string | undefined;
  let previousStorageAccountName: string | undefined;
  let previousStorageAccountKey: string | undefined;

  beforeEach(() => {
    previousConnectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    previousStorageAccountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    previousStorageAccountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
    vi.resetModules(); // Reset all modules
    vi.clearAllMocks();
    tableClientMock = {
      createEntity: vi.fn(),
      listEntities: vi.fn(),
      deleteEntity: vi.fn(),
      updateEntity: vi.fn(),
    };
    // Mock BlobServiceClient and its methods
    blobServiceClientMock = {
      getContainerClient: vi.fn().mockReturnValue({
        getBlockBlobClient: vi.fn().mockReturnValue({
          url: "mock-url",
          uploadData: vi.fn(),
          exists: vi.fn().mockResolvedValue(false), // Mock exists method to return false initially
        }),
      }),
    };

    questionStorage = new TestableQuestionStorage(
      "mock-connection-string",
      "mock-storage-account",
      "mock-storage-key",
      tableClientMock,
      blobServiceClientMock,
    );

    // Reset the mock for fileTypeFromBuffer before each test
    vi.mocked(fileTypeFromBuffer).mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks(); // Clear all mocks after each test
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

  describe("constructor", () => {
    it("should throw an error if storage account key is missing", () => {
      delete process.env.AZURE_STORAGE_ACCOUNT_KEY;
      expect(() => {
        new TestableQuestionStorage(
          "mock-connection-string",
          "mock-storage-account",
        );
      }).toThrow("invalid storage account key");
    });

    it("should throw an error if connection string is missing account name", () => {
      expect(() => {
        delete process.env.AZURE_STORAGE_ACCOUNT_NAME;
        new TestableQuestionStorage(
          "",
          undefined,
          "mock-storage-key",
          tableClientMock,
        );
      }).toThrow("invalid storage account name");
    });

    it("should throw an error if connection string is missing and quizImageClient is not set", () => {
      expect(() => {
        new TestableQuestionStorage(
          "",
          "mock-storage-account",
          "mock-storage-key",
          tableClientMock,
        );
      }).toThrow("invalid connection string");
    });

    it("should throw an error if connection string is missing and clients are not provided", () => {
      delete process.env.AZURE_STORAGE_CONNECTION_STRING;
      expect(() => {
        new TestableQuestionStorage(
          undefined,
          "mock-storage-account",
          "mock-storage-key",
        );
      }).toThrow("invalid azure storage connection string");
    });

    it("should create default clients when connection string is provided", () => {
      new TestableQuestionStorage(
        "mock-connection-string",
        "mock-storage-account",
        "mock-storage-key",
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
      };

      const storage = new TestableQuestionStorage(
        "mock-connection-string",
        "mock-storage-account",
        "mock-storage-key",
        customTableClient as any,
        customBlobServiceClient as any,
      );

      expect(storage["quizQuestionsClient"]).toBe(customTableClient);
      expect(storage["quizImageClient"]).toBe(customBlobServiceClient);
    });
  });

  describe("getQuestions", () => {
    it("should return a list of questions", async () => {
      const mockQuestions: TableEntity<Question>[] = [
        {
          partitionKey: "bank1",
          rowKey: "question1",
          question: "What is 2+2?",
          answers: [
            { answerId: "1", answer: "3" },
            { answerId: "2", answer: "4" },
          ],
          correctAnswerIndex: 1,
          bankName: "bank1",
          questionId: "question1",
          questionShowTimeMs: 20000,
        },
      ];
      tableClientMock.listEntities.mockReturnValue(mockQuestions);

      const questions = await questionStorage.getQuestions("bank1");

      expect(questions).toEqual([
        {
          bankName: "bank1",
          questionId: "question1",
          question: "What is 2+2?",
          answers: [
            { answerId: "1", answer: "3" },
            { answerId: "2", answer: "4" },
          ],
          correctAnswerIndex: 1,
          questionShowTimeMs: 20000,
        },
      ]);
    });
  });

  describe("addQuestion", () => {
    it("should add a question", async () => {
      const question: Question = {
        bankName: "bank1",
        questionId: "mock-uuid",
        question: "What is 2+2?",
        answers: [
          { answerId: "1", answer: "3" },
          { answerId: "2", answer: "4" },
        ],
        correctAnswerIndex: 1,
        questionShowTimeMs: 20000,
      };

      await questionStorage.addQuestion(question);

      expect(tableClientMock.createEntity).toHaveBeenCalledWith({
        partitionKey: "bank1",
        rowKey: "mock-uuid",
        question: "What is 2+2?",
        questionId: "mock-uuid",
        bankName: "bank1",
        answers: [
          { answerId: "1", answer: "3" },
          { answerId: "2", answer: "4" },
        ],
        correctAnswerIndex: 1,
        questionShowTimeMs: 20000,
      });
    });
  });

  describe("deleteQuestion", () => {
    it("should delete a question", async () => {
      await questionStorage.deleteQuestion("bank1", "question1");

      expect(tableClientMock.deleteEntity).toHaveBeenCalledWith(
        "bank1",
        "question1",
      );
    });
  });

  describe("deleteQuestionBank", () => {
    it("should delete all questions in a bank", async () => {
      const mockEntities = [
        { partitionKey: "bank1", rowKey: "question1" },
        { partitionKey: "bank1", rowKey: "question2" },
      ];

      // Mock odata function to return the expected filter string
      (odata as any).mockImplementation(
        (_strings: TemplateStringsArray, ...values: any[]) => {
          return `PartitionKey eq '${values[0]}'`;
        },
      );

      // Update the listEntities mock to return a PagedAsyncIterableIterator
      tableClientMock.listEntities.mockReturnValue({
        async *[Symbol.asyncIterator]() {
          // Async generator function
          for (const entity of mockEntities) {
            yield entity;
          }
        },
      });

      tableClientMock.deleteEntity.mockResolvedValue(undefined);

      await questionStorage.deleteQuestionBank("bank1");

      // Assert the exact filter string
      expect(tableClientMock.listEntities).toHaveBeenCalledWith(
        expect.objectContaining({
          // Use objectContaining to match partial object
          queryOptions: expect.objectContaining({
            filter: "PartitionKey eq 'bank1'",
          }),
        }),
      );

      expect(tableClientMock.deleteEntity).toHaveBeenCalledTimes(2);
      expect(tableClientMock.deleteEntity).toHaveBeenCalledWith(
        "bank1",
        "question1",
      );
      expect(tableClientMock.deleteEntity).toHaveBeenCalledWith(
        "bank1",
        "question2",
      );
    });
  });

  describe("getPresignedUrl", () => {
    it("should return a presigned URL", async () => {
      const url = await questionStorage.getPresignedUrl(
        "container",
        "partition",
      );

      expect(url).toBe("mock-url?mock-sas-token");
    });
  });

  describe("getQuestionImagePresignedUrl", () => {
    it("should return a presigned URL for question image", async () => {
      const url = await questionStorage.getQuestionImagePresignedUrl(
        "bank1",
        "question1",
      );

      expect(url).toBe("mock-url?mock-sas-token");
    });
  });

  describe("getExplanationImagePresignedUrl", () => {
    it("should return a presigned URL for explanation image", async () => {
      const url = await questionStorage.getExplanationImagePresignedUrl(
        "bank1",
        "question1",
      );

      expect(url).toBe("mock-url?mock-sas-token");
    });
  });

  describe("generateAndAddQuestion", () => {
    it("should generate and add a question", async () => {
      const mockQuestion: Question = {
        bankName: "bank1",
        questionId: "mock-uuid",
        question: "What is 2+2?",
        answers: [
          { answerId: "1", answer: "3" },
          { answerId: "2", answer: "4" },
        ],
        correctAnswerIndex: 1,
        questionShowTimeMs: 20000,
      };

      vi.spyOn(questionStorage, "generateQuestion").mockResolvedValue(
        mockQuestion,
      );

      await questionStorage.generateAndAddQuestion(
        "bank1",
        "What is 2+2?",
        ["3", "4"],
        1,
        20000,
      );

      expect(questionStorage.generateQuestion).toHaveBeenCalledWith(
        "bank1",
        "What is 2+2?",
        ["3", "4"],
        1,
        20000,
        undefined,
        undefined,
        undefined,
      );

      expect(tableClientMock.createEntity).toHaveBeenCalledWith({
        partitionKey: "bank1",
        rowKey: "mock-uuid",
        question: "What is 2+2?",
        questionId: "mock-uuid",
        bankName: "bank1",
        answers: [
          { answerId: "1", answer: "3" },
          { answerId: "2", answer: "4" },
        ],
        correctAnswerIndex: 1,
        questionShowTimeMs: 20000,
      });
    });
  });

  describe("generateQuestion", () => {
    it("should generate a question", async () => {
      const question = await questionStorage.generateQuestion(
        "bank1",
        "What is 2+2?",
        ["3", "4"],
        1,
        20000,
      );

      expect(question).toEqual({
        bankName: "bank1",
        questionId: "mock-uuid",
        question: "What is 2+2?",
        answers: [
          { answerId: "mock-uuid", answer: "3" },
          { answerId: "mock-uuid", answer: "4" },
        ],
        correctAnswerIndex: 1,
        questionShowTimeMs: 20000,
        imagePartitionKey: undefined,
        explanation: undefined,
        explanationImagePartitionKey: undefined,
      });
    });

    it("should generate a question with images", async () => {
      vi.spyOn(
        questionStorage,
        "downloadAndValidateImageForDiscord",
      ).mockResolvedValue("mock-url");

      // Mock fetch to simulate a successful image fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: {
          get: () => "1024", // Mock content length header
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
        .mockResolvedValueOnce({ mime: "image/png" }); // Assuming a different mime type for the second image

      const question = await questionStorage.generateQuestion(
        "bank1",
        "What is 2+2?",
        ["3", "4"],
        1,
        20000,
        "http://image-url.com",
        "Explanation",
        "http://explanation-image-url.com",
      );

      expect(question).toEqual({
        bankName: "bank1",
        questionId: "mock-uuid",
        question: "What is 2+2?",
        answers: [
          { answerId: "mock-uuid", answer: "3" },
          { answerId: "mock-uuid", answer: "4" },
        ],
        correctAnswerIndex: 1,
        questionShowTimeMs: 20000,
        imagePartitionKey: "bank1-mock-uuid-question",
        explanation: "Explanation",
        explanationImagePartitionKey: "bank1-mock-uuid-explanation",
      });

      expect(
        questionStorage.downloadAndValidateImageForDiscord,
      ).toHaveBeenCalledWith(
        "http://image-url.com",
        "bank1",
        "bank1-mock-uuid-question",
      );

      expect(
        questionStorage.downloadAndValidateImageForDiscord,
      ).toHaveBeenCalledWith(
        "http://explanation-image-url.com",
        "bank1",
        "bank1-mock-uuid-explanation",
      );
    });
  });

  describe("downloadAndValidateImageForDiscord", () => {
    it("should download and validate an image with chunking", async () => {
      const mockImageBuffer = Buffer.from("mock-image-buffer");
      const chunk1 = mockImageBuffer.slice(0, mockImageBuffer.length / 2);
      const chunk2 = mockImageBuffer.slice(mockImageBuffer.length / 2);

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => null,
        },
        body: {
          getReader: () => ({
            read: vi
              .fn()
              .mockResolvedValueOnce({ done: false, value: chunk1 })
              .mockResolvedValueOnce({ done: false, value: chunk2 })
              .mockResolvedValueOnce({ done: true }),
          }),
        },
      } as unknown as Response);

      vi.mocked(fileTypeFromBuffer).mockResolvedValueOnce({
        mime: "image/jpeg",
      } as any);

      const url = await questionStorage.downloadAndValidateImageForDiscord(
        "http://image-url.com",
        "container",
        "partition",
      );

      expect(url).toBe("mock-url");
    });

    it("should throw an error if image size exceeds Discord's limit during chunking", async () => {
      const mockImageBuffer = Buffer.alloc(9 * 1024 * 1024); // 9MB
      const chunk = mockImageBuffer.slice(0, mockImageBuffer.length);

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => null,
        },
        body: {
          getReader: () => ({
            read: vi
              .fn()
              .mockResolvedValueOnce({ done: false, value: chunk })
              .mockResolvedValueOnce({ done: true }),
          }),
        },
      } as unknown as Response);

      await expect(
        questionStorage.downloadAndValidateImageForDiscord(
          "http://image-url.com",
          "container",
          "partition",
        ),
      ).rejects.toThrow("Image size exceeds Discord's 8MB limit.");
    });

    it("should download and validate an image", async () => {
      const mockImageBuffer = Buffer.from("mock-image-buffer");
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => mockImageBuffer.length.toString(),
        },
        body: {
          getReader: () => ({
            read: () => Promise.resolve({ value: mockImageBuffer, done: true }),
          }),
        },
      } as unknown as Response);

      vi.mocked(fileTypeFromBuffer).mockResolvedValueOnce({
        mime: "image/jpeg",
      } as any);

      const url = await questionStorage.downloadAndValidateImageForDiscord(
        "http://image-url.com",
        "container",
        "partition",
      );

      expect(url).toBe("mock-url");
    });

    it("should throw an error if the image is too large", async () => {
      const mockImageBuffer = Buffer.alloc(9 * 1024 * 1024); // 9MB
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => mockImageBuffer.length.toString(),
        },
        body: {
          getReader: () => ({
            read: () => Promise.resolve({ value: mockImageBuffer, done: true }),
          }),
        },
      } as unknown as Response);

      await expect(
        questionStorage.downloadAndValidateImageForDiscord(
          "http://image-url.com",
          "container",
          "partition",
        ),
      ).rejects.toThrow("Image size exceeds Discord's 8MB limit.");
    });

    it("should throw an error if the image type is invalid", async () => {
      const mockImageBuffer = Buffer.from("mock-image-buffer");

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => mockImageBuffer.length.toString(),
        },
        body: {
          getReader: () => ({
            read: () => Promise.resolve({ value: mockImageBuffer, done: true }),
          }),
        },
      } as unknown as Response);

      // Mock fileTypeFromBuffer to return an invalid mime type (e.g., "image/bmp")
      vi.mocked(fileTypeFromBuffer).mockResolvedValueOnce({
        mime: "image/bmp",
      } as any);

      // Call the original method directly on the questionStorage instance
      await expect(
        questionStorage.downloadAndValidateImageForDiscord(
          "http://image-url.com",
          "container",
          "partition",
        ),
      ).rejects.toThrow("Invalid image file type for Discord.");
    });

    it("should throw an error if the fetch response is not ok", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      } as unknown as Response);

      await expect(
        questionStorage.downloadAndValidateImageForDiscord(
          "http://image-url.com",
          "container",
          "partition",
        ),
      ).rejects.toThrow("Failed to fetch image: 404 Not Found");
    });

    it("should throw an error if imageStream is not available", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => "1024",
        },
        body: null, // No body stream
      } as unknown as Response);

      await expect(
        questionStorage.downloadAndValidateImageForDiscord(
          "http://image-url.com",
          "container",
          "partition",
        ),
      ).rejects.toThrow(
        "Unable to download the file from the URL http://image-url.com",
      );
    });
  });

  describe("addQuestions", () => {
    it("should add multiple questions", async () => {
      const questions: Question[] = [
        {
          bankName: "bank1",
          questionId: "mock-uuid-1",
          question: "What is 2+2?",
          answers: [
            { answerId: "1", answer: "3" },
            { answerId: "2", answer: "4" },
          ],
          correctAnswerIndex: 1,
          questionShowTimeMs: 20000,
        },
        {
          bankName: "bank2",
          questionId: "mock-uuid-2",
          question: "What is the capital of France?",
          answers: [
            { answerId: "1", answer: "Berlin" },
            { answerId: "2", answer: "Paris" },
          ],
          correctAnswerIndex: 1,
          questionShowTimeMs: 20000,
        },
      ];

      await questionStorage.addQuestions(questions);

      expect(tableClientMock.createEntity).toHaveBeenCalledTimes(2);
      expect(tableClientMock.createEntity).toHaveBeenCalledWith({
        partitionKey: "bank1",
        rowKey: "mock-uuid-1",
        question: "What is 2+2?",
        questionId: "mock-uuid-1",
        bankName: "bank1",
        answers: [
          { answerId: "1", answer: "3" },
          { answerId: "2", answer: "4" },
        ],
        correctAnswerIndex: 1,
        questionShowTimeMs: 20000,
      });
      expect(tableClientMock.createEntity).toHaveBeenCalledWith({
        partitionKey: "bank2",
        rowKey: "mock-uuid-2",
        question: "What is the capital of France?",
        questionId: "mock-uuid-2",
        bankName: "bank2",
        answers: [
          { answerId: "1", answer: "Berlin" },
          { answerId: "2", answer: "Paris" },
        ],
        correctAnswerIndex: 1,
        questionShowTimeMs: 20000,
      });
    });
  });

  describe("updateQuestion", () => {
    it("should update an existing question", async () => {
      const question: Question = {
        bankName: "bank1",
        questionId: "mock-uuid",
        question: "What is 2+2?",
        answers: [
          { answerId: "1", answer: "3" },
          { answerId: "2", answer: "4" },
        ],
        correctAnswerIndex: 1,
        questionShowTimeMs: 20000,
      };

      await questionStorage.updateQuestion(question);

      expect(tableClientMock.updateEntity).toHaveBeenCalledWith(
        {
          partitionKey: "bank1",
          rowKey: "mock-uuid",
          question: "What is 2+2?",
          questionId: "mock-uuid",
          bankName: "bank1",
          answers: [
            { answerId: "1", answer: "3" },
            { answerId: "2", answer: "4" },
          ],
          correctAnswerIndex: 1,
          questionShowTimeMs: 20000,
        },
        "Merge",
      );
    });
  });
});
