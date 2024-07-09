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
var config_js_1 = require("@src/util/config.js");
var questionBankHttpTriggers_js_1 = require("@src/functions/questionBankHttpTriggers.js");
var authHelper_js_1 = require("@src/util/authHelper.js");
vitest_1.vi.mock("@src/util/authHelper", function () { return ({
    validateAuthAndGuildOwnership: vitest_1.vi.fn(),
    isErrorResponse: vitest_1.vi.fn(),
}); });
vitest_1.vi.mock("@src/util/config.js");
var setupMocks = function () {
    var mockQuestionStorage = {
        deleteQuestion: vitest_1.vi.fn(),
        getQuestion: vitest_1.vi.fn(),
        getQuestions: vitest_1.vi.fn(),
        updateQuestion: vitest_1.vi.fn(),
        getQuestionBankNames: vitest_1.vi.fn(),
        generateAnswer: vitest_1.vi.fn(),
    };
    var mockImageStorage = {
        downloadAndValidateImageForDiscord: vitest_1.vi.fn(),
    };
    config_js_1.Config.initialize = vitest_1.vi.fn().mockResolvedValue(undefined);
    config_js_1.Config.questionStorage = mockQuestionStorage;
    config_js_1.Config.imageStorage = mockImageStorage;
    return { mockQuestionStorage: mockQuestionStorage, mockImageStorage: mockImageStorage };
};
var createMockHttpRequest = function (queryParams, body, headers) {
    if (headers === void 0) { headers = {}; }
    return ({
        query: new Map(Object.entries(queryParams)),
        text: vitest_1.vi.fn().mockResolvedValue(JSON.stringify(body)),
        headers: new Map(Object.entries(headers)),
    });
};
var createMockInvocationContext = function () {
    return ({
        log: vitest_1.vi.fn(),
        error: vitest_1.vi.fn(),
    });
};
(0, vitest_1.describe)("Question Handlers", function () {
    var mockQuestionStorage;
    var mockHttpRequest;
    var mockInvocationContext;
    (0, vitest_1.beforeEach)(function () {
        var mocks = setupMocks();
        mockQuestionStorage = mocks.mockQuestionStorage;
        mockInvocationContext = createMockInvocationContext();
        vitest_1.vi.mocked(authHelper_js_1.validateAuthAndGuildOwnership).mockResolvedValue({
            guildId: "testGuildId",
            userId: "abc",
        });
        vitest_1.vi.mocked(authHelper_js_1.isErrorResponse).mockReturnValue(false);
    });
    (0, vitest_1.describe)("deleteQuestionHandler", function () {
        (0, vitest_1.beforeEach)(function () {
            mockHttpRequest = createMockHttpRequest({
                bankname: "testBank",
                questionId: "testQuestionId",
            });
        });
        (0, vitest_1.it)("should return 400 if bankName or questionId is missing", function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockHttpRequest.query.delete("bankname");
                        return [4 /*yield*/, (0, questionBankHttpTriggers_js_1.deleteQuestionHandler)(mockHttpRequest, mockInvocationContext)];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response.status).toBe(400);
                        (0, vitest_1.expect)(response.body).toBe(JSON.stringify("Required fields: bankName, questionId"));
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return 200 if question is deleted successfully", function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockQuestionStorage.deleteQuestion.mockResolvedValue(undefined);
                        return [4 /*yield*/, (0, questionBankHttpTriggers_js_1.deleteQuestionHandler)(mockHttpRequest, mockInvocationContext)];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response.status).toBe(200);
                        (0, vitest_1.expect)(response.body).toBe(JSON.stringify("Question deleted successfully"));
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return 500 if an error occurs", function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockQuestionStorage.deleteQuestion.mockRejectedValue(new Error("Deletion error"));
                        return [4 /*yield*/, (0, questionBankHttpTriggers_js_1.deleteQuestionHandler)(mockHttpRequest, mockInvocationContext)];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response.status).toBe(500);
                        (0, vitest_1.expect)(response.body).toBe(JSON.stringify("Error deleting question"));
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, vitest_1.describe)("getQuestionHandler", function () {
        (0, vitest_1.beforeEach)(function () {
            mockHttpRequest = createMockHttpRequest({
                bankname: "testBank",
                questionId: "testQuestionId",
            });
        });
        (0, vitest_1.it)("should return 400 if bankName or questionId is missing", function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockHttpRequest.query.delete("bankname");
                        return [4 /*yield*/, (0, questionBankHttpTriggers_js_1.getQuestionHandler)(mockHttpRequest, mockInvocationContext)];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response.status).toBe(400);
                        (0, vitest_1.expect)(response.body).toBe(JSON.stringify("Required fields: bankName, questionId"));
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return 200 if question is retrieved successfully", function () { return __awaiter(void 0, void 0, void 0, function () {
            var mockQuestion, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockQuestion = {
                            questionId: "testQuestionId",
                            question: "testQuestion",
                        };
                        mockQuestionStorage.getQuestion.mockResolvedValue(mockQuestion);
                        return [4 /*yield*/, (0, questionBankHttpTriggers_js_1.getQuestionHandler)(mockHttpRequest, mockInvocationContext)];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response.status).toBe(200);
                        (0, vitest_1.expect)(response.body).toBe(JSON.stringify(mockQuestion));
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return 500 if an error occurs", function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockQuestionStorage.getQuestion.mockRejectedValue(new Error("Fetch error"));
                        return [4 /*yield*/, (0, questionBankHttpTriggers_js_1.getQuestionHandler)(mockHttpRequest, mockInvocationContext)];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response.status).toBe(500);
                        (0, vitest_1.expect)(response.body).toBe(JSON.stringify("Error fetching question"));
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, vitest_1.describe)("updateQuestionHandler", function () {
        (0, vitest_1.beforeEach)(function () {
            mockHttpRequest = createMockHttpRequest({}, {
                bankName: "testBank",
                questionId: "testQuestionId",
                questionText: "updated question",
                answers: ["answer1", "answer2"],
                correctAnswerIndex: 1,
                imageUrl: "http://example.com/image.png",
                explanation: "updated explanation",
                explanationImageUrl: "http://example.com/explanation.png",
                showTimeMs: 30000,
            });
        });
        (0, vitest_1.it)("should return 400 if requestBody is missing", function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockHttpRequest = createMockHttpRequest({}, null); // Simulate missing request body
                        mockHttpRequest.text.mockResolvedValue(undefined);
                        return [4 /*yield*/, (0, questionBankHttpTriggers_js_1.updateQuestionHandler)(mockHttpRequest, mockInvocationContext)];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response.status).toBe(500);
                        (0, vitest_1.expect)(response.body).toBe(JSON.stringify("Invalid JSON body"));
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return 400 if answers are provided without correctAnswerIndex", function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockHttpRequest.text.mockResolvedValue(JSON.stringify({
                            bankName: "testBank",
                            questionId: "testQuestionId",
                            questionText: "updated question",
                            answers: ["answer1", "answer2"],
                            imageUrl: "http://example.com/image.png",
                            explanation: "updated explanation",
                            explanationImageUrl: "http://example.com/explanation.png",
                            showTimeMs: 30000,
                        }));
                        return [4 /*yield*/, (0, questionBankHttpTriggers_js_1.updateQuestionHandler)(mockHttpRequest, mockInvocationContext)];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response.status).toBe(400);
                        (0, vitest_1.expect)(response.body).toBe(JSON.stringify("Must have correct answer ID with answers"));
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return 400 if correctAnswerIndex is out of bounds", function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockHttpRequest.text.mockResolvedValue(JSON.stringify({
                            bankName: "testBank",
                            questionId: "testQuestionId",
                            questionText: "updated question",
                            answers: ["answer1", "answer2"],
                            correctAnswerIndex: 3,
                            imageUrl: "http://example.com/image.png",
                            explanation: "updated explanation",
                            explanationImageUrl: "http://example.com/explanation.png",
                            showTimeMs: 30000,
                        }));
                        return [4 /*yield*/, (0, questionBankHttpTriggers_js_1.updateQuestionHandler)(mockHttpRequest, mockInvocationContext)];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response.status).toBe(400);
                        (0, vitest_1.expect)(response.body).toBe(JSON.stringify("Correct answer index must be between 0 and 1"));
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should update the correctAnswerId if correctAnswer is found", function () { return __awaiter(void 0, void 0, void 0, function () {
            var mockQuestion, requestBody;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockQuestion = {
                            questionId: "testQuestionId",
                            question: "testQuestion",
                            answers: [],
                            correctAnswerId: "",
                        };
                        mockQuestionStorage.getQuestion.mockResolvedValue(mockQuestion);
                        mockQuestionStorage.generateAnswer.mockImplementation(function (answerText) { return ({ answerId: answerText, answer: answerText }); });
                        requestBody = {
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
                        mockHttpRequest.text.mockResolvedValue(JSON.stringify(requestBody));
                        return [4 /*yield*/, (0, questionBankHttpTriggers_js_1.updateQuestionHandler)(mockHttpRequest, mockInvocationContext)];
                    case 1:
                        _a.sent();
                        (0, vitest_1.expect)(mockQuestion.correctAnswerId).toBe("answer2");
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return 400 if bankName or questionId is missing", function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockHttpRequest.text.mockResolvedValue(JSON.stringify({
                            questionId: "testQuestionId",
                            questionText: "updated question",
                            answers: ["answer1", "answer2"],
                            correctAnswerIndex: 1,
                            imageUrl: "http://example.com/image.png",
                            explanation: "updated explanation",
                            explanationImageUrl: "http://example.com/explanation.png",
                            showTimeMs: 30000,
                        }));
                        return [4 /*yield*/, (0, questionBankHttpTriggers_js_1.updateQuestionHandler)(mockHttpRequest, mockInvocationContext)];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response.status).toBe(400);
                        (0, vitest_1.expect)(response.body).toBe(JSON.stringify("Required fields: bankName, questionId"));
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return 200 if question is updated successfully", function () { return __awaiter(void 0, void 0, void 0, function () {
            var mockQuestion, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockQuestion = {
                            questionId: "testQuestionId",
                            question: "testQuestion",
                        };
                        mockQuestionStorage.getQuestion.mockResolvedValue(mockQuestion);
                        return [4 /*yield*/, (0, questionBankHttpTriggers_js_1.updateQuestionHandler)(mockHttpRequest, mockInvocationContext)];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response.status).toBe(200);
                        (0, vitest_1.expect)(response.body).toBe(JSON.stringify("Question updated successfully"));
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return 500 if an error occurs", function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockQuestionStorage.getQuestion.mockRejectedValue(new Error("Update error"));
                        return [4 /*yield*/, (0, questionBankHttpTriggers_js_1.updateQuestionHandler)(mockHttpRequest, mockInvocationContext)];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response.status).toBe(500);
                        (0, vitest_1.expect)(response.body).toBe(JSON.stringify("Error updating question"));
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, vitest_1.describe)("getQuestionsHandler", function () {
        (0, vitest_1.beforeEach)(function () {
            mockHttpRequest = createMockHttpRequest({ bankname: "testBank" });
        });
        (0, vitest_1.it)("should return 400 if bankName is missing", function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockHttpRequest.query.delete("bankname");
                        return [4 /*yield*/, (0, questionBankHttpTriggers_js_1.getQuestionsHandler)(mockHttpRequest, mockInvocationContext)];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response.status).toBe(400);
                        (0, vitest_1.expect)(response.body).toBe(JSON.stringify("Required field: bankname"));
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return 200 if questions are retrieved successfully", function () { return __awaiter(void 0, void 0, void 0, function () {
            var mockQuestions, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockQuestions = [
                            { questionId: "testQuestionId", question: "testQuestion" },
                        ];
                        mockQuestionStorage.getQuestions.mockResolvedValue(mockQuestions);
                        return [4 /*yield*/, (0, questionBankHttpTriggers_js_1.getQuestionsHandler)(mockHttpRequest, mockInvocationContext)];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response.status).toBe(200);
                        (0, vitest_1.expect)(response.body).toBe(JSON.stringify(mockQuestions));
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return 500 if an error occurs", function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockQuestionStorage.getQuestions.mockRejectedValue(new Error("Fetch error"));
                        return [4 /*yield*/, (0, questionBankHttpTriggers_js_1.getQuestionsHandler)(mockHttpRequest, mockInvocationContext)];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response.status).toBe(500);
                        (0, vitest_1.expect)(response.body).toBe(JSON.stringify("Error retrieving questions"));
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, vitest_1.describe)("getQuestionBankNamesHandler", function () {
        (0, vitest_1.beforeEach)(function () {
            mockHttpRequest = createMockHttpRequest({});
        });
        (0, vitest_1.it)("should return 200 if question bank names are retrieved successfully", function () { return __awaiter(void 0, void 0, void 0, function () {
            var mockBankNames, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockBankNames = ["testBank1", "testBank2"];
                        mockQuestionStorage.getQuestionBankNames.mockResolvedValue(mockBankNames);
                        return [4 /*yield*/, (0, questionBankHttpTriggers_js_1.getQuestionBankNamesHandler)(mockHttpRequest, mockInvocationContext)];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response.status).toBe(200);
                        (0, vitest_1.expect)(response.body).toBe(JSON.stringify(mockBankNames));
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return 500 if an error occurs", function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockQuestionStorage.getQuestionBankNames.mockRejectedValue(new Error("Fetch error"));
                        return [4 /*yield*/, (0, questionBankHttpTriggers_js_1.getQuestionBankNamesHandler)(mockHttpRequest, mockInvocationContext)];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response.status).toBe(500);
                        (0, vitest_1.expect)(response.body).toBe(JSON.stringify("Error retrieving question bank names"));
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
