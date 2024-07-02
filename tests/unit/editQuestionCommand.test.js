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
var editQuestionCommand_js_1 = require("../../src/handlers/actions/editQuestionCommand.js");
function createComponents(fields) {
    return fields.map(function (field) { return ({
        type: v10_1.ComponentType.ActionRow,
        components: [
            {
                type: v10_1.ComponentType.TextInput,
                custom_id: field.custom_id,
                value: field.value,
            },
        ],
    }); });
}
function createInteraction(options) {
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
            name: "edit_question",
            options: [
                {
                    name: "bankname",
                    type: v10_1.ApplicationCommandOptionType.String,
                    value: options.bankname,
                },
                {
                    name: "questionid",
                    type: v10_1.ApplicationCommandOptionType.String,
                    value: options.questionid,
                },
            ],
            resolved: {},
            type: v10_1.ApplicationCommandType.ChatInput,
        },
        guild_id: "guild-id",
        channel_id: "channel-id",
        member: {
            user: {
                id: "user-id",
                username: "username",
                discriminator: "0001",
                avatar: "avatar-hash",
                global_name: "user-id",
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
function checkModalContainsExpectedValues(modal, question) {
    var _a;
    var componentValues = modal.components.flatMap(function (row) { return row.components; });
    // Helper function to find a component by its custom_id
    var findComponent = function (customId) {
        return componentValues.find(function (c) { return c.custom_id === customId; });
    };
    // Check bank name input
    var bankNameInput = findComponent(editQuestionCommand_js_1.EditQuestionCommand.componentIds.bankName);
    (0, vitest_1.expect)(bankNameInput).toBeDefined();
    if (!bankNameInput)
        throw Error("need to have a valid bank name");
    (0, vitest_1.expect)(bankNameInput.value).toBe(question.bankName);
    // Check question text input
    var questionTextInput = findComponent(editQuestionCommand_js_1.EditQuestionCommand.componentIds.questionText);
    (0, vitest_1.expect)(questionTextInput).toBeDefined();
    (0, vitest_1.expect)(questionTextInput.value).toBe(question.question);
    // Check timeout time input
    var timeoutTimeInput = findComponent(editQuestionCommand_js_1.EditQuestionCommand.componentIds.timeoutTimeSeconds);
    (0, vitest_1.expect)(timeoutTimeInput).toBeDefined();
    (0, vitest_1.expect)(timeoutTimeInput.value).toBe(question.questionShowTimeMs.toString());
    // Check image URL input
    var imageUrlInput = findComponent(editQuestionCommand_js_1.EditQuestionCommand.componentIds.imageUrl);
    (0, vitest_1.expect)(imageUrlInput).toBeDefined();
    (0, vitest_1.expect)(imageUrlInput.value).toBe(undefined);
    // Check explanation input
    var explanationInput = findComponent(editQuestionCommand_js_1.EditQuestionCommand.componentIds.explanation);
    (0, vitest_1.expect)(explanationInput).toBeDefined();
    (0, vitest_1.expect)(explanationInput.value).toBe((_a = question.explanation) !== null && _a !== void 0 ? _a : undefined);
    // Check explanation image URL input
    var explanationImageUrlInput = findComponent(editQuestionCommand_js_1.EditQuestionCommand.componentIds.explanationImageUrl);
    (0, vitest_1.expect)(explanationImageUrlInput).toBeDefined();
    (0, vitest_1.expect)(explanationImageUrlInput.value).toBe(undefined);
    // Check each answer input
    question.answers.forEach(function (answer) {
        var answerInput = findComponent("answer_".concat(answer.answerId));
        (0, vitest_1.expect)(answerInput).toBeDefined();
        (0, vitest_1.expect)(answerInput.value).toBe(answer.answer);
    });
    // Check correct answer index input
    var correctAnswerIndexInput = findComponent(editQuestionCommand_js_1.EditQuestionCommand.componentIds.correctAnswerIndex);
    (0, vitest_1.expect)(correctAnswerIndexInput).toBeDefined();
}
(0, vitest_1.describe)("EditQuestionCommand", function () {
    var mockQuestionStorage;
    var command;
    var question;
    var interactionData;
    (0, vitest_1.beforeEach)(function () {
        question = {
            guildId: "test-guild",
            bankName: "test-bank",
            questionId: "test-question-id",
            question: "What is 2 + 2?",
            answers: [
                { answerId: "answer1", answer: "3" },
                { answerId: "answer2", answer: "4" },
                { answerId: "answer3", answer: "5" },
            ],
            correctAnswerId: "answer1",
            questionShowTimeMs: 20000,
        };
        interactionData = {
            app_permissions: "",
            authorizing_integration_owners: {},
            entitlements: [],
            locale: "en-US",
            version: 1,
            type: 5,
            data: {
                custom_id: "edit_question_test-question-id",
                components: createComponents([
                    { custom_id: "bankname", value: "test-bank" },
                    { custom_id: "questionText", value: "What is 3 + 3?" },
                    { custom_id: "timeoutTimeSeconds", value: "30" },
                    { custom_id: "imageUrl", value: "http://example.com/image.jpg" },
                    { custom_id: "explanation", value: "A simple math question" },
                    {
                        custom_id: "explanationImageUrl",
                        value: "http://example.com/explanation.jpg",
                    },
                    { custom_id: "answer_answer1", value: "5" },
                    { custom_id: "answer_answer2", value: "6" },
                    { custom_id: "answer_answer3", value: "7" },
                    { custom_id: "correctAnswerIndex", value: "1" },
                ]),
            },
            application_id: "application-id",
            channel_id: "channel-id",
            guild_id: "guild-id",
            id: "interaction-id",
            token: "interaction-token",
            user: {
                id: "user-id",
                username: "username",
                discriminator: "0001",
                avatar: "avatar-hash",
                global_name: "user-id",
            },
        };
        mockQuestionStorage = {
            getQuestion: vitest_1.vi.fn(),
            getQuestionBankNames: vitest_1.vi.fn(),
            getQuestions: vitest_1.vi.fn(),
            updateQuestion: vitest_1.vi.fn(),
            deleteQuestion: vitest_1.vi.fn(),
            deleteQuestionBank: vitest_1.vi.fn(),
            generateAndAddQuestion: vitest_1.vi.fn(),
            generateQuestion: vitest_1.vi.fn(),
            generateAnswer: function (answerText) {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        return [2 /*return*/, { answer: answerText, answerId: answerText + "id" }];
                    });
                });
            },
        };
        command = new editQuestionCommand_js_1.EditQuestionCommand(mockQuestionStorage);
    });
    (0, vitest_1.afterEach)(function () {
        vitest_1.vi.clearAllMocks();
        vitest_1.vi.clearAllTimers();
    });
    (0, vitest_1.describe)("data", function () {
        (0, vitest_1.it)("should return the correct command data", function () {
            var _a, _b;
            var commandData = command.data().toJSON();
            (0, vitest_1.expect)(commandData.name).toBe("edit_question");
            (0, vitest_1.expect)(commandData.description).toBe("Edit a question");
            (0, vitest_1.expect)(commandData.options).toHaveLength(2);
            var bankNameOption = (_a = commandData.options) === null || _a === void 0 ? void 0 : _a.find(function (option) { return option.name === editQuestionCommand_js_1.EditQuestionCommand.optionIds.bankName; });
            (0, vitest_1.expect)(bankNameOption).toBeDefined();
            (0, vitest_1.expect)(bankNameOption === null || bankNameOption === void 0 ? void 0 : bankNameOption.description).toBe("The name of the question bank");
            (0, vitest_1.expect)(bankNameOption === null || bankNameOption === void 0 ? void 0 : bankNameOption.required).toBe(true);
            (0, vitest_1.expect)(bankNameOption === null || bankNameOption === void 0 ? void 0 : bankNameOption.type).toBe(3); // 3 represents string option type
            var questionIdOption = (_b = commandData.options) === null || _b === void 0 ? void 0 : _b.find(function (option) { return option.name === editQuestionCommand_js_1.EditQuestionCommand.optionIds.questionId; });
            (0, vitest_1.expect)(questionIdOption).toBeDefined();
            (0, vitest_1.expect)(questionIdOption === null || questionIdOption === void 0 ? void 0 : questionIdOption.description).toBe("The ID of the question");
            (0, vitest_1.expect)(questionIdOption === null || questionIdOption === void 0 ? void 0 : questionIdOption.required).toBe(true);
            (0, vitest_1.expect)(questionIdOption === null || questionIdOption === void 0 ? void 0 : questionIdOption.type).toBe(3); // 3 represents string option type
        });
    });
    (0, vitest_1.describe)("execute", function () {
        (0, vitest_1.it)("should generate the modal correctly", function () { return __awaiter(void 0, void 0, void 0, function () {
            var interaction, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockQuestionStorage.getQuestions = vitest_1.vi.fn().mockResolvedValue([question]);
                        interaction = createInteraction({
                            bankname: "test-bank",
                            questionid: "test-question-id",
                        });
                        return [4 /*yield*/, command.execute(interaction)];
                    case 1:
                        response = (_a.sent());
                        (0, vitest_1.expect)(response.type).toBe(v10_1.InteractionResponseType.Modal);
                        (0, vitest_1.expect)(response.data.components.length).toBeGreaterThan(0);
                        checkModalContainsExpectedValues(response.data, question);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return an error if the question is not found during modal generation", function () { return __awaiter(void 0, void 0, void 0, function () {
            var interaction, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockQuestionStorage.getQuestions = vitest_1.vi.fn().mockResolvedValue([]);
                        interaction = createInteraction({
                            bankname: "test-bank",
                            questionid: "test-question-id",
                        });
                        return [4 /*yield*/, command.execute(interaction)];
                    case 1:
                        response = (_a.sent());
                        (0, vitest_1.expect)(response.type).toBe(v10_1.InteractionResponseType.ChannelMessageWithSource);
                        (0, vitest_1.expect)(response.data.content).toBe("No valid question found for bank name test-bank and question id test-question-id.");
                        (0, vitest_1.expect)(response.data.flags).toBe(v10_1.MessageFlags.Ephemeral);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return an error if bankName option is missing", function () { return __awaiter(void 0, void 0, void 0, function () {
            var interaction, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        interaction = createInteraction({
                            bankname: "",
                            questionid: "test-question-id",
                        });
                        return [4 /*yield*/, command.execute(interaction)];
                    case 1:
                        response = (_a.sent());
                        (0, vitest_1.expect)(response.type).toBe(v10_1.InteractionResponseType.ChannelMessageWithSource);
                        (0, vitest_1.expect)(response.data.content).toBe("The bankname was not specified!");
                        (0, vitest_1.expect)(response.data.flags).toBe(v10_1.MessageFlags.Ephemeral);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return an error if questionId option is missing", function () { return __awaiter(void 0, void 0, void 0, function () {
            var interaction, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        interaction = createInteraction({
                            bankname: "test-bank",
                            questionid: "",
                        });
                        return [4 /*yield*/, command.execute(interaction)];
                    case 1:
                        response = (_a.sent());
                        (0, vitest_1.expect)(response.type).toBe(v10_1.InteractionResponseType.ChannelMessageWithSource);
                        (0, vitest_1.expect)(response.data.content).toBe("The questionid was not specified!");
                        (0, vitest_1.expect)(response.data.flags).toBe(v10_1.MessageFlags.Ephemeral);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return an error if an exception occurs during execution", function () { return __awaiter(void 0, void 0, void 0, function () {
            var interaction, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockQuestionStorage.getQuestions = vitest_1.vi
                            .fn()
                            .mockRejectedValue(new Error("Failed to fetch questions"));
                        interaction = createInteraction({
                            bankname: "test-bank",
                            questionid: "test-question-id",
                        });
                        return [4 /*yield*/, command.execute(interaction)];
                    case 1:
                        response = (_a.sent());
                        (0, vitest_1.expect)(response.type).toBe(v10_1.InteractionResponseType.ChannelMessageWithSource);
                        (0, vitest_1.expect)(response.data.content).toBe("Failed to fetch questions");
                        (0, vitest_1.expect)(response.data.flags).toBe(v10_1.MessageFlags.Ephemeral);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, vitest_1.describe)("handleModalSubmit", function () {
        (0, vitest_1.it)("should update the question correctly", function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockQuestionStorage.getQuestions = vitest_1.vi.fn().mockResolvedValue([question]);
                        return [4 /*yield*/, command.handleModalSubmit(interactionData)];
                    case 1:
                        response = (_a.sent());
                        (0, vitest_1.expect)(response.type).toBe(v10_1.InteractionResponseType.ChannelMessageWithSource);
                        (0, vitest_1.expect)(response.data.content).toBe("Updated question in bank test-bank.");
                        (0, vitest_1.expect)(mockQuestionStorage.updateQuestion).toHaveBeenCalledWith("guild-id", __assign(__assign({}, question), { question: "What is 3 + 3?", answers: [
                                { answerId: "answer1", answer: "5" },
                                { answerId: "answer2", answer: "6" },
                                { answerId: "answer3", answer: "7" },
                            ], correctAnswerId: "answer2", questionShowTimeMs: 30000, imagePartitionKey: "test-bank-test-question-id-question", explanation: "A simple math question", explanationImagePartitionKey: "test-bank-test-question-id-explanation" }));
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return an error if required fields are missing", function () { return __awaiter(void 0, void 0, void 0, function () {
            var invalidInteractionData, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        invalidInteractionData = __assign({}, interactionData);
                        invalidInteractionData.data.components[0].components[0].value =
                            "";
                        return [4 /*yield*/, command.handleModalSubmit(invalidInteractionData)];
                    case 1:
                        response = (_a.sent());
                        (0, vitest_1.expect)(response.type).toBe(v10_1.InteractionResponseType.ChannelMessageWithSource);
                        (0, vitest_1.expect)(response.data.content).toBe("Bank name is missing.");
                        (0, vitest_1.expect)(response.data.flags).toBe(v10_1.MessageFlags.Ephemeral);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return an error if question text is missing", function () { return __awaiter(void 0, void 0, void 0, function () {
            var invalidInteractionData, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        invalidInteractionData = __assign({}, interactionData);
                        invalidInteractionData.data.components[1].components[0].value =
                            "";
                        return [4 /*yield*/, command.handleModalSubmit(invalidInteractionData)];
                    case 1:
                        response = (_a.sent());
                        (0, vitest_1.expect)(response.type).toBe(v10_1.InteractionResponseType.ChannelMessageWithSource);
                        (0, vitest_1.expect)(response.data.content).toBe("Question text is missing.");
                        (0, vitest_1.expect)(response.data.flags).toBe(v10_1.MessageFlags.Ephemeral);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return an error if correct answer index is missing", function () { return __awaiter(void 0, void 0, void 0, function () {
            var invalidInteractionData, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        invalidInteractionData = __assign({}, interactionData);
                        invalidInteractionData.data.components[9].components[0].value =
                            "";
                        return [4 /*yield*/, command.handleModalSubmit(invalidInteractionData)];
                    case 1:
                        response = (_a.sent());
                        (0, vitest_1.expect)(response.type).toBe(v10_1.InteractionResponseType.ChannelMessageWithSource);
                        (0, vitest_1.expect)(response.data.content).toBe("Correct answer index is missing.");
                        (0, vitest_1.expect)(response.data.flags).toBe(v10_1.MessageFlags.Ephemeral);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return an error if the question ID is not found", function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockQuestionStorage.getQuestions = vitest_1.vi.fn().mockResolvedValue([]);
                        return [4 /*yield*/, command.handleModalSubmit(interactionData)];
                    case 1:
                        response = (_a.sent());
                        (0, vitest_1.expect)(response.type).toBe(v10_1.InteractionResponseType.ChannelMessageWithSource);
                        (0, vitest_1.expect)(response.data.content).toBe("Question with ID test-question-id not found.");
                        (0, vitest_1.expect)(response.data.flags).toBe(v10_1.MessageFlags.Ephemeral);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return an error if the correct answer index is invalid", function () { return __awaiter(void 0, void 0, void 0, function () {
            var invalidInteractionData, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        invalidInteractionData = __assign({}, interactionData);
                        invalidInteractionData.data.components[9].components[0].value =
                            "5";
                        return [4 /*yield*/, command.handleModalSubmit(invalidInteractionData)];
                    case 1:
                        response = (_a.sent());
                        (0, vitest_1.expect)(response.type).toBe(v10_1.InteractionResponseType.ChannelMessageWithSource);
                        (0, vitest_1.expect)(response.data.content).toBe("Invalid correct answer index. Please enter a number between 0 and 2");
                        (0, vitest_1.expect)(response.data.flags).toBe(v10_1.MessageFlags.Ephemeral);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return an error if the correct answer is not found", function () { return __awaiter(void 0, void 0, void 0, function () {
            var invalidInteractionData, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockQuestionStorage.getQuestions = vitest_1.vi.fn().mockResolvedValue([question]);
                        invalidInteractionData = __assign({}, interactionData);
                        invalidInteractionData.data.components[9].components[0].value =
                            "5";
                        return [4 /*yield*/, command.handleModalSubmit(invalidInteractionData)];
                    case 1:
                        response = (_a.sent());
                        (0, vitest_1.expect)(response.type).toBe(v10_1.InteractionResponseType.ChannelMessageWithSource);
                        (0, vitest_1.expect)(response.data.content).toBe("Invalid correct answer index. Please enter a number between 0 and 2");
                        (0, vitest_1.expect)(response.data.flags).toBe(v10_1.MessageFlags.Ephemeral);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return an error if an exception occurs during handleModalSubmit", function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Simulate the condition where the question is found but updateQuestion throws an error
                        mockQuestionStorage.getQuestions = vitest_1.vi.fn().mockResolvedValue([question]);
                        mockQuestionStorage.updateQuestion = vitest_1.vi
                            .fn()
                            .mockRejectedValue(new Error("Failed to update question"));
                        return [4 /*yield*/, command.handleModalSubmit(interactionData)];
                    case 1:
                        response = (_a.sent());
                        (0, vitest_1.expect)(response.type).toBe(v10_1.InteractionResponseType.ChannelMessageWithSource);
                        (0, vitest_1.expect)(response.data.content).toBe("Failed to update question: Failed to update question");
                        (0, vitest_1.expect)(response.data.flags).toBe(v10_1.MessageFlags.Ephemeral);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return an error if the guild id is missing", function () { return __awaiter(void 0, void 0, void 0, function () {
            var invalidInteractionData, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        invalidInteractionData = __assign(__assign({}, interactionData), { guild_id: undefined });
                        return [4 /*yield*/, command.handleModalSubmit(invalidInteractionData)];
                    case 1:
                        response = (_a.sent());
                        (0, vitest_1.expect)(response.type).toBe(v10_1.InteractionResponseType.ChannelMessageWithSource);
                        (0, vitest_1.expect)(response.data.content).toBe("Must have a valid guild id.");
                        (0, vitest_1.expect)(response.data.flags).toBe(v10_1.MessageFlags.Ephemeral);
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
