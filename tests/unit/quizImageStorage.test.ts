import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {QuizImageStorage} from "../../src/util/quizImageStorage.js";
import {fileTypeFromBuffer} from "file-type";
import {BlobServiceClient, generateBlobSASQueryParameters, SASQueryParameters} from "@azure/storage-blob";

vi.mock("@azure/storage-blob", () => ({
    BlobServiceClient: {
        fromConnectionString: vi.fn(),
    },
    StorageSharedKeyCredential: vi.fn(),
    generateBlobSASQueryParameters: vi.fn(),
    BlobSASPermissions: {
        parse: vi.fn(),
    },
}));

vi.mock("file-type", () => ({
    fileTypeFromBuffer: vi.fn(),
}));

vi.mock("sharp", () => ({
    __esModule: true,
    default: vi.fn(() => ({
        jpeg: vi.fn().mockReturnThis(),
        toBuffer: vi.fn().mockResolvedValue(Buffer.from("optimized-image-buffer")),
    })),
}));

global.fetch = vi.fn();

describe("QuizImageStorage", () => {
    let quizImageStorage: QuizImageStorage;
    let blobServiceClientMock: any;
    let previousStorageAccountKey: string | undefined;
    let previousStorageAccountName: string | undefined;

    beforeEach(() => {
        previousStorageAccountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
        previousStorageAccountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
        vi.resetModules();
        vi.clearAllMocks();

        blobServiceClientMock = {
            getContainerClient: vi.fn().mockReturnValue({
                getBlockBlobClient: vi.fn().mockReturnValue({
                    url: "mock-url",
                    uploadData: vi.fn().mockResolvedValue(undefined),
                }),
            }),
        };

        quizImageStorage = new QuizImageStorage(
            "mock-connection-string",
            "mock-key",
            "mock-name",
            blobServiceClientMock
        );

        vi.mocked(fileTypeFromBuffer).mockReset();
    });

    afterEach(() => {
        vi.clearAllMocks();
        if (previousStorageAccountKey) {
            process.env.AZURE_STORAGE_ACCOUNT_KEY = previousStorageAccountKey;
        } else {
            delete process.env.AZURE_STORAGE_ACCOUNT_KEY;
        }

        if (previousStorageAccountName) {
            process.env.AZURE_STORAGE_ACCOUNT_NAME = previousStorageAccountName;
        } else {
            delete process.env.AZURE_STORAGE_ACCOUNT_NAME;
        }
    });

    describe("constructor", () => {
        it("should throw an error if connection string is missing", () => {
            expect(() => {
                new QuizImageStorage(undefined, "mock-key", "mock-name");
            }).toThrow("invalid connection string");
        });

        it("should throw an error if storage account key is missing", () => {
            delete process.env.AZURE_STORAGE_ACCOUNT_KEY;
            expect(() => {
                new QuizImageStorage("mock-connection-string");
            }).toThrow("invalid storage account key");
        });

        it("should throw an error if storage account name is missing", () => {
            delete process.env.AZURE_STORAGE_ACCOUNT_NAME;
            expect(() => {
                new QuizImageStorage("mock-connection-string", "mock-key");
            }).toThrow("invalid storage account name");
        });

        it("should create default client when connection string is provided", () => {
            new QuizImageStorage("mock-connection-string", "mock-key", "mock-name");
            expect(BlobServiceClient.fromConnectionString).toHaveBeenCalledWith("mock-connection-string");
        });

        it("should use provided client when it is specified", () => {
            const customBlobServiceClient = {
                getContainerClient: vi.fn().mockReturnValue({
                    getBlockBlobClient: vi.fn().mockReturnValue({
                        url: "custom-mock-url",
                        uploadData: vi.fn(),
                    }),
                }),
            };

            const storage = new QuizImageStorage(
                "mock-connection-string",
                "mock-key",
                "mock-name",
                customBlobServiceClient as any
            );

            expect(storage["quizImageClient"]).toBe(customBlobServiceClient);
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

            const url = await quizImageStorage.downloadAndValidateImageForDiscord(
                "http://image-url.com",
                "container",
                "partition",
            );

            expect(url).toBe("mock-url");
        });

        it("should throw an error if image size exceeds Discord's limit during chunking", async () => {
            const mockImageBuffer = Buffer.alloc(9 * 1024 * 1024);
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
                quizImageStorage.downloadAndValidateImageForDiscord(
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

            const url = await quizImageStorage.downloadAndValidateImageForDiscord(
                "http://image-url.com",
                "container",
                "partition",
            );

            expect(url).toBe("mock-url");
        });

        it("should throw an error if the image is too large", async () => {
            const mockImageBuffer = Buffer.alloc(9 * 1024 * 1024);
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
                quizImageStorage.downloadAndValidateImageForDiscord(
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

            vi.mocked(fileTypeFromBuffer).mockResolvedValueOnce({
                mime: "image/bmp",
            } as any);

            await expect(
                quizImageStorage.downloadAndValidateImageForDiscord(
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
                quizImageStorage.downloadAndValidateImageForDiscord(
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
                body: null,
            } as unknown as Response);

            await expect(
                quizImageStorage.downloadAndValidateImageForDiscord(
                    "http://image-url.com",
                    "container",
                    "partition",
                ),
            ).rejects.toThrow(
                "Unable to download the file from the URL http://image-url.com",
            );
        });
    });

    describe("getPresignedUrl", () => {
        it("should return a presigned URL", async () => {
            const mockUrl = "mock-url";
            const mockSasToken = "mock-sas-token";

            const blockBlobClientMock = {
                url: mockUrl,
            };

            const containerClientMock = {
                getBlockBlobClient: vi.fn().mockReturnValue(blockBlobClientMock)
            };

            blobServiceClientMock.getContainerClient.mockReturnValue(containerClientMock);

            const mockSASQueryParameters : SASQueryParameters = {
                version: "2020-02-10",
                signature: "mock-signature",
                ipRange: undefined,
                startsOn: new Date(),
                expiresOn: new Date(new Date().valueOf() + 86400 * 1000),
                permissions: "r",
                cacheControl: "",
                contentDisposition: "",
                contentEncoding: "",
                contentLanguage: "",
                contentType: "",
                toString: vi.fn().mockReturnValue(mockSasToken)
            } as unknown as SASQueryParameters;

            vi.mocked(generateBlobSASQueryParameters).mockReturnValue(mockSASQueryParameters);

            const url = await quizImageStorage.getPresignedUrl("container", "partition");

            expect(url).toBe(`${mockUrl}?${mockSasToken}`);
            expect(containerClientMock.getBlockBlobClient).toHaveBeenCalledWith("partition.jpg");
            expect(mockSASQueryParameters.toString).toHaveBeenCalled();
        });
    });

    describe("getQuestionImagePresignedUrl", () => {
        it("should return a presigned URL for question image", async () => {
            const url = await quizImageStorage.getQuestionImagePresignedUrl("bank1", "question1");

            expect(url).toBe("mock-url?mock-sas-token");
        });
    });

    describe("getExplanationImagePresignedUrl", () => {
        it("should return a presigned URL for explanation image", async () => {
            const url = await quizImageStorage.getExplanationImagePresignedUrl("bank1", "question1");

            expect(url).toBe("mock-url?mock-sas-token");
        });
    });
});