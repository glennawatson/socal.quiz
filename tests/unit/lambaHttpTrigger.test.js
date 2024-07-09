"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var lambdaHttpTrigger_js_1 = require("../../src/functions/lambdaHttpTrigger.js");
var config_js_1 = require("../../src/util/config.js");
var questionStorage_js_1 = require("../../src/util/questionStorage.js");
var guildStorage_js_1 = require("../../src/util/guildStorage.js");
var discord_verify_1 = require("discord-verify");
var stateManager_js_1 = require("../../src/handlers/stateManager.js");
var quizManagerFactoryManager_js_1 = require("../../src/handlers/quizManagerFactoryManager.js");
var mockQuizManager_js_1 = require("./mocks/mockQuizManager.js");
// Mock implementations
// Mocking durable-functions
vitest_1.vi.mock("durable-functions", function () { return __awaiter(void 0, void 0, void 0, function () {
    var originalModule;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, vitest_1.vi.importActual("durable-functions")];
            case 1:
                originalModule = _a.sent();
                return [2 /*return*/, __assign(__assign({}, originalModule), { getClient: vitest_1.vi.fn().mockReturnValue({
                            extraInputs: vitest_1.vi.fn(),
                            startNew: vitest_1.vi.fn(),
                            getStatus: vitest_1.vi.fn(),
                            terminate: vitest_1.vi.fn(),
                            purge: vitest_1.vi.fn(),
                        }) })];
        }
    });
}); });
vitest_1.vi.mock("@azure/data-tables", function () {
    var _a;
    var tableClientMock = {
        getEntity: vitest_1.vi.fn(),
        createEntity: vitest_1.vi.fn(),
        listEntities: vitest_1.vi.fn().mockReturnValue((_a = {
                next: vitest_1.vi.fn().mockResolvedValue({ done: true, value: undefined })
            },
            _a[Symbol.asyncIterator] = function () {
                return this;
            },
            _a)),
        deleteEntity: vitest_1.vi.fn(),
        upsertEntity: vitest_1.vi.fn(),
    };
    return {
        TableClient: {
            fromConnectionString: vitest_1.vi.fn().mockReturnValue(tableClientMock),
        },
    };
});
vitest_1.vi.mock("@azure/storage-blob", function () {
    var blobServiceClientMock = {
        getContainerClient: vitest_1.vi.fn().mockReturnValue({
            getBlockBlobClient: vitest_1.vi.fn().mockReturnValue({
                uploadData: vitest_1.vi.fn(),
            }),
        }),
    };
    return {
        BlobServiceClient: {
            fromConnectionString: vitest_1.vi.fn().mockReturnValue(blobServiceClientMock),
        },
        BlobSASPermissions: {
            parse: vitest_1.vi.fn(),
        },
        generateBlobSASQueryParameters: vitest_1.vi.fn().mockReturnValue({
            toString: vitest_1.vi.fn().mockReturnValue("sas-token"),
        }),
        StorageSharedKeyCredential: vitest_1.vi.fn(),
    };
});
// Mock the verifyKey function directly
vitest_1.vi.mock("discord-verify", function () { return ({
    verify: vitest_1.vi.fn(),
}); });
// Store the mocked verifyKey in a variable
var verifyMock = vitest_1.vi.mocked(discord_verify_1.verify);
var handleInteractionMock = vitest_1.vi.fn();
var mockDiscordBotService = {
    handleInteraction: handleInteractionMock,
};
var createMockHttpRequest = function (body, headers) {
    if (headers === void 0) { headers = {}; }
    return ({
        method: "POST",
        url: "http://localhost:7071/api/interactions",
        headers: new Map(Object.entries(headers)),
        text: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, JSON.stringify(body)];
        }); }); },
    });
};
var createMockInvocationContext = function () {
    return ({
        log: vitest_1.vi.fn(),
    });
};
(0, vitest_1.describe)("interactions function", function () {
    var tableClientMock;
    (0, vitest_1.beforeEach)(function () { return __awaiter(void 0, void 0, void 0, function () {
        var imageClient;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    // Reset mocks and stubs
                    vitest_1.vi.clearAllMocks();
                    // Re-initialize mocks
                    tableClientMock = {
                        getEntity: vitest_1.vi.fn(),
                        createEntity: vitest_1.vi.fn(),
                        listEntities: vitest_1.vi.fn().mockReturnValue((_a = {
                                next: vitest_1.vi.fn().mockResolvedValue({ done: true, value: undefined })
                            },
                            _a[Symbol.asyncIterator] = function () {
                                return this;
                            },
                            _a)),
                        deleteEntity: vitest_1.vi.fn(),
                        upsertEntity: vitest_1.vi.fn(),
                    };
                    imageClient = {
                        getQuestionImagePresignedUrl: vitest_1.vi.fn(),
                        getExplanationImagePresignedUrl: vitest_1.vi.fn(),
                        getPresignedUrl: vitest_1.vi.fn(),
                        downloadAndValidateImageForDiscord: vitest_1.vi.fn(),
                    };
                    return [4 /*yield*/, config_js_1.Config.initialize(undefined, "test-token", "test-client-id", "test-public-key", new questionStorage_js_1.QuestionStorage(imageClient, "test1", tableClientMock), new guildStorage_js_1.GuildStorage(undefined, tableClientMock), imageClient, new stateManager_js_1.StateManager(undefined, tableClientMock), new quizManagerFactoryManager_js_1.QuizManagerFactoryManager(function () { return new mockQuizManager_js_1.MockQuizManager(); }), mockDiscordBotService)];
                case 1:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, vitest_1.it)("should return 401 for invalid request signature", function () { return __awaiter(void 0, void 0, void 0, function () {
        var request, context, response;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    verifyMock.mockReturnValue(Promise.resolve(false));
                    request = createMockHttpRequest({}, {
                        "x-signature-ed25519": "invalid-signature",
                        "x-signature-timestamp": "timestamp",
                    });
                    context = createMockInvocationContext();
                    return [4 /*yield*/, (0, lambdaHttpTrigger_js_1.interactions)(request, context)];
                case 1:
                    response = _a.sent();
                    (0, vitest_1.expect)(response.status).toBe(401);
                    (0, vitest_1.expect)(response.body).toBe("Invalid request signature");
                    return [2 /*return*/];
            }
        });
    }); });
    (0, vitest_1.it)("should return Pong for PING interaction", function () { return __awaiter(void 0, void 0, void 0, function () {
        var interaction, request, context, response;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    verifyMock.mockReturnValue(Promise.resolve(true));
                    interaction = {
                        app_permissions: "",
                        application_id: "",
                        authorizing_integration_owners: {},
                        entitlements: [],
                        id: "",
                        token: "",
                        type: v10_1.InteractionType.Ping,
                        version: 1,
                    };
                    request = createMockHttpRequest(interaction, {
                        "x-signature-ed25519": "valid-signature",
                        "x-signature-timestamp": "timestamp",
                    });
                    context = createMockInvocationContext();
                    return [4 /*yield*/, (0, lambdaHttpTrigger_js_1.interactions)(request, context)];
                case 1:
                    response = _a.sent();
                    (0, vitest_1.expect)(response.status).toBe(200);
                    (0, vitest_1.expect)(response.body).toBe(JSON.stringify({ type: v10_1.InteractionResponseType.Pong }));
                    return [2 /*return*/];
            }
        });
    }); });
    (0, vitest_1.it)("should delegate to DiscordBotService for other interactions", function () { return __awaiter(void 0, void 0, void 0, function () {
        var interaction, mockResponse, request, context, response;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    verifyMock.mockReturnValue(Promise.resolve(true));
                    interaction = {
                        channel: { id: "channel-id", type: v10_1.ChannelType.GuildVoice },
                        type: v10_1.InteractionType.ApplicationCommand,
                        id: "interaction-id",
                        application_id: "application-id",
                        guild_id: "guild-id",
                        token: "interaction-token",
                        entitlements: [],
                        authorizing_integration_owners: {},
                        version: 1,
                        data: {
                            id: "command-id",
                            name: "test-command",
                            type: v10_1.ApplicationCommandType.Message,
                            target_id: "target-id",
                            resolved: {
                                messages: {
                                    "message-id": {
                                        id: "message-id",
                                        channel_id: "channel-id",
                                        author: {
                                            id: "user-id",
                                            username: "username",
                                            discriminator: "0001",
                                            avatar: null,
                                            global_name: "username",
                                        },
                                        content: "test message",
                                        timestamp: "2021-01-01T00:00:00Z",
                                        edited_timestamp: null,
                                        tts: false,
                                        mention_everyone: false,
                                        mentions: [],
                                        mention_roles: [],
                                        attachments: [],
                                        embeds: [],
                                        reactions: [],
                                        pinned: false,
                                        webhook_id: "webhook-id",
                                        type: 0,
                                        activity: undefined,
                                        application: undefined,
                                        application_id: "application-id",
                                        message_reference: undefined,
                                        flags: undefined,
                                        referenced_message: undefined,
                                        interaction: undefined,
                                        thread: undefined,
                                        components: [],
                                        sticker_items: [],
                                    },
                                },
                            },
                        },
                        user: {
                            id: "user-id",
                            username: "username",
                            discriminator: "0001",
                            avatar: null,
                            global_name: "username",
                        },
                        app_permissions: "0",
                        channel_id: "channel-id",
                        locale: "en-US",
                        guild_locale: "en-US",
                    };
                    mockResponse = {
                        type: v10_1.InteractionResponseType.ChannelMessageWithSource,
                        data: { content: "Response from bot" },
                    };
                    handleInteractionMock.mockResolvedValue(mockResponse);
                    request = createMockHttpRequest(interaction, {
                        "x-signature-ed25519": "valid-signature",
                        "x-signature-timestamp": "timestamp",
                    });
                    context = createMockInvocationContext();
                    return [4 /*yield*/, (0, lambdaHttpTrigger_js_1.interactions)(request, context)];
                case 1:
                    response = _a.sent();
                    (0, vitest_1.expect)(response.status).toBe(200);
                    (0, vitest_1.expect)(response.headers).toEqual({ "Content-Type": "application/json" });
                    (0, vitest_1.expect)(response.body).toBe(JSON.stringify(mockResponse));
                    (0, vitest_1.expect)(handleInteractionMock).toHaveBeenCalledWith(interaction);
                    return [2 /*return*/];
            }
        });
    }); });
});
