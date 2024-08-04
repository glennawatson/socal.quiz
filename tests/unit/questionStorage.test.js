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
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = {}, verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function () { return this; }, i;
    function awaitReturn(f) { return function (v) { return Promise.resolve(v).then(f, reject); }; }
    function verb(n, f) { if (g[n]) { i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; if (f) i[n] = f(i[n]); } }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
Object.defineProperty(exports, "__esModule", { value: true });
var vitest_1 = require("vitest");
var questionStorage_js_1 = require("../../src/util/questionStorage.js");
var data_tables_1 = require("@azure/data-tables");
var file_type_1 = require("file-type");
var storage_blob_1 = require("@azure/storage-blob");
var quizImageStorage_js_1 = require("../../src/util/quizImageStorage.js");
vitest_1.vi.mock("@azure/data-tables", function () { return ({
    TableClient: {
        fromConnectionString: vitest_1.vi.fn(),
    },
    odata: vitest_1.vi.fn(),
}); });
vitest_1.vi.mock("@azure/storage-blob", function () { return ({
    BlobServiceClient: {
        fromConnectionString: vitest_1.vi.fn().mockReturnValue({
            getContainerClient: vitest_1.vi.fn().mockReturnValue({
                getBlockBlobClient: vitest_1.vi.fn().mockReturnValue({
                    url: "mock-url",
                    uploadData: vitest_1.vi.fn().mockResolvedValue(undefined),
                }),
            }),
        }),
    },
    BlobSASPermissions: {
        parse: vitest_1.vi.fn(),
    },
    StorageSharedKeyCredential: vitest_1.vi.fn(),
    generateBlobSASQueryParameters: vitest_1.vi.fn().mockReturnValue({
        toString: vitest_1.vi.fn().mockReturnValue("mock-sas-token"),
    }),
}); });
vitest_1.vi.mock("uuid", function () { return ({
    v4: vitest_1.vi.fn(function () { return "mock-uuid"; }),
}); });
vitest_1.vi.mock("file-type", function () { return ({
    __esModule: true,
    fileTypeFromBuffer: vitest_1.vi.fn(),
}); });
vitest_1.vi.mock("../../src/util/errorHelpers", function () { return ({
    throwError: vitest_1.vi.fn(function (msg) {
        throw new Error(msg);
    }),
}); });
global.fetch = vitest_1.vi.fn();
(0, vitest_1.describe)("QuestionStorage", function () {
    var questionStorage;
    var tableClientMock;
    var blobServiceClientMock;
    var previousConnectionString;
    var previousStorageAccountName;
    var previousStorageAccountKey;
    var quizImageStorage;
    (0, vitest_1.beforeEach)(function () {
        previousConnectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        previousStorageAccountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
        previousStorageAccountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
        vitest_1.vi.resetModules();
        vitest_1.vi.clearAllMocks();
        tableClientMock = {
            createEntity: vitest_1.vi.fn(),
            listEntities: vitest_1.vi.fn(),
            deleteEntity: vitest_1.vi.fn(),
            updateEntity: vitest_1.vi.fn(),
        };
        blobServiceClientMock = {
            getContainerClient: vitest_1.vi.fn().mockReturnValue({
                getBlockBlobClient: vitest_1.vi.fn().mockReturnValue({
                    url: "mock-url",
                    uploadData: vitest_1.vi.fn(),
                    exists: vitest_1.vi.fn().mockResolvedValue(false),
                }),
            }),
        };
        quizImageStorage = new quizImageStorage_js_1.QuizImageStorage("mock-connection-string", "mock-key", "mock-name", blobServiceClientMock);
        questionStorage = new questionStorage_js_1.QuestionStorage(quizImageStorage, "mock-connection-string", tableClientMock);
        vitest_1.vi.mocked(file_type_1.fileTypeFromBuffer).mockReset();
    });
    (0, vitest_1.afterEach)(function () {
        vitest_1.vi.clearAllMocks();
        if (previousConnectionString) {
            process.env.AZURE_STORAGE_CONNECTION_STRING = previousConnectionString;
        }
        else {
            delete process.env.AZURE_STORAGE_CONNECTION_STRING;
        }
        if (previousStorageAccountName) {
            process.env.AZURE_STORAGE_ACCOUNT_NAME = previousStorageAccountName;
        }
        else {
            delete process.env.AZURE_STORAGE_ACCOUNT_NAME;
        }
        if (previousStorageAccountKey) {
            process.env.AZURE_STORAGE_ACCOUNT_KEY = previousStorageAccountKey;
        }
        else {
            delete process.env.AZURE_STORAGE_ACCOUNT_KEY;
        }
    });
    (0, vitest_1.describe)("generateAnswer", function () {
        (0, vitest_1.it)("should generate an answer with a unique ID", function () { return __awaiter(void 0, void 0, void 0, function () {
            var answerText, expectedAnswerId, answer;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        answerText = "This is an answer";
                        expectedAnswerId = "mock-uuid";
                        return [4 /*yield*/, questionStorage.generateAnswer(answerText)];
                    case 1:
                        answer = _a.sent();
                        (0, vitest_1.expect)(answer).toEqual({
                            answer: answerText,
                            answerId: expectedAnswerId,
                        });
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, vitest_1.describe)("constructor", function () {
        (0, vitest_1.it)("should throw an error if storage account key is missing", function () {
            delete process.env.AZURE_STORAGE_ACCOUNT_KEY;
            (0, vitest_1.expect)(function () {
                new questionStorage_js_1.QuestionStorage(new quizImageStorage_js_1.QuizImageStorage("mock-connection-string"), "mock-connection-string");
            }).toThrow("invalid storage account key");
        });
        (0, vitest_1.it)("should throw an error if connection string is missing account name", function () {
            (0, vitest_1.expect)(function () {
                delete process.env.AZURE_STORAGE_ACCOUNT_NAME;
                new questionStorage_js_1.QuestionStorage(new quizImageStorage_js_1.QuizImageStorage("mock-connection-string"), "");
            }).toThrow("invalid storage account name");
        });
        (0, vitest_1.it)("should throw an error if connection string is missing and quizImageClient is not set", function () {
            delete process.env.AZURE_STORAGE_CONNECTION_STRING;
            (0, vitest_1.expect)(function () {
                new questionStorage_js_1.QuestionStorage(new quizImageStorage_js_1.QuizImageStorage("mock-connection-string"));
            }).toThrow("invalid azure storage connection string");
        });
        (0, vitest_1.it)("should throw an error if connection string is missing and clients are not provided", function () {
            delete process.env.AZURE_STORAGE_CONNECTION_STRING;
            (0, vitest_1.expect)(function () {
                new questionStorage_js_1.QuestionStorage(new quizImageStorage_js_1.QuizImageStorage("mock-connection-string"));
            }).toThrow("invalid azure storage connection string");
        });
        (0, vitest_1.it)("should create default clients when connection string is provided", function () {
            new questionStorage_js_1.QuestionStorage(new quizImageStorage_js_1.QuizImageStorage("mock-connection-string"), "mock-connection-string");
            (0, vitest_1.expect)(data_tables_1.TableClient.fromConnectionString).toHaveBeenCalledWith("mock-connection-string", "QuizQuestions");
            (0, vitest_1.expect)(storage_blob_1.BlobServiceClient.fromConnectionString).toHaveBeenCalledWith("mock-connection-string");
        });
        (0, vitest_1.it)("should use provided clients when they are specified", function () {
            var customTableClient = {
                createEntity: vitest_1.vi.fn(),
                listEntities: vitest_1.vi.fn(),
                deleteEntity: vitest_1.vi.fn(),
            };
            var customBlobServiceClient = {
                getContainerClient: vitest_1.vi.fn().mockReturnValue({
                    getBlockBlobClient: vitest_1.vi.fn().mockReturnValue({
                        url: "custom-mock-url",
                        uploadData: vitest_1.vi.fn(),
                    }),
                }),
            };
            var storage = new questionStorage_js_1.QuestionStorage(new quizImageStorage_js_1.QuizImageStorage("mock-connection-string", "mock-key", "mock-name", customBlobServiceClient), "mock-connection-string", customTableClient);
            (0, vitest_1.expect)(storage["quizQuestionsClient"]).toBe(customTableClient);
        });
    });
    (0, vitest_1.describe)("getQuestions", function () {
        (0, vitest_1.it)("should return a list of questions", function () { return __awaiter(void 0, void 0, void 0, function () {
            var mockQuestions, questions;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockQuestions = [
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
                        return [4 /*yield*/, questionStorage.getQuestions("guild1", "bank1")];
                    case 1:
                        questions = _a.sent();
                        (0, vitest_1.expect)(questions).toEqual([
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
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, vitest_1.describe)("addQuestion", function () {
        (0, vitest_1.it)("should add a question", function () { return __awaiter(void 0, void 0, void 0, function () {
            var question;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        question = {
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
                        return [4 /*yield*/, questionStorage.addQuestion("guild1", question)];
                    case 1:
                        _a.sent();
                        (0, vitest_1.expect)(tableClientMock.createEntity).toHaveBeenCalledWith({
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
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, vitest_1.describe)("deleteQuestion", function () {
        (0, vitest_1.it)("should delete a question", function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, questionStorage.deleteQuestion("guild1", "bank1", "question1")];
                    case 1:
                        _a.sent();
                        (0, vitest_1.expect)(tableClientMock.deleteEntity).toHaveBeenCalledWith("guild1-bank1", "question1");
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, vitest_1.describe)("getQuestion", function () {
        (0, vitest_1.it)("should return a question by its ID", function () { return __awaiter(void 0, void 0, void 0, function () {
            var mockEntity, question;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockEntity = {
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
                        tableClientMock.getEntity = vitest_1.vi.fn().mockResolvedValue(mockEntity);
                        return [4 /*yield*/, questionStorage.getQuestion("guild1", "bank1", "question1")];
                    case 1:
                        question = _a.sent();
                        (0, vitest_1.expect)(tableClientMock.getEntity).toHaveBeenCalledWith("guild1-bank1", "question1");
                        (0, vitest_1.expect)(question).toEqual({
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
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should throw an error if the question is not found", function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        tableClientMock.getEntity = vitest_1.vi
                            .fn()
                            .mockRejectedValue(new Error("Entity not found"));
                        return [4 /*yield*/, (0, vitest_1.expect)(questionStorage.getQuestion("guild1", "bank1", "question1")).rejects.toThrow("Entity not found")];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, vitest_1.describe)("getQuestionBankNames", function () {
        (0, vitest_1.it)("should return a list of unique question bank names", function () { return __awaiter(void 0, void 0, void 0, function () {
            var mockEntities, bankNames;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        data_tables_1.odata.mockImplementation(function () {
                            return "PartitionKey ge 'guild1_'";
                        });
                        mockEntities = [
                            { partitionKey: "guild1_bank1" },
                            { partitionKey: "guild1_bank2" },
                            { partitionKey: "guild1_bank1" }, // Duplicate bank name
                        ];
                        tableClientMock.listEntities.mockReturnValue((_a = {},
                            _a[Symbol.asyncIterator] = function () {
                                return __asyncGenerator(this, arguments, function _a() {
                                    var _i, mockEntities_1, entity;
                                    return __generator(this, function (_b) {
                                        switch (_b.label) {
                                            case 0:
                                                _i = 0, mockEntities_1 = mockEntities;
                                                _b.label = 1;
                                            case 1:
                                                if (!(_i < mockEntities_1.length)) return [3 /*break*/, 5];
                                                entity = mockEntities_1[_i];
                                                return [4 /*yield*/, __await(entity)];
                                            case 2: return [4 /*yield*/, _b.sent()];
                                            case 3:
                                                _b.sent();
                                                _b.label = 4;
                                            case 4:
                                                _i++;
                                                return [3 /*break*/, 1];
                                            case 5: return [2 /*return*/];
                                        }
                                    });
                                });
                            },
                            _a));
                        return [4 /*yield*/, questionStorage.getQuestionBankNames("guild1")];
                    case 1:
                        bankNames = _b.sent();
                        (0, vitest_1.expect)(tableClientMock.listEntities).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                            queryOptions: vitest_1.expect.objectContaining({
                                filter: "PartitionKey ge 'guild1_'",
                            }),
                        }));
                        (0, vitest_1.expect)(bankNames).toEqual(["bank1", "bank2"]);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return an empty array if no question banks are found", function () { return __awaiter(void 0, void 0, void 0, function () {
            var bankNames;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        tableClientMock.listEntities.mockReturnValue((_a = {},
                            _a[Symbol.asyncIterator] = function () {
                                return __asyncGenerator(this, arguments, function _a() {
                                    return __generator(this, function (_b) {
                                        return [2 /*return*/];
                                    });
                                });
                            },
                            _a));
                        return [4 /*yield*/, questionStorage.getQuestionBankNames("guild1")];
                    case 1:
                        bankNames = _b.sent();
                        (0, vitest_1.expect)(bankNames).toEqual([]);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, vitest_1.describe)("deleteQuestionBank", function () {
        (0, vitest_1.it)("should delete all questions in a bank", function () { return __awaiter(void 0, void 0, void 0, function () {
            var mockEntities;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        mockEntities = [
                            { partitionKey: "guild1-bank1", rowKey: "question1" },
                            { partitionKey: "guild1-bank1", rowKey: "question2" },
                        ];
                        data_tables_1.odata.mockImplementation(function () {
                            return "PartitionKey eq 'guild1-bank1'";
                        });
                        tableClientMock.listEntities.mockReturnValue((_a = {},
                            _a[Symbol.asyncIterator] = function () {
                                return __asyncGenerator(this, arguments, function _a() {
                                    var _i, mockEntities_2, entity;
                                    return __generator(this, function (_b) {
                                        switch (_b.label) {
                                            case 0:
                                                _i = 0, mockEntities_2 = mockEntities;
                                                _b.label = 1;
                                            case 1:
                                                if (!(_i < mockEntities_2.length)) return [3 /*break*/, 5];
                                                entity = mockEntities_2[_i];
                                                return [4 /*yield*/, __await(entity)];
                                            case 2: return [4 /*yield*/, _b.sent()];
                                            case 3:
                                                _b.sent();
                                                _b.label = 4;
                                            case 4:
                                                _i++;
                                                return [3 /*break*/, 1];
                                            case 5: return [2 /*return*/];
                                        }
                                    });
                                });
                            },
                            _a));
                        tableClientMock.deleteEntity.mockResolvedValue(undefined);
                        return [4 /*yield*/, questionStorage.deleteQuestionBank("guild1", "bank1")];
                    case 1:
                        _b.sent();
                        (0, vitest_1.expect)(tableClientMock.listEntities).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                            queryOptions: vitest_1.expect.objectContaining({
                                filter: "PartitionKey eq 'guild1-bank1'",
                            }),
                        }));
                        (0, vitest_1.expect)(tableClientMock.deleteEntity).toHaveBeenCalledTimes(2);
                        (0, vitest_1.expect)(tableClientMock.deleteEntity).toHaveBeenCalledWith("guild1-bank1", "question1");
                        (0, vitest_1.expect)(tableClientMock.deleteEntity).toHaveBeenCalledWith("guild1-bank1", "question2");
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, vitest_1.describe)("generateAndAddQuestion", function () {
        (0, vitest_1.it)("should generate and add a question", function () { return __awaiter(void 0, void 0, void 0, function () {
            var mockQuestion;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockQuestion = {
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
                        vitest_1.vi.spyOn(questionStorage, "generateQuestion").mockResolvedValue(mockQuestion);
                        return [4 /*yield*/, questionStorage.generateAndAddQuestion("guild1", "bank1", "What is 2+2?", [
                                { answerId: "1", answer: "3" },
                                { answerId: "2", answer: "4" },
                            ], "2", 20000)];
                    case 1:
                        _a.sent();
                        (0, vitest_1.expect)(questionStorage.generateQuestion).toHaveBeenCalledWith("guild1", "bank1", "What is 2+2?", [
                            { answerId: "1", answer: "3" },
                            { answerId: "2", answer: "4" },
                        ], "2", 20000, undefined, undefined, undefined);
                        (0, vitest_1.expect)(tableClientMock.createEntity).toHaveBeenCalledWith({
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
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, vitest_1.describe)("generateQuestion", function () {
        (0, vitest_1.it)("should generate a question", function () { return __awaiter(void 0, void 0, void 0, function () {
            var question;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, questionStorage.generateQuestion("guild1", "bank1", "What is 2+2?", [
                            { answerId: "1", answer: "3" },
                            { answerId: "2", answer: "4" },
                        ], "2", 20000)];
                    case 1:
                        question = _a.sent();
                        (0, vitest_1.expect)(question).toEqual({
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
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should generate a question with images", function () { return __awaiter(void 0, void 0, void 0, function () {
            var question;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        quizImageStorage.downloadAndValidateImageForDiscord = vitest_1.vi
                            .fn()
                            .mockResolvedValue("mock-url");
                        global.fetch = vitest_1.vi.fn().mockResolvedValue({
                            ok: true,
                            headers: {
                                get: function () { return "1024"; },
                            },
                            body: {
                                getReader: function () {
                                    var done = false;
                                    return {
                                        read: function () {
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
                        });
                        file_type_1.fileTypeFromBuffer
                            .mockResolvedValueOnce({ mime: "image/jpeg" })
                            .mockResolvedValueOnce({ mime: "image/png" });
                        return [4 /*yield*/, questionStorage.generateQuestion("guild1", "bank1", "What is 2+2?", [
                                { answerId: "1", answer: "3" },
                                { answerId: "2", answer: "4" },
                            ], "2", 20000, "https://image-url.com", "Explanation", "https://explanation-image-url.com")];
                    case 1:
                        question = _a.sent();
                        (0, vitest_1.expect)(question).toEqual({
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
                        (0, vitest_1.expect)(quizImageStorage.downloadAndValidateImageForDiscord).toHaveBeenCalledWith("guild1", "https://image-url.com", "bank1", "mock-uuid", "QuestionImage");
                        (0, vitest_1.expect)(quizImageStorage.downloadAndValidateImageForDiscord).toHaveBeenCalledWith("guild1", "https://explanation-image-url.com", "bank1", "mock-uuid", "ExplanationImage");
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, vitest_1.describe)("addQuestions", function () {
        (0, vitest_1.it)("should add multiple questions", function () { return __awaiter(void 0, void 0, void 0, function () {
            var questions;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        questions = [
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
                        return [4 /*yield*/, questionStorage.addQuestions("guild1", questions)];
                    case 1:
                        _a.sent();
                        (0, vitest_1.expect)(tableClientMock.createEntity).toHaveBeenCalledTimes(2);
                        (0, vitest_1.expect)(tableClientMock.createEntity).toHaveBeenCalledWith({
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
                        (0, vitest_1.expect)(tableClientMock.createEntity).toHaveBeenCalledWith({
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
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, vitest_1.describe)("updateQuestion", function () {
        (0, vitest_1.it)("should update an existing question", function () { return __awaiter(void 0, void 0, void 0, function () {
            var question;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        question = {
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
                        return [4 /*yield*/, questionStorage.updateQuestion("guild1", question)];
                    case 1:
                        _a.sent();
                        (0, vitest_1.expect)(tableClientMock.updateEntity).toHaveBeenCalledWith({
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
                        }, "Merge");
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
