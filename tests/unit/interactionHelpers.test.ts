import { describe, it, expect } from "vitest";
import { InteractionResponseType, MessageFlags } from "discord-api-types/v10";
import {
  generateErrorResponse,
  generateOptionMissingErrorResponse,
  isNullOrWhitespace,
  createEphemeralResponse,
} from "../../src/util/interactionHelpers";

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
});
