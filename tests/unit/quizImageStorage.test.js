"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var vitest_1 = require("vitest");
var quizImageStorage_js_1 = require("../../src/util/quizImageStorage.js");
var file_type_1 = require("file-type");
var storage_blob_1 = require("@azure/storage-blob");
var IQuestionStorage_interfaces_js_1 = require("../../src/util/IQuestionStorage.interfaces.js");
vitest_1.vi.mock("@azure/storage-blob", function () { return ({
    BlobServiceClient: {
        fromConnectionString: vitest_1.vi.fn(),
    },
    StorageSharedKeyCredential: vitest_1.vi.fn(),
    generateBlobSASQueryParameters: vitest_1.vi.fn(),
    BlobSASPermissions: {
        parse: vitest_1.vi.fn(),
    },
}); });
vitest_1.vi.mock("file-type", function () { return ({
    fileTypeFromBuffer: vitest_1.vi.fn(),
}); });
global.fetch = vitest_1.vi.fn();
var gmMock = {
    resize: vitest_1.vi.fn().mockReturnThis(),
    quality: vitest_1.vi.fn().mockReturnThis(),
    toBuffer: vitest_1.vi.fn(),
};
vitest_1.vi.mock("gm", function () { return ({
    default: function () { return gmMock; },
}); });
(0, vitest_1.describe)("QuizImageStorage", function () {
    var quizImageStorage;
    var blobServiceClientMock;
    var previousStorageAccountKey;
    var previousStorageAccountName;
    (0, vitest_1.beforeEach)(function () {
        vitest_1.vi.resetModules();
        vitest_1.vi.clearAllMocks();
        gmMock.resize.mockClear();
        gmMock.quality.mockClear();
        gmMock.toBuffer.mockClear();
        gmMock.toBuffer.mockImplementation(function (_format, callback) {
            callback(null, Buffer.from("optimized-image-buffer"));
        });
        previousStorageAccountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
        previousStorageAccountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
        blobServiceClientMock = {
            getContainerClient: vitest_1.vi.fn().mockReturnValue({
                getBlockBlobClient: vitest_1.vi.fn().mockReturnValue({
                    url: "mock-url",
                    uploadData: vitest_1.vi.fn().mockResolvedValue(undefined),
                }),
            }),
        };
        quizImageStorage = new quizImageStorage_js_1.QuizImageStorage("mock-connection-string", "mock-key", "mock-name", blobServiceClientMock);
        vitest_1.vi.mocked(file_type_1.fileTypeFromBuffer).mockReset();
    });
    (0, vitest_1.afterEach)(function () {
        vitest_1.vi.clearAllMocks();
        if (previousStorageAccountKey) {
            process.env.AZURE_STORAGE_ACCOUNT_KEY = previousStorageAccountKey;
        }
        else {
            delete process.env.AZURE_STORAGE_ACCOUNT_KEY;
        }
        if (previousStorageAccountName) {
            process.env.AZURE_STORAGE_ACCOUNT_NAME = previousStorageAccountName;
        }
        else {
            delete process.env.AZURE_STORAGE_ACCOUNT_NAME;
        }
    });
    (0, vitest_1.describe)("constructor", function () {
        (0, vitest_1.it)("should throw an error if connection string is missing", function () {
            (0, vitest_1.expect)(function () {
                new quizImageStorage_js_1.QuizImageStorage(undefined, "mock-key", "mock-name");
            }).toThrow("invalid connection string");
        });
        (0, vitest_1.it)("should throw an error if storage account key is missing", function () {
            delete process.env.AZURE_STORAGE_ACCOUNT_KEY;
            (0, vitest_1.expect)(function () {
                new quizImageStorage_js_1.QuizImageStorage("mock-connection-string");
            }).toThrow("invalid storage account key");
        });
        (0, vitest_1.it)("should throw an error if storage account name is missing", function () {
            delete process.env.AZURE_STORAGE_ACCOUNT_NAME;
            (0, vitest_1.expect)(function () {
                new quizImageStorage_js_1.QuizImageStorage("mock-connection-string", "mock-key");
            }).toThrow("invalid storage account name");
        });
        (0, vitest_1.it)("should create default client when connection string is provided", function () {
            new quizImageStorage_js_1.QuizImageStorage("mock-connection-string", "mock-key", "mock-name");
            (0, vitest_1.expect)(storage_blob_1.BlobServiceClient.fromConnectionString).toHaveBeenCalledWith("mock-connection-string");
        });
        (0, vitest_1.it)("should use provided client when it is specified", function () {
            var customBlobServiceClient = {
                getContainerClient: vitest_1.vi.fn().mockReturnValue({
                    getBlockBlobClient: vitest_1.vi.fn().mockReturnValue({
                        url: "custom-mock-url",
                        uploadData: vitest_1.vi.fn(),
                    }),
                }),
            };
            var storage = new quizImageStorage_js_1.QuizImageStorage("mock-connection-string", "mock-key", "mock-name", customBlobServiceClient);
            (0, vitest_1.expect)(storage["quizImageClient"]).toBe(customBlobServiceClient);
        });
    });
    (0, vitest_1.describe)("downloadAndValidateImageForDiscord", function () {
        (0, vitest_1.it)("should throw an error if image optimization fails", function () { return __awaiter(void 0, void 0, void 0, function () {
            var mockImageBuffer;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockImageBuffer = Buffer.from("mock-image-buffer");
                        global.fetch = vitest_1.vi.fn().mockResolvedValueOnce({
                            ok: true,
                            headers: {
                                get: function () { return mockImageBuffer.length.toString(); },
                            },
                            body: {
                                getReader: function () { return ({
                                    read: function () { return Promise.resolve({ value: mockImageBuffer, done: true }); },
                                }); },
                            },
                        });
                        vitest_1.vi.mocked(file_type_1.fileTypeFromBuffer).mockResolvedValueOnce({
                            mime: "image/jpeg",
                        });
                        gmMock.toBuffer.mockImplementation(function (_format, callback) {
                            callback(new Error("Image optimization failed"), null);
                        });
                        // vi.mock("gm", () => ({
                        //   default: () => ({
                        //     resize: vi.fn().mockReturnThis(),
                        //     quality: vi.fn().mockReturnThis(),
                        //     toBuffer: vi.fn((_format, callback) => {
                        //       callback(new Error("Image optimization failed"), null);
                        //     }),
                        //   }),
                        // }));
                        return [4 /*yield*/, (0, vitest_1.expect)(quizImageStorage.downloadAndValidateImageForDiscord("mock-guild", "https://image-url.com", "container", "partition", IQuestionStorage_interfaces_js_1.ImageType.Question)).rejects.toThrow("Image optimization failed")];
                    case 1:
                        // vi.mock("gm", () => ({
                        //   default: () => ({
                        //     resize: vi.fn().mockReturnThis(),
                        //     quality: vi.fn().mockReturnThis(),
                        //     toBuffer: vi.fn((_format, callback) => {
                        //       callback(new Error("Image optimization failed"), null);
                        //     }),
                        //   }),
                        // }));
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should download and validate an image with chunking", function () { return __awaiter(void 0, void 0, void 0, function () {
            var mockImageBuffer, chunk1, chunk2, url;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockImageBuffer = Buffer.from("mock-image-buffer");
                        chunk1 = mockImageBuffer.subarray(0, mockImageBuffer.length / 2);
                        chunk2 = mockImageBuffer.subarray(mockImageBuffer.length / 2);
                        global.fetch = vitest_1.vi.fn().mockResolvedValueOnce({
                            ok: true,
                            headers: {
                                get: function () { return null; },
                            },
                            body: {
                                getReader: function () { return ({
                                    read: vitest_1.vi
                                        .fn()
                                        .mockResolvedValueOnce({ done: false, value: chunk1 })
                                        .mockResolvedValueOnce({ done: false, value: chunk2 })
                                        .mockResolvedValueOnce({ done: true }),
                                }); },
                            },
                        });
                        vitest_1.vi.mocked(file_type_1.fileTypeFromBuffer).mockResolvedValueOnce({
                            mime: "image/jpeg",
                        });
                        return [4 /*yield*/, quizImageStorage.downloadAndValidateImageForDiscord("mock-guild", "https://image-url.com", "container", "partition", IQuestionStorage_interfaces_js_1.ImageType.Question)];
                    case 1:
                        url = _a.sent();
                        (0, vitest_1.expect)(url).toBe("mock-url");
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should throw an error if image size exceeds Discord's limit during chunking", function () { return __awaiter(void 0, void 0, void 0, function () {
            var mockImageBuffer, chunk;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockImageBuffer = Buffer.alloc(9 * 1024 * 1024);
                        chunk = mockImageBuffer.subarray(0, mockImageBuffer.length);
                        global.fetch = vitest_1.vi.fn().mockResolvedValueOnce({
                            ok: true,
                            headers: {
                                get: function () { return null; },
                            },
                            body: {
                                getReader: function () { return ({
                                    read: vitest_1.vi
                                        .fn()
                                        .mockResolvedValueOnce({ done: false, value: chunk })
                                        .mockResolvedValueOnce({ done: true }),
                                }); },
                            },
                        });
                        return [4 /*yield*/, (0, vitest_1.expect)(quizImageStorage.downloadAndValidateImageForDiscord("mock-guild", "https://image-url.com", "container", "partition", IQuestionStorage_interfaces_js_1.ImageType.Question)).rejects.toThrow("Image size exceeds Discord's 8MB limit.")];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should download and validate an image", function () { return __awaiter(void 0, void 0, void 0, function () {
            var mockImageBuffer, url;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockImageBuffer = Buffer.from("mock-image-buffer");
                        global.fetch = vitest_1.vi.fn().mockResolvedValueOnce({
                            ok: true,
                            headers: {
                                get: function () { return mockImageBuffer.length.toString(); },
                            },
                            body: {
                                getReader: function () { return ({
                                    read: function () { return Promise.resolve({ value: mockImageBuffer, done: true }); },
                                }); },
                            },
                        });
                        vitest_1.vi.mocked(file_type_1.fileTypeFromBuffer).mockResolvedValueOnce({
                            mime: "image/jpeg",
                        });
                        return [4 /*yield*/, quizImageStorage.downloadAndValidateImageForDiscord("mock-guild", "https://image-url.com", "container", "partition", IQuestionStorage_interfaces_js_1.ImageType.Question)];
                    case 1:
                        url = _a.sent();
                        (0, vitest_1.expect)(url).toBe("mock-url");
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should throw an error if the image is too large", function () { return __awaiter(void 0, void 0, void 0, function () {
            var mockImageBuffer;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockImageBuffer = Buffer.alloc(9 * 1024 * 1024);
                        global.fetch = vitest_1.vi.fn().mockResolvedValueOnce({
                            ok: true,
                            headers: {
                                get: function () { return mockImageBuffer.length.toString(); },
                            },
                            body: {
                                getReader: function () { return ({
                                    read: function () { return Promise.resolve({ value: mockImageBuffer, done: true }); },
                                }); },
                            },
                        });
                        return [4 /*yield*/, (0, vitest_1.expect)(quizImageStorage.downloadAndValidateImageForDiscord("mock-guild", "https://image-url.com", "container", "partition", IQuestionStorage_interfaces_js_1.ImageType.Question)).rejects.toThrow("Image size exceeds Discord's 8MB limit.")];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should throw an error if the image type is invalid", function () { return __awaiter(void 0, void 0, void 0, function () {
            var mockImageBuffer;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockImageBuffer = Buffer.from("mock-image-buffer");
                        global.fetch = vitest_1.vi.fn().mockResolvedValueOnce({
                            ok: true,
                            headers: {
                                get: function () { return mockImageBuffer.length.toString(); },
                            },
                            body: {
                                getReader: function () { return ({
                                    read: function () { return Promise.resolve({ value: mockImageBuffer, done: true }); },
                                }); },
                            },
                        });
                        vitest_1.vi.mocked(file_type_1.fileTypeFromBuffer).mockResolvedValueOnce({
                            mime: "image/bmp",
                        });
                        return [4 /*yield*/, (0, vitest_1.expect)(quizImageStorage.downloadAndValidateImageForDiscord("mock-guild", "https://image-url.com", "container", "partition", IQuestionStorage_interfaces_js_1.ImageType.Question)).rejects.toThrow("Invalid image file type for Discord.")];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should throw an error if the fetch response is not ok", function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        global.fetch = vitest_1.vi.fn().mockResolvedValueOnce({
                            ok: false,
                            status: 404,
                            statusText: "Not Found",
                        });
                        return [4 /*yield*/, (0, vitest_1.expect)(quizImageStorage.downloadAndValidateImageForDiscord("mock-guild", "https://image-url.com", "container", "partition", IQuestionStorage_interfaces_js_1.ImageType.Question)).rejects.toThrow("Failed to fetch image: 404 Not Found")];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should throw an error if imageStream is not available", function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        global.fetch = vitest_1.vi.fn().mockResolvedValueOnce({
                            ok: true,
                            headers: {
                                get: function () { return "1024"; },
                            },
                            body: null,
                        });
                        return [4 /*yield*/, (0, vitest_1.expect)(quizImageStorage.downloadAndValidateImageForDiscord("mock-guild", "https://image-url.com", "container", "partition", IQuestionStorage_interfaces_js_1.ImageType.Question)).rejects.toThrow("Unable to download the file from the URL https://image-url.com")];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, vitest_1.describe)("getPresignedUrl", function () {
        (0, vitest_1.it)("should return a presigned URL", function () { return __awaiter(void 0, void 0, void 0, function () {
            var mockUrl, mockSasToken, blockBlobClientMock, containerClientMock, mockSASQueryParameters, url;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockUrl = "mock-url";
                        mockSasToken = "mock-sas-token";
                        blockBlobClientMock = {
                            url: mockUrl,
                        };
                        containerClientMock = {
                            getBlockBlobClient: vitest_1.vi.fn().mockReturnValue(blockBlobClientMock),
                        };
                        blobServiceClientMock.getContainerClient.mockReturnValue(containerClientMock);
                        mockSASQueryParameters = {
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
                            toString: vitest_1.vi.fn().mockReturnValue(mockSasToken),
                        };
                        vitest_1.vi.mocked(storage_blob_1.generateBlobSASQueryParameters).mockReturnValue(mockSASQueryParameters);
                        return [4 /*yield*/, quizImageStorage.getPresignedUrl("container", "partition")];
                    case 1:
                        url = _a.sent();
                        (0, vitest_1.expect)(url).toBe("".concat(mockUrl, "?").concat(mockSasToken));
                        (0, vitest_1.expect)(containerClientMock.getBlockBlobClient).toHaveBeenCalledWith("partition.jpg");
                        (0, vitest_1.expect)(mockSASQueryParameters.toString).toHaveBeenCalled();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, vitest_1.describe)("getQuestionImagePresignedUrl", function () {
        (0, vitest_1.it)("should return a presigned URL for question image", function () { return __awaiter(void 0, void 0, void 0, function () {
            var url;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, quizImageStorage.getQuestionImagePresignedUrl("mock-guild", "bank1", "question1")];
                    case 1:
                        url = _a.sent();
                        (0, vitest_1.expect)(url).toBe("mock-url?mock-sas-token");
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, vitest_1.describe)("getExplanationImagePresignedUrl", function () {
        (0, vitest_1.it)("should return a presigned URL for explanation image", function () { return __awaiter(void 0, void 0, void 0, function () {
            var url;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, quizImageStorage.getExplanationImagePresignedUrl("mock-guild", "bank1", "question1")];
                    case 1:
                        url = _a.sent();
                        (0, vitest_1.expect)(url).toBe("mock-url?mock-sas-token");
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
