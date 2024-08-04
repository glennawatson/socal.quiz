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
var durableQuizManager_js_1 = require("../../src/handlers/durableQuizManager.js");
var interactionHelpers_js_1 = require("../../src/util/interactionHelpers.js");
var v10_1 = require("discord-api-types/v10");
(0, vitest_1.describe)("DurableQuizManager", function () {
    var durableQuizManager;
    var restMock;
    var quizStateStorageMock;
    var durableClientMock;
    (0, vitest_1.beforeEach)(function () {
        restMock = {};
        quizStateStorageMock = {
            getQuestions: vitest_1.vi.fn(),
            updateQuestion: vitest_1.vi.fn(),
            deleteQuestion: vitest_1.vi.fn(),
            deleteQuestionBank: vitest_1.vi.fn(),
            generateAndAddQuestion: vitest_1.vi.fn(),
            generateQuestion: vitest_1.vi.fn(),
        };
        durableClientMock = {
            raiseEvent: vitest_1.vi.fn(),
            startNew: vitest_1.vi.fn(),
            terminate: vitest_1.vi.fn(),
        };
        durableQuizManager = new durableQuizManager_js_1.DurableQuizManager(restMock, quizStateStorageMock, durableClientMock);
    });
    (0, vitest_1.describe)("answerInteraction", function () {
        (0, vitest_1.it)("should return an ephemeral response if instanceId is missing", function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, durableQuizManager.answerInteraction("", "", "user123", "answer123")];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response).toEqual((0, interactionHelpers_js_1.createEphemeralResponse)("No active quiz could be found"));
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should raise an event with correct data", function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, durableQuizManager.answerInteraction("guild123", "channel123", "user123", "answer123")];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(durableClientMock.raiseEvent).toHaveBeenCalledWith("guild123-channel123", "answerQuestion", { userId: "user123", selectedAnswerId: "answer123" }, {});
                        (0, vitest_1.expect)(response).toEqual({
                            type: v10_1.InteractionResponseType.DeferredChannelMessageWithSource,
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return an ephemeral response if an error occurs", function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        durableClientMock.raiseEvent = vitest_1.vi
                            .fn()
                            .mockRejectedValue(new Error("Error"));
                        return [4 /*yield*/, durableQuizManager.answerInteraction("guild123", "channel123", "user123", "answer123")];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response).toEqual((0, interactionHelpers_js_1.createEphemeralResponse)("There was a error submitting your answer."));
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, vitest_1.describe)("stopQuiz", function () {
        (0, vitest_1.it)("should return if instanceId is missing", function () { return __awaiter(void 0, void 0, void 0, function () {
            var consoleErrorSpy;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        consoleErrorSpy = vitest_1.vi.spyOn(console, "error");
                        return [4 /*yield*/, durableQuizManager.stopQuiz("", "")];
                    case 1:
                        _a.sent();
                        (0, vitest_1.expect)(consoleErrorSpy).toHaveBeenCalledWith("could not find a valid guild or channel id");
                        (0, vitest_1.expect)(durableClientMock.raiseEvent).not.toHaveBeenCalled();
                        (0, vitest_1.expect)(durableClientMock.terminate).not.toHaveBeenCalled();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should raise a cancelQuiz event", function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, durableQuizManager.stopQuiz("guild123", "channel123")];
                    case 1:
                        _a.sent();
                        (0, vitest_1.expect)(durableClientMock.raiseEvent).toHaveBeenCalledWith("guild123-channel123", "cancelQuiz", {});
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should terminate the quiz if raising event fails", function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        durableClientMock.raiseEvent = vitest_1.vi
                            .fn()
                            .mockRejectedValue(new Error("Error"));
                        return [4 /*yield*/, durableQuizManager.stopQuiz("guild123", "channel123")];
                    case 1:
                        _a.sent();
                        (0, vitest_1.expect)(durableClientMock.terminate).toHaveBeenCalledWith("guild123-channel123", "Quiz stopped");
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, vitest_1.describe)("runQuiz", function () {
        (0, vitest_1.it)("should return if instanceId is missing", function () { return __awaiter(void 0, void 0, void 0, function () {
            var consoleErrorSpy, quizState;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        consoleErrorSpy = vitest_1.vi.spyOn(console, "error");
                        quizState = {
                            questionBank: [],
                            activeUsers: new Map(),
                            correctUsersForQuestion: new Set(),
                            channelId: "",
                            currentQuestionId: null,
                            answeredUsersForQuestion: new Set(),
                            guildId: "",
                        };
                        return [4 /*yield*/, durableQuizManager.runQuiz(quizState)];
                    case 1:
                        _a.sent();
                        (0, vitest_1.expect)(consoleErrorSpy).toHaveBeenCalledWith("could not find a valid guild or channel id");
                        (0, vitest_1.expect)(durableClientMock.startNew).not.toHaveBeenCalled();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should start a new quiz instance", function () { return __awaiter(void 0, void 0, void 0, function () {
            var quizState;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        quizState = {
                            questionBank: [],
                            activeUsers: new Map(),
                            correctUsersForQuestion: new Set(),
                            channelId: "channel123",
                            currentQuestionId: null,
                            answeredUsersForQuestion: new Set(),
                            guildId: "guild123",
                        };
                        return [4 /*yield*/, durableQuizManager.runQuiz(quizState)];
                    case 1:
                        _a.sent();
                        (0, vitest_1.expect)(durableClientMock.startNew).toHaveBeenCalledWith("QuizOrchestrator", { input: quizState, instanceId: "guild123-channel123" });
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, vitest_1.describe)("nextQuizQuestion", function () {
        (0, vitest_1.it)("should return if instanceId is missing", function () { return __awaiter(void 0, void 0, void 0, function () {
            var consoleErrorSpy;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        consoleErrorSpy = vitest_1.vi.spyOn(console, "error");
                        return [4 /*yield*/, durableQuizManager.nextQuizQuestion("", "")];
                    case 1:
                        _a.sent();
                        (0, vitest_1.expect)(consoleErrorSpy).toHaveBeenCalledWith("could not find a valid guild or channel id");
                        (0, vitest_1.expect)(durableClientMock.raiseEvent).not.toHaveBeenCalled();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should raise an answerQuestion event", function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, durableQuizManager.nextQuizQuestion("guild123", "channel123")];
                    case 1:
                        _a.sent();
                        (0, vitest_1.expect)(durableClientMock.raiseEvent).toHaveBeenCalledWith("guild123-channel123", "answerQuestion", {}, {});
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
