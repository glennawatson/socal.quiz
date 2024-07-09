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
var rest_1 = require("@discordjs/rest");
var v10_1 = require("discord-api-types/v10");
var quizStateManager_js_1 = require("../../src/handlers/quizStateManager.js");
var quizImageStorage_js_1 = require("../../src/util/quizImageStorage.js");
vitest_1.vi.mock("../../src/util/quizImageStorage.js");
(0, vitest_1.describe)("Quiz Functions", function () {
    var rest;
    var imageStorage;
    var quiz;
    var question;
    var mockRestPost = vitest_1.vi.fn();
    var mockGetExplanationImagePresignedUrl = vitest_1.vi.fn();
    var mockGetQuestionImagePresignedUrl = vitest_1.vi.fn();
    (0, vitest_1.beforeEach)(function () {
        vitest_1.vi.clearAllMocks();
        mockRestPost = vitest_1.vi.fn();
        mockGetExplanationImagePresignedUrl = vitest_1.vi.fn();
        mockGetQuestionImagePresignedUrl = vitest_1.vi.fn();
        rest = new rest_1.REST();
        imageStorage = new quizImageStorage_js_1.QuizImageStorage();
        rest.post = mockRestPost;
        imageStorage.getExplanationImagePresignedUrl =
            mockGetExplanationImagePresignedUrl;
        imageStorage.getQuestionImagePresignedUrl =
            mockGetQuestionImagePresignedUrl;
        quiz = {
            answeredUsersForQuestion: new Set(),
            currentQuestionId: "",
            guildId: "123",
            questionBank: [],
            correctUsersForQuestion: new Set(["user1", "user2"]),
            channelId: "channel-id",
            activeUsers: new Map([
                ["user1", 10],
                ["user2", 8],
                ["user3", 5],
            ]),
        };
        question = {
            guildId: "guild-id",
            questionShowTimeMs: 10,
            bankName: "bankName",
            questionId: "questionId",
            question: "What is the capital of France?",
            answers: [
                { answerId: "1", answer: "Paris" },
                { answerId: "2", answer: "London" },
                { answerId: "3", answer: "Berlin" },
            ],
            correctAnswerId: "1",
            explanation: "Paris is the capital of France.",
            explanationImagePartitionKey: "explanationImage",
            imagePartitionKey: "questionImage",
        };
    });
    (0, vitest_1.it)("should return if no correct answer is found", function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // Set the correctAnswerId to an ID that doesn't exist in the question.answers array
                    question.correctAnswerId = "nonexistent-id";
                    // Mock the getExplanationImagePresignedUrl method
                    mockGetExplanationImagePresignedUrl.mockResolvedValue("https://example.com/ImageUrl");
                    // Call the sendQuestionSummary function
                    return [4 /*yield*/, (0, quizStateManager_js_1.sendQuestionSummary)(rest, imageStorage, question, quiz, 1)];
                case 1:
                    // Call the sendQuestionSummary function
                    _a.sent();
                    // Expect that rest.post was not called since there was no correct answer
                    (0, vitest_1.expect)(mockRestPost).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, vitest_1.it)("should send question summary", function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mockGetExplanationImagePresignedUrl.mockResolvedValue("https://example.com/ImageUrl");
                    return [4 /*yield*/, (0, quizStateManager_js_1.sendQuestionSummary)(rest, imageStorage, question, quiz, 1)];
                case 1:
                    _a.sent();
                    (0, vitest_1.expect)(mockRestPost).toHaveBeenCalledWith(v10_1.Routes.channelMessages("channel-id"), {
                        body: {
                            embeds: [
                                {
                                    title: "Summary for Question 1",
                                    description: "2 user(s) answered correctly!\nThe correct answer was: Paris\nExplanation: Paris is the capital of France.",
                                    image: {
                                        url: "https://example.com/ImageUrl",
                                    },
                                },
                            ],
                        },
                    });
                    return [2 /*return*/];
            }
        });
    }); });
    (0, vitest_1.it)("should post question", function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mockGetQuestionImagePresignedUrl.mockResolvedValue("https://example.com/ImageUrl");
                    return [4 /*yield*/, (0, quizStateManager_js_1.postQuestion)(rest, imageStorage, "channel-id", "interaction-id", question)];
                case 1:
                    _a.sent();
                    (0, vitest_1.expect)(mockRestPost).toHaveBeenCalledWith(v10_1.Routes.channelMessages("channel-id"), {
                        body: {
                            embeds: [
                                {
                                    title: "Quiz Question",
                                    description: "**Question**: What is the capital of France?\nA: Paris\nB: London\nC: Berlin",
                                    footer: {
                                        text: "Select the correct answer by clicking the buttons below.",
                                    },
                                    image: {
                                        url: "https://example.com/ImageUrl",
                                    },
                                },
                            ],
                            components: [
                                {
                                    type: 1,
                                    components: [
                                        {
                                            type: 2,
                                            style: 1,
                                            custom_id: "answer_interaction-id_1",
                                            label: "A",
                                        },
                                        {
                                            type: 2,
                                            style: 1,
                                            custom_id: "answer_interaction-id_2",
                                            label: "B",
                                        },
                                        {
                                            type: 2,
                                            style: 1,
                                            custom_id: "answer_interaction-id_3",
                                            label: "C",
                                        },
                                    ],
                                },
                            ],
                        },
                    });
                    return [2 /*return*/];
            }
        });
    }); });
    (0, vitest_1.it)("should show scores", function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, quizStateManager_js_1.showScores)(rest, quiz)];
                case 1:
                    _a.sent();
                    (0, vitest_1.expect)(mockRestPost).toHaveBeenCalledWith(v10_1.Routes.channelMessages("channel-id"), {
                        body: {
                            embeds: [
                                {
                                    title: "Quiz Scores",
                                    description: "<@user1>: 10 points\n<@user2>: 8 points\n<@user3>: 5 points\n",
                                },
                            ],
                        },
                    });
                    return [2 /*return*/];
            }
        });
    }); });
    (0, vitest_1.it)("should handle no scores", function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    quiz.activeUsers.clear();
                    return [4 /*yield*/, (0, quizStateManager_js_1.showScores)(rest, quiz)];
                case 1:
                    _a.sent();
                    (0, vitest_1.expect)(mockRestPost).toHaveBeenCalledWith(v10_1.Routes.channelMessages("channel-id"), {
                        body: {
                            embeds: [
                                {
                                    title: "Quiz Scores",
                                    description: "No scores available.",
                                },
                            ],
                        },
                    });
                    return [2 /*return*/];
            }
        });
    }); });
    (0, vitest_1.it)("should log and return if quiz is invalid", function () { return __awaiter(void 0, void 0, void 0, function () {
        var consoleLogSpy;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    consoleLogSpy = vitest_1.vi.spyOn(console, "log").mockImplementation(function () { });
                    return [4 /*yield*/, (0, quizStateManager_js_1.showScores)(rest, null)];
                case 1:
                    _a.sent();
                    (0, vitest_1.expect)(consoleLogSpy).toHaveBeenCalledWith("invalid quiz");
                    (0, vitest_1.expect)(mockRestPost).not.toHaveBeenCalled();
                    consoleLogSpy.mockRestore();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, vitest_1.it)("should log and return if channelId is invalid", function () { return __awaiter(void 0, void 0, void 0, function () {
        var consoleLogSpy;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    consoleLogSpy = vitest_1.vi.spyOn(console, "log").mockImplementation(function () { });
                    quiz.channelId = "";
                    return [4 /*yield*/, (0, quizStateManager_js_1.showScores)(rest, quiz)];
                case 1:
                    _a.sent();
                    (0, vitest_1.expect)(consoleLogSpy).toHaveBeenCalledWith("no valid channel defined for the quiz to send scores to");
                    (0, vitest_1.expect)(mockRestPost).not.toHaveBeenCalled();
                    consoleLogSpy.mockRestore();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, vitest_1.it)("should handle question summary without explanation", function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    question.explanation = "";
                    return [4 /*yield*/, (0, quizStateManager_js_1.sendQuestionSummary)(rest, imageStorage, question, quiz, 1)];
                case 1:
                    _a.sent();
                    (0, vitest_1.expect)(mockRestPost).toHaveBeenCalledWith(v10_1.Routes.channelMessages("channel-id"), {
                        body: {
                            embeds: [
                                {
                                    title: "Summary for Question 1",
                                    description: "2 user(s) answered correctly!\nThe correct answer was: Paris",
                                },
                            ],
                        },
                    });
                    return [2 /*return*/];
            }
        });
    }); });
});
