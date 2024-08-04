"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var vitest_1 = require("vitest");
var v10_1 = require("discord-api-types/v10");
var interactionHelpers_js_1 = require("../../src/util/interactionHelpers.js");
var v10_2 = require("discord-api-types/v10");
(0, vitest_1.describe)("interactionHelpers", function () {
    (0, vitest_1.describe)("generateErrorResponse", function () {
        (0, vitest_1.it)("should generate an error response", function () {
            var error = new Error("Something went wrong");
            var response = (0, interactionHelpers_js_1.generateErrorResponse)(error);
            (0, vitest_1.expect)(response).toEqual({
                type: v10_1.InteractionResponseType.ChannelMessageWithSource,
                data: {
                    content: "Something went wrong",
                    flags: v10_1.MessageFlags.Ephemeral,
                },
            });
        });
    });
    (0, vitest_1.describe)("generateOptionMissingErrorResponse", function () {
        (0, vitest_1.it)("should generate a missing option error response", function () {
            var response = (0, interactionHelpers_js_1.generateOptionMissingErrorResponse)("optionName");
            (0, vitest_1.expect)(response).toEqual({
                type: v10_1.InteractionResponseType.ChannelMessageWithSource,
                data: {
                    content: "The optionName was not specified!",
                    flags: v10_1.MessageFlags.Ephemeral,
                },
            });
        });
    });
    (0, vitest_1.describe)("isNullOrWhitespace", function () {
        (0, vitest_1.it)("should return true for null, undefined, or whitespace strings", function () {
            (0, vitest_1.expect)((0, interactionHelpers_js_1.isNullOrWhitespace)(null)).toBe(true);
            (0, vitest_1.expect)((0, interactionHelpers_js_1.isNullOrWhitespace)(undefined)).toBe(true);
            (0, vitest_1.expect)((0, interactionHelpers_js_1.isNullOrWhitespace)("")).toBe(true);
            (0, vitest_1.expect)((0, interactionHelpers_js_1.isNullOrWhitespace)(" ")).toBe(true);
        });
        (0, vitest_1.it)("should return false for non-whitespace strings", function () {
            (0, vitest_1.expect)((0, interactionHelpers_js_1.isNullOrWhitespace)("hello")).toBe(false);
            (0, vitest_1.expect)((0, interactionHelpers_js_1.isNullOrWhitespace)(" world ")).toBe(false);
        });
    });
    (0, vitest_1.describe)("createEphemeralResponse", function () {
        (0, vitest_1.it)("should create an ephemeral response", function () {
            var response = (0, interactionHelpers_js_1.createEphemeralResponse)("Hello, world!");
            (0, vitest_1.expect)(response).toEqual({
                type: v10_1.InteractionResponseType.ChannelMessageWithSource,
                data: {
                    content: "Hello, world!",
                    flags: v10_1.MessageFlags.Ephemeral,
                },
            });
        });
    });
    (0, vitest_1.describe)("getOptionValue", function () {
        (0, vitest_1.it)("should return the value of the specified option", function () {
            var components = [
                {
                    name: "option1",
                    type: v10_2.ApplicationCommandOptionType.String,
                    value: "value1",
                },
                {
                    name: "option2",
                    type: v10_2.ApplicationCommandOptionType.String,
                    value: "value2",
                },
            ];
            var value = (0, interactionHelpers_js_1.getOptionValue)(components, "option1");
            (0, vitest_1.expect)(value).toBe("value1");
            var value2 = (0, interactionHelpers_js_1.getOptionValue)(components, "option2");
            (0, vitest_1.expect)(value2).toBe("value2");
        });
        (0, vitest_1.it)("should return undefined if the specified option is not found", function () {
            var components = [
                {
                    name: "option1",
                    type: v10_2.ApplicationCommandOptionType.String,
                    value: "value1",
                },
            ];
            var value = (0, interactionHelpers_js_1.getOptionValue)(components, "option2");
            (0, vitest_1.expect)(value).toBeUndefined();
        });
        (0, vitest_1.it)("should return undefined if components is undefined", function () {
            var value = (0, interactionHelpers_js_1.getOptionValue)(undefined, "option1");
            (0, vitest_1.expect)(value).toBeUndefined();
        });
        (0, vitest_1.it)("should return undefined if components is null", function () {
            var value = (0, interactionHelpers_js_1.getOptionValue)(null, "option1");
            (0, vitest_1.expect)(value).toBeUndefined();
        });
    });
});
