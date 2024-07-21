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
var interactionHelpers_js_1 = require("../../src/util/interactionHelpers.js");
var InteractionGenerator_js_1 = require("../helpers/InteractionGenerator.js");
var addQuestionToBankCommand_js_1 = require("../../src/handlers/actions/addQuestionToBankCommand.js");
(0, vitest_1.describe)("AddQuestionToBankCommand", function () {
    var questionStorage;
    var addQuestionToBankCommand;
    var spyGenerateAndAddQuestion = vitest_1.vi.fn();
    (0, vitest_1.beforeEach)(function () {
        spyGenerateAndAddQuestion = vitest_1.vi.fn();
        questionStorage = {
            generateAnswer: vitest_1.vi.fn(function (answerText) {
                return Promise.resolve({
                    answerId: answerText + "id",
                    answer: answerText,
                });
            }),
            generateAndAddQuestion: spyGenerateAndAddQuestion,
        };
        addQuestionToBankCommand = new addQuestionToBankCommand_js_1.AddQuestionToBankCommand(questionStorage);
    });
    (0, vitest_1.describe)("data", function () {
        (0, vitest_1.it)("should return the correct command data", function () {
            var commandData = addQuestionToBankCommand.data();
            (0, vitest_1.expect)(commandData.name).toBe("add_question_to_bank");
        });
    });
    (0, vitest_1.describe)("execute", function () {
        (0, vitest_1.it)("should return a error if guild id is null", function () { return __awaiter(void 0, void 0, void 0, function () {
            var interaction, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        interaction = InteractionGenerator_js_1.default.generateAddQuestionOptions("123", "sampleBank", "My life is", ["1", "2", "3", "4"], 0);
                        interaction.guild_id = undefined;
                        return [4 /*yield*/, addQuestionToBankCommand.execute(interaction)];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response).toEqual((0, interactionHelpers_js_1.createEphemeralResponse)("Must have a valid guild id."));
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should generate a modal response", function () { return __awaiter(void 0, void 0, void 0, function () {
            var interaction, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        interaction = InteractionGenerator_js_1.default.generateAddQuestionOptions("123", "sampleBank", "My life is", ["1", "2", "3", "4"], 0);
                        return [4 /*yield*/, addQuestionToBankCommand.execute(interaction)];
                    case 1:
                        response = (_a.sent());
                        (0, vitest_1.expect)(response.type).toBe(9); // Modal
                        (0, vitest_1.expect)(response.data.custom_id).toBe("add_question_to_bank");
                        (0, vitest_1.expect)(response.data.title).toBe("Add Question to Bank");
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, vitest_1.describe)("handleModalSubmit", function () {
        (0, vitest_1.it)("should return a error if guild id is null", function () { return __awaiter(void 0, void 0, void 0, function () {
            var interaction, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        interaction = InteractionGenerator_js_1.default.generateModalSubmit("123", "sampleBank", "What is 2+2?", ["2", "3", "4"], 2);
                        interaction.guild_id = undefined;
                        return [4 /*yield*/, addQuestionToBankCommand.handleModalSubmit(interaction)];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response).toEqual((0, interactionHelpers_js_1.createEphemeralResponse)("Must have a valid guild id."));
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should add a question to the bank and return a confirmation message", function () { return __awaiter(void 0, void 0, void 0, function () {
            var interaction, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        interaction = InteractionGenerator_js_1.default.generateModalSubmit("123", "sampleBank", "What is 2+2?", ["2", "3", "4"], 2);
                        return [4 /*yield*/, addQuestionToBankCommand.handleModalSubmit(interaction)];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(spyGenerateAndAddQuestion).toHaveBeenCalledWith("123", "sampleBank", "What is 2+2?", [
                            { answerId: "2id", answer: "2" },
                            { answerId: "3id", answer: "3" },
                            { answerId: "4id", answer: "4" },
                        ], "4id", 20000, undefined, undefined, undefined);
                        (0, vitest_1.expect)(response).toEqual((0, interactionHelpers_js_1.createEphemeralResponse)("Added question to bank sampleBank."));
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return an error if the question text is missing", function () { return __awaiter(void 0, void 0, void 0, function () {
            var interaction, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        interaction = InteractionGenerator_js_1.default.generateModalSubmit("123", "sampleBank", "", ["2", "3", "4"], 2);
                        return [4 /*yield*/, addQuestionToBankCommand.handleModalSubmit(interaction)];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response).toEqual((0, interactionHelpers_js_1.createEphemeralResponse)("There is no valid question text for sampleBank"));
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return an error if the correct answer index is missing", function () { return __awaiter(void 0, void 0, void 0, function () {
            var interaction, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        interaction = InteractionGenerator_js_1.default.generateModalSubmit("123", "sampleBank", "What is 2+2?", ["2", "3", "4"], undefined);
                        return [4 /*yield*/, addQuestionToBankCommand.handleModalSubmit(interaction)];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response).toEqual((0, interactionHelpers_js_1.createEphemeralResponse)("Invalid correct answer index. No answer is specified."));
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return an error if the correct answer index is not a number", function () { return __awaiter(void 0, void 0, void 0, function () {
            var interaction, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        interaction = InteractionGenerator_js_1.default.generateModalSubmit("123", "sampleBank", "What is 2+2?", ["2", "3", "4"], "invalid");
                        return [4 /*yield*/, addQuestionToBankCommand.handleModalSubmit(interaction)];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response).toEqual((0, interactionHelpers_js_1.createEphemeralResponse)("Invalid correct answer index. Please enter a number between 0 and 2"));
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return an error if the correct answer index is out of range", function () { return __awaiter(void 0, void 0, void 0, function () {
            var interaction, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        interaction = InteractionGenerator_js_1.default.generateModalSubmit("123", "sampleBank", "What is 2+2?", ["2", "3", "4"], 4);
                        return [4 /*yield*/, addQuestionToBankCommand.handleModalSubmit(interaction)];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response).toEqual((0, interactionHelpers_js_1.createEphemeralResponse)("Invalid correct answer index. Please enter a number between 0 and 2"));
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return an error if the correct answer is not found", function () { return __awaiter(void 0, void 0, void 0, function () {
            var interaction, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        interaction = InteractionGenerator_js_1.default.generateModalSubmit("123", "sampleBank", "What is 2+2?", ["2", "3", "4"], 2);
                        // Simulate generateAnswer returning undefined for the correct answer
                        questionStorage.generateAnswer.mockImplementation(function (answerText) {
                            if (answerText === "4") {
                                return undefined;
                            }
                            return Promise.resolve({
                                answerId: answerText + "id",
                                answer: answerText,
                            });
                        });
                        return [4 /*yield*/, addQuestionToBankCommand.handleModalSubmit(interaction)];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response).toEqual((0, interactionHelpers_js_1.createEphemeralResponse)("Invalid correct answer index. Could not find a valid answer."));
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return a generic error response if an unknown error occurs", function () { return __awaiter(void 0, void 0, void 0, function () {
            var interaction, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        questionStorage.generateAndAddQuestion = vitest_1.vi
                            .fn()
                            .mockImplementation(function () {
                            throw new Error("Unknown error");
                        });
                        interaction = InteractionGenerator_js_1.default.generateModalSubmit("123", "sampleBank", "What is 2+2?", ["2", "3", "4"], 2);
                        return [4 /*yield*/, addQuestionToBankCommand.handleModalSubmit(interaction)];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response).toEqual((0, interactionHelpers_js_1.createEphemeralResponse)("Unknown error"));
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return an error if the bank name is missing", function () { return __awaiter(void 0, void 0, void 0, function () {
            var interaction, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        interaction = InteractionGenerator_js_1.default.generateModalSubmit("123", "", "What is 2+2?", ["2", "3", "4"], 2);
                        return [4 /*yield*/, addQuestionToBankCommand.handleModalSubmit(interaction)];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response).toEqual((0, interactionHelpers_js_1.createEphemeralResponse)("Must specify a valid bank name"));
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)("should return a generic error response if an unknown error occurs", function () { return __awaiter(void 0, void 0, void 0, function () {
            var interaction, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        questionStorage.generateAndAddQuestion = vitest_1.vi
                            .fn()
                            .mockImplementation(function () {
                            throw "Unknown error";
                        });
                        interaction = InteractionGenerator_js_1.default.generateModalSubmit("123", "sampleBank", "What is 2+2?", ["2", "3", "4"], 2);
                        return [4 /*yield*/, addQuestionToBankCommand.handleModalSubmit(interaction)];
                    case 1:
                        response = _a.sent();
                        (0, vitest_1.expect)(response).toEqual((0, interactionHelpers_js_1.createEphemeralResponse)("Failed to add question to bank sampleBank: An unknown error occurred."));
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
