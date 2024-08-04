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
var config_js_1 = require("@src/util/config.js");
var discordBotService_js_1 = require("@src/handlers/discordBotService.js");
var questionStorage_js_1 = require("@src/util/questionStorage.js");
var guildStorage_js_1 = require("@src/util/guildStorage.js");
var errorHelpers_js_1 = require("@src/util/errorHelpers.js");
var stateManager_js_1 = require("@src/handlers/stateManager.js");
var commandManager_js_1 = require("@src/handlers/actions/commandManager.js");
var rest_1 = require("@discordjs/rest");
var quizImageStorage_js_1 = require("@src/util/quizImageStorage.js");
var quizManagerFactoryManager_js_1 = require("@src/handlers/quizManagerFactoryManager.js");
var durableQuizManager_js_1 = require("@src/handlers/durableQuizManager.js");
vitest_1.vi.mock("@discordjs/rest");
vitest_1.vi.mock("@src/handlers/discordBotService");
vitest_1.vi.mock("@src/util/questionStorage");
vitest_1.vi.mock("@src/util/quizImageStorage");
vitest_1.vi.mock("@src/util/guildStorage");
vitest_1.vi.mock("@src/handlers/stateManager");
vitest_1.vi.mock("@src/util/errorHelpers", function () { return ({
    throwError: vitest_1.vi.fn(),
}); });
var mockedThrowError = vitest_1.vi.mocked(errorHelpers_js_1.throwError);
(0, vitest_1.describe)("Config", function () {
    (0, vitest_1.beforeEach)(function () {
        vitest_1.vi.clearAllMocks();
        config_js_1.Config["_initialized"] = false;
        config_js_1.Config["_initializePromise"] = null;
    });
    (0, vitest_1.it)("should use provided quizManagerFactory when provided", function () { return __awaiter(void 0, void 0, void 0, function () {
        var mockQuizManagerFactory;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mockQuizManagerFactory = new quizManagerFactoryManager_js_1.QuizManagerFactoryManager(function () {
                        return new durableQuizManager_js_1.DurableQuizManager(new rest_1.REST(), new questionStorage_js_1.QuestionStorage(new quizImageStorage_js_1.QuizImageStorage("mock-connection-string", "mock-key", "mock-name")), {});
                    });
                    return [4 /*yield*/, config_js_1.Config.initialize(undefined, "mockToken", "mockClientId", "mockPublicKey", new questionStorage_js_1.QuestionStorage(new quizImageStorage_js_1.QuizImageStorage("mock-connection-string", "mock-key", "mock-name")), new guildStorage_js_1.GuildStorage(), new quizImageStorage_js_1.QuizImageStorage("mock-connection-string", "mock-key", "mock-name"), new stateManager_js_1.StateManager(), mockQuizManagerFactory, new discordBotService_js_1.DiscordBotService(new guildStorage_js_1.GuildStorage(), mockQuizManagerFactory, new commandManager_js_1.CommandManager(mockQuizManagerFactory, new questionStorage_js_1.QuestionStorage(new quizImageStorage_js_1.QuizImageStorage("mock-connection-string", "mock-key", "mock-name")), "mockClientId", new rest_1.REST())))];
                case 1:
                    _a.sent();
                    (0, vitest_1.expect)(config_js_1.Config.quizManagerFactory).toBe(mockQuizManagerFactory);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, vitest_1.it)("should throw error when durableClient is not provided", function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mockedThrowError.mockImplementation(function (message) {
                        throw new Error(message);
                    });
                    // const mockQuizImageStorageClient = new QuizImageStorage(
                    //     "mock-connection-string",
                    //     "mock-key",
                    //     "mock-name"
                    // );
                    // const mockQuestionStorage = new QuestionStorage(mockQuizImageStorageClient);
                    return [4 /*yield*/, (0, vitest_1.expect)(function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, config_js_1.Config.initialize(undefined, // No durableClient provided
                                        "mockToken", "mockClientId", "mockPublicKey")];
                                    case 1:
                                        _a.sent();
                                        return [4 /*yield*/, config_js_1.Config.quizManagerFactory.getQuizManager("123")];
                                    case 2:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); }).rejects.toThrow("must have valid durable client")];
                case 1:
                    // const mockQuizImageStorageClient = new QuizImageStorage(
                    //     "mock-connection-string",
                    //     "mock-key",
                    //     "mock-name"
                    // );
                    // const mockQuestionStorage = new QuestionStorage(mockQuizImageStorageClient);
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, vitest_1.it)("should create new QuizManagerFactoryManager when not provided", function () { return __awaiter(void 0, void 0, void 0, function () {
        var mockDurableClient, mockQuizImageStorageClient, mockQuestionStorage;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mockDurableClient = {};
                    mockQuizImageStorageClient = new quizImageStorage_js_1.QuizImageStorage("mock-connection-string", "mock-key", "mock-name");
                    mockQuestionStorage = new questionStorage_js_1.QuestionStorage(mockQuizImageStorageClient);
                    return [4 /*yield*/, config_js_1.Config.initialize(mockDurableClient, "mockToken", "mockClientId", "mockPublicKey", mockQuestionStorage, new guildStorage_js_1.GuildStorage(), mockQuizImageStorageClient, new stateManager_js_1.StateManager(), undefined, new discordBotService_js_1.DiscordBotService(new guildStorage_js_1.GuildStorage(), new quizManagerFactoryManager_js_1.QuizManagerFactoryManager(function () {
                            return new durableQuizManager_js_1.DurableQuizManager(new rest_1.REST(), mockQuestionStorage, mockDurableClient);
                        }), new commandManager_js_1.CommandManager(new quizManagerFactoryManager_js_1.QuizManagerFactoryManager(function () {
                            return new durableQuizManager_js_1.DurableQuizManager(new rest_1.REST(), mockQuestionStorage, mockDurableClient);
                        }), mockQuestionStorage, "mockClientId", new rest_1.REST())))];
                case 1:
                    _a.sent();
                    (0, vitest_1.expect)(config_js_1.Config.quizManagerFactory).toBeInstanceOf(quizManagerFactoryManager_js_1.QuizManagerFactoryManager);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, vitest_1.it)("should initialize with provided values", function () { return __awaiter(void 0, void 0, void 0, function () {
        var mockRest, mockToken, mockClientId, mockPublicKey, mockQuizImageStorageClient, mockQuestionStorage, mockGuildStorage, mockStateManager, mockQuizManagerFactory, mockCommandManager, mockDiscordBotService;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mockRest = new rest_1.REST();
                    mockToken = "mockToken";
                    mockClientId = "mockClientId";
                    mockPublicKey = "mockPublicKey";
                    mockQuizImageStorageClient = new quizImageStorage_js_1.QuizImageStorage("mock-connection-string", "mock-key", "mock-name");
                    mockQuestionStorage = new questionStorage_js_1.QuestionStorage(mockQuizImageStorageClient);
                    mockGuildStorage = new guildStorage_js_1.GuildStorage();
                    mockStateManager = new stateManager_js_1.StateManager();
                    mockQuizManagerFactory = new quizManagerFactoryManager_js_1.QuizManagerFactoryManager(function () {
                        return new durableQuizManager_js_1.DurableQuizManager(mockRest, mockQuestionStorage, {});
                    });
                    mockCommandManager = new commandManager_js_1.CommandManager(mockQuizManagerFactory, mockQuestionStorage, mockClientId, mockRest);
                    mockDiscordBotService = new discordBotService_js_1.DiscordBotService(mockGuildStorage, mockQuizManagerFactory, mockCommandManager);
                    return [4 /*yield*/, config_js_1.Config.initialize(undefined, mockToken, mockClientId, mockPublicKey, mockQuestionStorage, mockGuildStorage, mockQuizImageStorageClient, mockStateManager, mockQuizManagerFactory, mockDiscordBotService)];
                case 1:
                    _a.sent();
                    (0, vitest_1.expect)(config_js_1.Config.token).toBe(mockToken);
                    (0, vitest_1.expect)(config_js_1.Config.clientId).toBe(mockClientId);
                    (0, vitest_1.expect)(config_js_1.Config.publicKey).toBe(mockPublicKey);
                    (0, vitest_1.expect)(config_js_1.Config.questionStorage).toBe(mockQuestionStorage);
                    (0, vitest_1.expect)(config_js_1.Config.guildStorage).toBe(mockGuildStorage);
                    (0, vitest_1.expect)(config_js_1.Config.discordBotService).toBe(mockDiscordBotService);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, vitest_1.it)("should throw error if DISCORD_BOT_TOKEN environment variable is missing", function () { return __awaiter(void 0, void 0, void 0, function () {
        var originalEnv;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mockedThrowError.mockImplementation(function (message) {
                        throw new Error(message);
                    });
                    originalEnv = __assign({}, process.env);
                    delete process.env.DISCORD_BOT_TOKEN;
                    return [4 /*yield*/, (0, vitest_1.expect)(config_js_1.Config.initialize()).rejects.toThrow("Environment variable DISCORD_BOT_TOKEN is missing.")];
                case 1:
                    _a.sent();
                    process.env = originalEnv;
                    return [2 /*return*/];
            }
        });
    }); });
    (0, vitest_1.it)("should throw error if DISCORD_CLIENT_ID environment variable is missing", function () { return __awaiter(void 0, void 0, void 0, function () {
        var originalEnv;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mockedThrowError.mockImplementation(function (message) {
                        throw new Error(message);
                    });
                    originalEnv = __assign({}, process.env);
                    delete process.env.DISCORD_CLIENT_ID;
                    return [4 /*yield*/, (0, vitest_1.expect)(config_js_1.Config.initialize()).rejects.toThrow("Environment variable DISCORD_CLIENT_ID is missing.")];
                case 1:
                    _a.sent();
                    process.env = originalEnv;
                    return [2 /*return*/];
            }
        });
    }); });
    (0, vitest_1.it)("should throw error if DISCORD_PUBLIC_KEY environment variable is missing", function () { return __awaiter(void 0, void 0, void 0, function () {
        var originalEnv;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mockedThrowError.mockImplementation(function (message) {
                        throw new Error(message);
                    });
                    originalEnv = __assign({}, process.env);
                    delete process.env.DISCORD_PUBLIC_KEY;
                    return [4 /*yield*/, (0, vitest_1.expect)(config_js_1.Config.initialize()).rejects.toThrow("Environment variable DISCORD_PUBLIC_KEY is missing.")];
                case 1:
                    _a.sent();
                    process.env = originalEnv;
                    return [2 /*return*/];
            }
        });
    }); });
    (0, vitest_1.it)("should not reinitialize if already initialized", function () { return __awaiter(void 0, void 0, void 0, function () {
        var mockToken, mockClientId, mockPublicKey, mockQuizImageStorageClient, mockQuestionStorage, mockGuildStorage, mockStateManager, mockQuizManagerFactory, mockCommandManager, mockDiscordBotService, initialConfig, subsequentConfig;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mockToken = "mockToken";
                    mockClientId = "mockClientId";
                    mockPublicKey = "mockPublicKey";
                    mockQuizImageStorageClient = new quizImageStorage_js_1.QuizImageStorage("mock-connection-string", "mock-key", "mock-name");
                    mockQuestionStorage = new questionStorage_js_1.QuestionStorage(mockQuizImageStorageClient);
                    mockGuildStorage = new guildStorage_js_1.GuildStorage();
                    mockStateManager = new stateManager_js_1.StateManager();
                    mockQuizManagerFactory = new quizManagerFactoryManager_js_1.QuizManagerFactoryManager(function () {
                        return new durableQuizManager_js_1.DurableQuizManager(new rest_1.REST(), mockQuestionStorage, {});
                    });
                    mockCommandManager = new commandManager_js_1.CommandManager(mockQuizManagerFactory, mockQuestionStorage, mockClientId, new rest_1.REST());
                    mockDiscordBotService = new discordBotService_js_1.DiscordBotService(mockGuildStorage, mockQuizManagerFactory, mockCommandManager);
                    return [4 /*yield*/, config_js_1.Config.initialize(undefined, mockToken, mockClientId, mockPublicKey, mockQuestionStorage, mockGuildStorage, mockQuizImageStorageClient, mockStateManager, mockQuizManagerFactory, mockDiscordBotService)];
                case 1:
                    _a.sent();
                    initialConfig = config_js_1.Config["_initializePromise"];
                    return [4 /*yield*/, config_js_1.Config.initialize(undefined, mockToken, mockClientId, mockPublicKey, mockQuestionStorage, mockGuildStorage, mockQuizImageStorageClient, mockStateManager, mockQuizManagerFactory, mockDiscordBotService)];
                case 2:
                    _a.sent();
                    subsequentConfig = config_js_1.Config["_initializePromise"];
                    (0, vitest_1.expect)(initialConfig).toBe(subsequentConfig);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, vitest_1.it)("should resolve existing instance if already initialized", function () { return __awaiter(void 0, void 0, void 0, function () {
        var instance;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    config_js_1.Config["_initialized"] = true;
                    return [4 /*yield*/, config_js_1.Config.initialize()];
                case 1:
                    instance = _a.sent();
                    (0, vitest_1.expect)(instance).toBeInstanceOf(config_js_1.Config);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, vitest_1.it)("should initialize discordBotService with new instance when not provided", function () { return __awaiter(void 0, void 0, void 0, function () {
        var mockToken, mockClientId, mockPublicKey, mockQuizImageStorageClient, mockQuestionStorage, mockGuildStorage, mockStateManager, mockQuizManagerFactory;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mockToken = "mockToken";
                    mockClientId = "mockClientId";
                    mockPublicKey = "mockPublicKey";
                    mockQuizImageStorageClient = new quizImageStorage_js_1.QuizImageStorage("mock-connection-string", "mock-key", "mock-name");
                    mockQuestionStorage = new questionStorage_js_1.QuestionStorage(mockQuizImageStorageClient);
                    mockGuildStorage = new guildStorage_js_1.GuildStorage();
                    mockStateManager = new stateManager_js_1.StateManager();
                    mockQuizManagerFactory = new quizManagerFactoryManager_js_1.QuizManagerFactoryManager(function () {
                        return new durableQuizManager_js_1.DurableQuizManager(new rest_1.REST(), mockQuestionStorage, {});
                    });
                    return [4 /*yield*/, config_js_1.Config.initialize(undefined, mockToken, mockClientId, mockPublicKey, mockQuestionStorage, mockGuildStorage, mockQuizImageStorageClient, mockStateManager, mockQuizManagerFactory)];
                case 1:
                    _a.sent();
                    (0, vitest_1.expect)(config_js_1.Config.discordBotService).toBeInstanceOf(discordBotService_js_1.DiscordBotService);
                    (0, vitest_1.expect)(discordBotService_js_1.DiscordBotService).toHaveBeenCalledWith(mockGuildStorage, mockQuizManagerFactory, vitest_1.expect.any(commandManager_js_1.CommandManager));
                    return [2 /*return*/];
            }
        });
    }); });
});
