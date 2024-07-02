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
var v10_1 = require("discord-api-types/v10");
var deleteQuestionBankCommand_js_1 = require("../../src/handlers/actions/deleteQuestionBankCommand.js");
var interactionHelpers_js_1 = require("../../src/util/interactionHelpers.js");
(0, vitest_1.describe)("DeleteQuestionBankCommand", function () {
    var questionStorageMock;
    var deleteQuestionBankCommand;
    (0, vitest_1.beforeEach)(function () {
        questionStorageMock = {
            deleteQuestionBank: vitest_1.vi.fn(),
        };
        deleteQuestionBankCommand = new deleteQuestionBankCommand_js_1.DeleteQuestionBankCommand(questionStorageMock);
    });
    (0, vitest_1.describe)("data", function () {
        (0, vitest_1.it)("should return the correct command data", function () {
            var commandData = deleteQuestionBankCommand.data();
            (0, vitest_1.expect)(commandData.name).toBe("delete_question_bank");
        });
    });
    (0, vitest_1.describe)("execute", function () {
        (0, vitest_1.it)("should delete a question bank and return a confirmation message", function () { return __awaiter(void 0, void 0, void 0, function () {
            var interaction, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        interaction = generateBankOptions("123", "sampleBank");
                        return [4 /*yield*/, deleteQuestionBankCommand.execute(interaction)];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response).toEqual((0, interactionHelpers_js_1.createEphemeralResponse)("Deleted question bank: sampleBank"));
                        (0, vitest_1.expect)(questionStorageMock.deleteQuestionBank).toHaveBeenCalledWith("guild-id", "sampleBank");
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return an error if the question bank name is missing", function () { return __awaiter(void 0, void 0, void 0, function () {
            var interaction, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        interaction = generateBankOptions("123", "");
                        return [4 /*yield*/, deleteQuestionBankCommand.execute(interaction)];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response).toEqual((0, interactionHelpers_js_1.generateOptionMissingErrorResponse)("bankname"));
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return a generic error response if an exception occurs", function () { return __awaiter(void 0, void 0, void 0, function () {
            var interaction, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        interaction = generateBankOptions("123", "sampleBank");
                        // Simulate an error during the deleteQuestionBank method call
                        questionStorageMock.deleteQuestionBank = vitest_1.vi
                            .fn()
                            .mockRejectedValue(new Error("Some error"));
                        return [4 /*yield*/, deleteQuestionBankCommand.execute(interaction)];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response).toEqual((0, interactionHelpers_js_1.generateErrorResponse)(new Error("Some error")));
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
// Helper function to generate interaction options
function generateBankOptions(userId, bankName) {
    return {
        app_permissions: "",
        authorizing_integration_owners: {},
        channel: { id: "channel-id", type: v10_1.ChannelType.GuildVoice },
        entitlements: [],
        locale: "en-US",
        version: 1,
        type: 2,
        data: {
            id: "command-id",
            name: "delete_question_bank",
            options: [
                {
                    name: "bankname",
                    type: v10_1.ApplicationCommandOptionType.String,
                    value: bankName,
                },
            ],
            resolved: {},
            type: v10_1.ApplicationCommandType.ChatInput,
        },
        guild_id: "guild-id",
        channel_id: "channel-id",
        member: {
            user: {
                id: userId,
                username: "username",
                discriminator: "0001",
                avatar: "avatar-hash",
                global_name: userId,
            },
            roles: [],
            premium_since: null,
            permissions: "0",
            pending: false,
            mute: false,
            deaf: false,
            joined_at: "",
            flags: v10_1.GuildMemberFlags.CompletedOnboarding,
        },
        token: "interaction-token",
        id: "interaction-id",
        application_id: "application-id",
    };
}
