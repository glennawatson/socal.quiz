import {beforeEach, describe, expect, it, vi} from "vitest";
import {QuestionStorage} from "../../src/util/questionStorage";
import {TableEntity} from "@azure/data-tables";
import {Question} from "../../src/question";

// Mock dependencies
vi.mock("@azure/data-tables", () => ({
    TableClient: {
        fromConnectionString: vi.fn(),
    },
    odata: vi.fn(),
}));

vi.mock("@azure/storage-blob", async (importOriginal) => {
    return {
        ...importOriginal,
        BlobServiceClient: {
            fromConnectionString: vi.fn().mockReturnValue({
                getContainerClient: vi.fn().mockReturnValue({
                    getBlockBlobClient: vi.fn().mockReturnValue({
                        url: 'mock-url',
                    }),
                }),
            }),
        },
        BlobSASPermissions: {
            parse: vi.fn(),
        },
        StorageSharedKeyCredential: vi.fn(),
        generateBlobSASQueryParameters: vi.fn().mockReturnValue({
            toString: vi.fn().mockReturnValue('mock-sas-token'),
        }),
    };
});

vi.mock("uuid", () => ({
    v4: vi.fn(() => "mock-uuid"),
}));

describe("QuestionStorage", () => {
    let questionStorage: QuestionStorage;
    let tableClientMock: any;
    let blobServiceClientMock: any;

    beforeEach(() => {
        tableClientMock = {
            createEntity: vi.fn(),
            listEntities: vi.fn(),
            deleteEntity: vi.fn(),
        };
        blobServiceClientMock = {
            getContainerClient: vi.fn(() => ({
                getBlockBlobClient: vi.fn(() => ({
                    url: "mock-url",
                })),
            })),
        };

        questionStorage = new QuestionStorage("mock-connection-string", "mock-storage-account", "mock-storage-key", tableClientMock, blobServiceClientMock);
    });

    describe("getQuestions", () => {
        it("should return a list of questions", async () => {
            const mockQuestions: TableEntity<Question>[] = [
                {
                    partitionKey: "bank1",
                    rowKey: "question1",
                    question: "What is 2+2?",
                    answers: [
                        {answerId: "1", answer: "3"},
                        {answerId: "2", answer: "4"},
                    ],
                    correctAnswerIndex: 1,
                    bankName: "bank1",
                    questionId: "question1",
                    questionShowTimeMs: 20
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
                        {answerId: "1", answer: "3"},
                        {answerId: "2", answer: "4"},
                    ],
                    correctAnswerIndex: 1,
                    questionShowTimeMs: 20
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
                    {answerId: "1", answer: "3"},
                    {answerId: "2", answer: "4"},
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
                    {answerId: "1", answer: "3"},
                    {answerId: "2", answer: "4"},
                ],
                correctAnswerIndex: 1,
                questionShowTimeMs: 20000,
            });
        });
    });

    describe("deleteQuestion", () => {
        it("should delete a question", async () => {
            await questionStorage.deleteQuestion("bank1", "question1");

            expect(tableClientMock.deleteEntity).toHaveBeenCalledWith("bank1", "question1");
        });
    });

    describe("getPresignedUrl", () => {
        it("should return a presigned URL", async () => {
            const url = await questionStorage.getPresignedUrl("container", "partition");

            expect(url).toBe("mock-url?mock-sas-token");
        });
    });
});