import { describe, it, expect } from "vitest";
import { InteractionResponseType, MessageFlags } from "discord-api-types/v10";
import {
  generateErrorResponse,
  generateOptionMissingErrorResponse,
  isNullOrWhitespace,
  createEphemeralResponse,
  getOptionValue,
} from "../../src/util/interactionHelpers";
import {
  ApplicationCommandOptionType,
  APIApplicationCommandInteractionDataOption,
} from "discord-api-types/v10";

describe("interactionHelpers", () => {
  describe("generateErrorResponse", () => {
    it("should generate an error response", () => {
      const error = new Error("Something went wrong");
      const response = generateErrorResponse(error);

      expect(response).toEqual({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: "Something went wrong",
          flags: MessageFlags.Ephemeral,
        },
      });
    });
  });

  describe("generateOptionMissingErrorResponse", () => {
    it("should generate a missing option error response", () => {
      const response = generateOptionMissingErrorResponse("optionName");

      expect(response).toEqual({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: "The optionName was not specified!",
          flags: MessageFlags.Ephemeral,
        },
      });
    });
  });

  describe("isNullOrWhitespace", () => {
    it("should return true for null, undefined, or whitespace strings", () => {
      expect(isNullOrWhitespace(null)).toBe(true);
      expect(isNullOrWhitespace(undefined)).toBe(true);
      expect(isNullOrWhitespace("")).toBe(true);
      expect(isNullOrWhitespace(" ")).toBe(true);
    });

    it("should return false for non-whitespace strings", () => {
      expect(isNullOrWhitespace("hello")).toBe(false);
      expect(isNullOrWhitespace(" world ")).toBe(false);
    });
  });

  describe("createEphemeralResponse", () => {
    it("should create an ephemeral response", () => {
      const response = createEphemeralResponse("Hello, world!");

      expect(response).toEqual({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: "Hello, world!",
          flags: MessageFlags.Ephemeral,
        },
      });
    });
  });

  describe("getOptionValue", () => {
    it("should return the value of the specified option", () => {
      const components: APIApplicationCommandInteractionDataOption[] = [
        {
          name: "option1",
          type: ApplicationCommandOptionType.String,
          value: "value1",
        },
        {
          name: "option2",
          type: ApplicationCommandOptionType.String,
          value: "value2",
        },
      ];

      const value = getOptionValue(components, "option1");
      expect(value).toBe("value1");

      const value2 = getOptionValue(components, "option2");
      expect(value2).toBe("value2");
    });

    it("should return undefined if the specified option is not found", () => {
      const components: APIApplicationCommandInteractionDataOption[] = [
        {
          name: "option1",
          type: ApplicationCommandOptionType.String,
          value: "value1",
        },
      ];

      const value = getOptionValue(components, "option2");
      expect(value).toBeUndefined();
    });

    it("should return undefined if components is undefined", () => {
      const value = getOptionValue(undefined, "option1");
      expect(value).toBeUndefined();
    });

    it("should return undefined if components is null", () => {
      const value = getOptionValue(null as any, "option1");
      expect(value).toBeUndefined();
    });
  });
});
