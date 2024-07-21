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
var commandManager_js_1 = require("../../src/handlers/actions/commandManager.js");
var interactionHelpers_js_1 = require("../../src/util/interactionHelpers.js");
var builders_1 = require("@discordjs/builders");
(0, vitest_1.describe)("CommandManager", function () {
    var commandManager;
    var clientId = "testClientId";
    var guildId = "testGuildId";
    var postSpy;
    ////let putSpy: any;
    (0, vitest_1.beforeEach)(function () {
        var botServiceMock = {
        // Mock any methods or properties used from DiscordBotService
        };
        var questionStorageMock = {
        // Mock any methods or properties used from QuestionStorage
        };
        var restMock = {
            put: vitest_1.vi.fn().mockResolvedValue({}),
            post: vitest_1.vi.fn().mockResolvedValue({}),
        };
        postSpy = restMock.post;
        ////putSpy = restMock.put;
        commandManager = new commandManager_js_1.CommandManager(botServiceMock, questionStorageMock, clientId, restMock);
    });
    (0, vitest_1.describe)("handleInteraction", function () {
        (0, vitest_1.it)("should handle unknown interaction type", function () { return __awaiter(void 0, void 0, void 0, function () {
            var interaction, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        interaction = {
                            type: v10_1.InteractionType.Ping,
                        };
                        return [4 /*yield*/, commandManager.handleInteraction(interaction)];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response).toEqual({
                            type: v10_1.InteractionResponseType.ChannelMessageWithSource,
                            data: {
                                content: "Unknown command!",
                                flags: v10_1.MessageFlags.Ephemeral,
                            },
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should handle unknown command for ApplicationCommand", function () { return __awaiter(void 0, void 0, void 0, function () {
            var interaction, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        interaction = {
                            app_permissions: "",
                            application_id: "",
                            authorizing_integration_owners: {},
                            channel: { id: "123", type: v10_1.ChannelType.GuildVoice },
                            channel_id: "123",
                            entitlements: [],
                            id: "",
                            locale: "en-US",
                            token: "",
                            version: 1,
                            type: v10_1.InteractionType.ApplicationCommand,
                            data: {
                                name: "unknownCommand",
                                id: "",
                                type: v10_1.ApplicationCommandType.ChatInput,
                            },
                        };
                        return [4 /*yield*/, commandManager.handleInteraction(interaction)];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response).toEqual((0, interactionHelpers_js_1.createEphemeralResponse)("could not find command: unknownCommand"));
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should handle unknown command for ModalSubmit", function () { return __awaiter(void 0, void 0, void 0, function () {
            var interaction, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        interaction = {
                            type: v10_1.InteractionType.ModalSubmit,
                            data: {
                                custom_id: "unknownModal",
                            },
                        };
                        return [4 /*yield*/, commandManager.handleInteraction(interaction)];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response).toEqual((0, interactionHelpers_js_1.createEphemeralResponse)("could not find modal: unknownModal"));
                        return [2 /*return*/];
                }
            });
        }); });
        // Additional test cases to cover uncovered lines
        (0, vitest_1.it)("should execute the command for ApplicationCommand interaction", function () { return __awaiter(void 0, void 0, void 0, function () {
            var mockCommand, interaction, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockCommand = {
                            data: function () {
                                return new builders_1.SlashCommandBuilder()
                                    .setName("test")
                                    .setDescription("A test command");
                            },
                            execute: vitest_1.vi.fn().mockResolvedValue({
                                type: v10_1.InteractionResponseType.ChannelMessageWithSource,
                                data: {
                                    content: "Command executed!",
                                },
                            }),
                            name: "test",
                        };
                        commandManager.registerCommand(mockCommand);
                        interaction = {
                            app_permissions: "",
                            application_id: "",
                            authorizing_integration_owners: {},
                            channel: { id: "123", type: v10_1.ChannelType.GuildVoice },
                            channel_id: "123",
                            entitlements: [],
                            id: "",
                            locale: "en-US",
                            token: "",
                            version: 1,
                            type: v10_1.InteractionType.ApplicationCommand,
                            data: {
                                name: "test",
                                id: "",
                                type: v10_1.ApplicationCommandType.ChatInput,
                            },
                        };
                        return [4 /*yield*/, commandManager.handleInteraction(interaction)];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response).toEqual({
                            type: v10_1.InteractionResponseType.ChannelMessageWithSource,
                            data: {
                                content: "Command executed!",
                            },
                        });
                        (0, vitest_1.expect)(mockCommand.execute).toHaveBeenCalledWith(interaction);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should handle modal submit interaction", function () { return __awaiter(void 0, void 0, void 0, function () {
            var mockModalCommand, interaction, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockModalCommand = {
                            execute: function (_) {
                                return Promise.resolve({});
                            },
                            data: function () {
                                return new builders_1.SlashCommandBuilder()
                                    .setName("testModal")
                                    .setDescription("A test modal command");
                            },
                            handleModalSubmit: vitest_1.vi.fn().mockResolvedValue({
                                type: v10_1.InteractionResponseType.ChannelMessageWithSource,
                                data: {
                                    content: "Modal handled!",
                                },
                            }),
                            name: "testModal",
                        };
                        commandManager.registerCommand(mockModalCommand);
                        interaction = {
                            app_permissions: "",
                            application_id: "",
                            authorizing_integration_owners: {},
                            channel: { id: "123", type: v10_1.ChannelType.GuildVoice },
                            channel_id: "123",
                            entitlements: [],
                            id: "",
                            locale: "en-US",
                            token: "",
                            version: 1,
                            type: v10_1.InteractionType.ModalSubmit,
                            data: {
                                custom_id: "testModal",
                                components: [],
                            },
                        };
                        return [4 /*yield*/, commandManager.handleInteraction(interaction)];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response).toEqual({
                            type: v10_1.InteractionResponseType.ChannelMessageWithSource,
                            data: {
                                content: "Modal handled!",
                            },
                        });
                        (0, vitest_1.expect)(mockModalCommand.handleModalSubmit).toHaveBeenCalledWith(interaction);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, vitest_1.describe)("registerCommands", function () {
        (0, vitest_1.it)("should register all commands", function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, commandManager.registerDefaultCommands(guildId)];
                    case 1:
                        _a.sent();
                        (0, vitest_1.expect)(postSpy).toHaveBeenCalledWith("/applications/".concat(clientId, "/guilds/").concat(guildId, "/commands"), { body: vitest_1.expect.any(Array) });
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should register commands with correct structure", function () { return __awaiter(void 0, void 0, void 0, function () {
            var mockCommand, mockCommands;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockCommand = {
                            data: function () {
                                return new builders_1.SlashCommandBuilder()
                                    .setName("test")
                                    .setDescription("A test command");
                            },
                            execute: vitest_1.vi.fn(),
                            name: "dodgy",
                        };
                        mockCommands = [mockCommand];
                        commandManager.registerCommand(mockCommand);
                        return [4 /*yield*/, commandManager.registerCommandsForGuild(guildId)];
                    case 1:
                        _a.sent();
                        (0, vitest_1.expect)(postSpy).toHaveBeenCalledWith("/applications/".concat(clientId, "/guilds/").concat(guildId, "/commands"), {
                            body: mockCommands.map(function (cmd) { return cmd.data().toJSON(); }),
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should handle invalid command during registration", function () { return __awaiter(void 0, void 0, void 0, function () {
            var consoleErrorSpy, invalidCommand;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        consoleErrorSpy = vitest_1.vi.spyOn(console, "error");
                        invalidCommand = {
                            name: "invalid",
                        };
                        commandManager.registerCommand(invalidCommand);
                        return [4 /*yield*/, commandManager.registerCommandsForGuild(guildId)];
                    case 1:
                        _a.sent();
                        (0, vitest_1.expect)(consoleErrorSpy).toHaveBeenCalledWith("Invalid command:", invalidCommand);
                        consoleErrorSpy.mockRestore();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should handle API errors during command registration", function () { return __awaiter(void 0, void 0, void 0, function () {
            var consoleErrorSpy;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        consoleErrorSpy = vitest_1.vi.spyOn(console, "error");
                        postSpy.mockRejectedValueOnce(new Error("API error"));
                        return [4 /*yield*/, commandManager.registerDefaultCommands(guildId)];
                    case 1:
                        _a.sent();
                        (0, vitest_1.expect)(consoleErrorSpy).toHaveBeenCalledWith(vitest_1.expect.any(Error));
                        consoleErrorSpy.mockRestore();
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
