"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
var quizManagerBase_js_1 = require("../../src/handlers/quizManagerBase.js");
var v10_1 = require("discord-api-types/v10");
var interactionHelpers_js_1 = require("../../src/util/interactionHelpers.js");
var QuizManagerBaseImpl = /** @class */ (function (_super) {
    __extends(QuizManagerBaseImpl, _super);
    function QuizManagerBaseImpl(rest, quizStorage) {
        return _super.call(this, rest, quizStorage) || this;
    }
    QuizManagerBaseImpl.prototype.runQuiz = function (_quiz) {
        return __awaiter(this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/];
        }); });
    };
    QuizManagerBaseImpl.prototype.stopQuiz = function (_guildId, _channelId) {
        return __awaiter(this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/];
        }); });
    };
    QuizManagerBaseImpl.prototype.nextQuizQuestion = function (_guildId, _channelId) {
        return __awaiter(this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/];
        }); });
    };
    QuizManagerBaseImpl.prototype.answerInteraction = function (_guildId, _channelId, _userId, _selectedAnswerId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, (0, interactionHelpers_js_1.createEphemeralResponse)("answerInteraction called")];
            });
        });
    };
    return QuizManagerBaseImpl;
}(quizManagerBase_js_1.QuizManagerBase));
(0, vitest_1.describe)("QuizManagerBase", function () {
    var quizManagerBase;
    var restMock;
    var quizStateStorageMock;
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
        quizManagerBase = new QuizManagerBaseImpl(restMock, quizStateStorageMock);
    });
    (0, vitest_1.describe)("startQuiz", function () {
        (0, vitest_1.it)("should return an error if question bank name is null", function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, quizManagerBase.startQuiz("guild123", "channel123", null)];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response).toEqual((0, interactionHelpers_js_1.createEphemeralResponse)("There is no valid question bank name"));
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return an error if question bank name is empty", function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, quizManagerBase.startQuiz("guild123", "channel123", "")];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response).toEqual((0, interactionHelpers_js_1.createEphemeralResponse)("There is no valid question bank name"));
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return an error if no questions are found", function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        quizStateStorageMock.getQuestions = vitest_1.vi.fn().mockResolvedValue([]);
                        return [4 /*yield*/, quizManagerBase.startQuiz("guild123", "channel123", "bank123")];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response).toEqual((0, interactionHelpers_js_1.createEphemeralResponse)("There are no valid questions in the question bank bank123"));
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should call startQuizInternal with valid questions", function () { return __awaiter(void 0, void 0, void 0, function () {
            var questions, startQuizInternalSpy;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        questions = [
                            {
                                guildId: "guild-id",
                                bankName: "bank1",
                                questionId: "q1",
                                question: "What is 2 + 2?",
                                answers: [
                                    { answerId: "a1", answer: "3" },
                                    { answerId: "a2", answer: "4" },
                                    { answerId: "a3", answer: "5" },
                                    { answerId: "a4", answer: "6" },
                                ],
                                correctAnswerId: "a1",
                                questionShowTimeMs: 50,
                            },
                        ];
                        quizStateStorageMock.getQuestions = vitest_1.vi.fn().mockResolvedValue(questions);
                        startQuizInternalSpy = vitest_1.vi.spyOn(quizManagerBase, "startQuizInternal");
                        return [4 /*yield*/, quizManagerBase.startQuiz("guild123", "channel123", "bank1")];
                    case 1:
                        _a.sent();
                        (0, vitest_1.expect)(startQuizInternalSpy).toHaveBeenCalledWith(questions, "guild123", "channel123");
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, vitest_1.describe)("startQuizInternal", function () {
        (0, vitest_1.it)("should return an error if there are no valid questions", function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, quizManagerBase.startQuizInternal([], "guild123", "channel123")];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response).toEqual((0, interactionHelpers_js_1.createEphemeralResponse)("There are no valid questions"));
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return an error if there are invalid questions", function () { return __awaiter(void 0, void 0, void 0, function () {
            var questions, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        questions = [
                            {
                                guildId: "guild-id",
                                bankName: "bank1",
                                questionId: "q1",
                                question: "",
                                answers: [
                                    { answerId: "a1", answer: "3" },
                                    { answerId: "a2", answer: "4" },
                                    { answerId: "a3", answer: "5" },
                                    { answerId: "a4", answer: "6" },
                                ],
                                correctAnswerId: "a1",
                                questionShowTimeMs: 50,
                            },
                        ];
                        return [4 /*yield*/, quizManagerBase.startQuizInternal(questions, "guild123", "channel123")];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response).toEqual((0, interactionHelpers_js_1.createEphemeralResponse)("There are invalid questions with IDs: q1"));
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should call stopQuiz and runQuiz with valid questions", function () { return __awaiter(void 0, void 0, void 0, function () {
            var questions, stopQuizSpy, runQuizSpy;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        questions = [
                            {
                                guildId: "guild-id",
                                bankName: "bank1",
                                questionId: "q1",
                                question: "What is 2 + 2?",
                                answers: [
                                    { answerId: "a1", answer: "3" },
                                    { answerId: "a2", answer: "4" },
                                    { answerId: "a3", answer: "5" },
                                    { answerId: "a4", answer: "6" },
                                ],
                                correctAnswerId: "a1",
                                questionShowTimeMs: 50,
                            },
                        ];
                        stopQuizSpy = vitest_1.vi.spyOn(quizManagerBase, "stopQuiz");
                        runQuizSpy = vitest_1.vi.spyOn(quizManagerBase, "runQuiz");
                        return [4 /*yield*/, quizManagerBase.startQuizInternal(questions, "guild123", "channel123")];
                    case 1:
                        _a.sent();
                        (0, vitest_1.expect)(stopQuizSpy).toHaveBeenCalledWith("guild123", "channel123");
                        (0, vitest_1.expect)(runQuizSpy).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                            questionBank: questions,
                            guildId: "guild123",
                            channelId: "channel123",
                        }));
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, vitest_1.describe)("handleAnswerInteraction", function () {
        (0, vitest_1.it)("should return an error if interaction ID is missing", function () { return __awaiter(void 0, void 0, void 0, function () {
            var interaction, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        interaction = {
                            type: v10_1.InteractionType.MessageComponent,
                            guild_id: "guild123",
                            channel: { id: "channel123", type: 0 },
                            channel_id: "channel123",
                            id: "interaction1",
                            application_id: "app123",
                            token: "token123",
                            version: 1,
                            data: {
                                id: "data1",
                                type: 1,
                                name: "name1",
                                custom_id: "quiz__answer123",
                            },
                            user: { id: "user123", username: "user", discriminator: "0001" },
                        };
                        return [4 /*yield*/, quizManagerBase.handleAnswerInteraction(interaction)];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response).toEqual((0, interactionHelpers_js_1.createEphemeralResponse)("Could not find a valid interaction id"));
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return an error if interaction type is invalid", function () { return __awaiter(void 0, void 0, void 0, function () {
            var interaction, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        interaction = {
                            type: v10_1.InteractionType.ApplicationCommand,
                            guild_id: "guild123",
                            channel: { id: "channel123", type: 0 },
                            channel_id: "channel123",
                            id: "interaction1",
                            application_id: "app123",
                            token: "token123",
                            version: 1,
                            data: { id: "data1", type: 1, name: "name1" },
                        };
                        return [4 /*yield*/, quizManagerBase.handleAnswerInteraction(interaction)];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response).toEqual((0, interactionHelpers_js_1.createEphemeralResponse)("Invalid interaction type."));
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return an error if guild_id is missing", function () { return __awaiter(void 0, void 0, void 0, function () {
            var interaction, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        interaction = {
                            type: v10_1.InteractionType.MessageComponent,
                            guild_id: undefined,
                            channel: { id: "channel123", type: 0 },
                            channel_id: "channel123",
                            id: "interaction1",
                            application_id: "app123",
                            token: "token123",
                            version: 1,
                            data: { id: "data1", type: 1, name: "name1" },
                        };
                        return [4 /*yield*/, quizManagerBase.handleAnswerInteraction(interaction)];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response).toEqual((0, interactionHelpers_js_1.createEphemeralResponse)("Must have a valid guild id."));
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return an error if channel id is missing", function () { return __awaiter(void 0, void 0, void 0, function () {
            var interaction, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        interaction = {
                            type: v10_1.InteractionType.MessageComponent,
                            guild_id: "guild123",
                            channel: { id: undefined, type: 0 },
                            channel_id: undefined,
                            id: "interaction1",
                            application_id: "app123",
                            token: "token123",
                            version: 1,
                            data: { id: "data1", type: 1, name: "name1" },
                        };
                        return [4 /*yield*/, quizManagerBase.handleAnswerInteraction(interaction)];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response).toEqual((0, interactionHelpers_js_1.createEphemeralResponse)("Must have a valid channel"));
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return an error if interaction ID is missing", function () { return __awaiter(void 0, void 0, void 0, function () {
            var interaction, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        interaction = {
                            app_permissions: "",
                            authorizing_integration_owners: {},
                            entitlements: [],
                            locale: "en-US",
                            type: v10_1.InteractionType.MessageComponent,
                            guild_id: "guild123",
                            channel: { id: "channel123", type: v10_1.ChannelType.GuildVoice },
                            channel_id: "channel123",
                            id: "interaction1",
                            application_id: "app123",
                            token: "token123",
                            version: 1,
                            data: { component_type: v10_1.ComponentType.Button, custom_id: "_" },
                        };
                        return [4 /*yield*/, quizManagerBase.handleAnswerInteraction(interaction)];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response).toEqual((0, interactionHelpers_js_1.createEphemeralResponse)("Could not find a valid answer response"));
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return an error if selected answer ID is missing", function () { return __awaiter(void 0, void 0, void 0, function () {
            var interaction, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        interaction = {
                            type: v10_1.InteractionType.MessageComponent,
                            guild_id: "guild123",
                            channel: { id: "channel123", type: 0 },
                            channel_id: "channel123",
                            id: "interaction1",
                            application_id: "app123",
                            token: "token123",
                            version: 1,
                            data: {
                                id: "data1",
                                type: 1,
                                name: "name1",
                                component_type: v10_1.ComponentType.Button,
                                custom_id: "quiz_",
                            },
                        };
                        return [4 /*yield*/, quizManagerBase.handleAnswerInteraction(interaction)];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response).toEqual((0, interactionHelpers_js_1.createEphemeralResponse)("Could not find a valid answer response"));
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return an error if user ID is missing", function () { return __awaiter(void 0, void 0, void 0, function () {
            var interaction, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        interaction = {
                            type: v10_1.InteractionType.MessageComponent,
                            guild_id: "guild123",
                            channel: { id: "channel123", type: 0 },
                            channel_id: "channel123",
                            id: "interaction1",
                            application_id: "app123",
                            token: "token123",
                            version: 1,
                            data: {
                                id: "data1",
                                type: 1,
                                name: "name1",
                                component_type: v10_1.ComponentType.Button,
                                custom_id: "quiz_123_answer123",
                            },
                            user: undefined,
                        };
                        return [4 /*yield*/, quizManagerBase.handleAnswerInteraction(interaction)];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response).toEqual((0, interactionHelpers_js_1.createEphemeralResponse)("Could not find a valid user id"));
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should call answerInteraction with correct parameters", function () { return __awaiter(void 0, void 0, void 0, function () {
            var interaction, answerInteractionSpy;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        interaction = {
                            type: v10_1.InteractionType.MessageComponent,
                            guild_id: "guild123",
                            channel: { id: "channel123", type: 0 },
                            channel_id: "channel123",
                            id: "interaction1",
                            application_id: "app123",
                            token: "token123",
                            version: 1,
                            data: {
                                id: "data1",
                                type: 1,
                                name: "name1",
                                custom_id: "quiz_123_answer123",
                            },
                            user: { id: "user123", username: "user", discriminator: "0001" },
                        };
                        answerInteractionSpy = vitest_1.vi.spyOn(quizManagerBase, "answerInteraction");
                        return [4 /*yield*/, quizManagerBase.handleAnswerInteraction(interaction)];
                    case 1:
                        _a.sent();
                        (0, vitest_1.expect)(answerInteractionSpy).toHaveBeenCalledWith("guild123", "channel123", "user123", "answer123");
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
