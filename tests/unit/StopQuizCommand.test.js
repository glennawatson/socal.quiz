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
var stopQuizCommand_js_1 = require("../../src/handlers/actions/stopQuizCommand.js");
var v10_1 = require("discord-api-types/v10");
var interactionHelpers_js_1 = require("../../src/util/interactionHelpers.js");
var quizManagerFactoryManager_js_1 = require("../../src/handlers/quizManagerFactoryManager.js");
var mockQuizManager_js_1 = require("./mocks/mockQuizManager.js");
(0, vitest_1.describe)("StopQuizCommand", function () {
    var stopQuizCommand;
    var quizFactoryManager;
    var quizManager;
    (0, vitest_1.beforeEach)(function () {
        vitest_1.vi.clearAllMocks();
        quizManager = new mockQuizManager_js_1.MockQuizManager();
        quizFactoryManager = new quizManagerFactoryManager_js_1.QuizManagerFactoryManager(function () { return quizManager; });
        stopQuizCommand = new stopQuizCommand_js_1.StopQuizCommand(quizFactoryManager);
    });
    (0, vitest_1.describe)("data", function () {
        (0, vitest_1.it)("should return the correct command data", function () {
            var commandData = stopQuizCommand.data();
            (0, vitest_1.expect)(commandData.name).toBe("stop_quiz");
        });
    });
    (0, vitest_1.describe)("execute", function () {
        (0, vitest_1.it)("should stop the quiz and return a confirmation message", function () { return __awaiter(void 0, void 0, void 0, function () {
            var quizManagerMock, interaction, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        quizManagerMock = {
                            stopQuiz: vitest_1.vi.fn(),
                        };
                        quizFactoryManager.getQuizManager = vitest_1.vi
                            .fn()
                            .mockResolvedValue(quizManagerMock);
                        interaction = {
                            guild_id: "guild-id",
                            channel_id: "channel-id",
                            channel: { id: "channel-id", type: v10_1.ChannelType.GuildVoice },
                            id: "next_question",
                            application_id: "",
                            type: v10_1.InteractionType.ApplicationCommand,
                            token: "",
                            version: 1,
                            app_permissions: "",
                            locale: "en-US",
                            entitlements: [],
                            authorizing_integration_owners: {},
                            data: { id: "data", type: v10_1.ApplicationCommandType.ChatInput, name: "" },
                        };
                        return [4 /*yield*/, stopQuizCommand.execute(interaction)];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(quizManagerMock.stopQuiz).toHaveBeenCalledWith("guild-id", "channel-id");
                        (0, vitest_1.expect)(response).toEqual((0, interactionHelpers_js_1.createEphemeralResponse)("Stopped quiz"));
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return an error if the guild id is missing", function () { return __awaiter(void 0, void 0, void 0, function () {
            var interaction, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        interaction = {
                            guild_id: null,
                        };
                        return [4 /*yield*/, stopQuizCommand.execute(interaction)];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response).toEqual((0, interactionHelpers_js_1.generateOptionMissingErrorResponse)("guild id"));
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return a generic error response if an exception occurs", function () { return __awaiter(void 0, void 0, void 0, function () {
            var interaction, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        quizFactoryManager.getQuizManager = vitest_1.vi
                            .fn()
                            .mockRejectedValue(new Error("Some error"));
                        interaction = {
                            guild_id: "guild-id",
                            channel_id: "channel-id",
                            channel: { id: "channel-id", type: v10_1.ChannelType.GuildVoice },
                            id: "next_question",
                            application_id: "",
                            type: v10_1.InteractionType.ApplicationCommand,
                            token: "",
                            version: 1,
                            app_permissions: "",
                            locale: "en-US",
                            entitlements: [],
                            authorizing_integration_owners: {},
                            data: { id: "data", type: v10_1.ApplicationCommandType.ChatInput, name: "" },
                        };
                        return [4 /*yield*/, stopQuizCommand.execute(interaction)];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response).toEqual((0, interactionHelpers_js_1.generateErrorResponse)(new Error("Some error")));
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
