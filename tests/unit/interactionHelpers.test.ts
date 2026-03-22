import { describe, it, expect } from "vitest";
import { InteractionResponseType, MessageFlags, ComponentType } from "discord-api-types/v10";
import {
  generateErrorResponse,
  generateOptionMissingErrorResponse,
  isNullOrWhitespace,
  createEphemeralResponse,
  getOptionValue,
  getComponentValue,
  getComponentValueNumber,
} from "../../src/util/interactionHelpers.js";
import {
  ApplicationCommandOptionType,
  APIApplicationCommandInteractionDataOption,
  APIModalSubmissionComponent,
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

  describe("getComponentValue", () => {
    it("should return the value of a matching component", () => {
      const components: APIModalSubmissionComponent[] = [
        {
          type: ComponentType.ActionRow,
          components: [
            {
              type: ComponentType.TextInput,
              custom_id: "test_id",
              value: "test_value",
            },
          ],
        },
      ];

      expect(getComponentValue(components, "test_id")).toBe("test_value");
    });

    it("should return undefined if no matching component is found", () => {
      const components: APIModalSubmissionComponent[] = [
        {
          type: ComponentType.ActionRow,
          components: [
            {
              type: ComponentType.TextInput,
              custom_id: "other_id",
              value: "other_value",
            },
          ],
        },
      ];

      expect(getComponentValue(components, "nonexistent_id")).toBeUndefined();
    });

    it("should return undefined for empty components array", () => {
      expect(getComponentValue([], "test_id")).toBeUndefined();
    });
  });

  describe("getComponentValueNumber", () => {
    it("should return a parsed number for a matching component", () => {
      const components: APIModalSubmissionComponent[] = [
        {
          type: ComponentType.ActionRow,
          components: [
            {
              type: ComponentType.TextInput,
              custom_id: "timeout",
              value: "42",
            },
          ],
        },
      ];

      expect(getComponentValueNumber(components, "timeout")).toBe(42);
    });

    it("should return undefined when no matching component is found", () => {
      const components: APIModalSubmissionComponent[] = [
        {
          type: ComponentType.ActionRow,
          components: [
            {
              type: ComponentType.TextInput,
              custom_id: "other",
              value: "10",
            },
          ],
        },
      ];

      expect(getComponentValueNumber(components, "timeout")).toBeUndefined();
    });

    it("should return undefined when value is empty string", () => {
      const components: APIModalSubmissionComponent[] = [
        {
          type: ComponentType.ActionRow,
          components: [
            {
              type: ComponentType.TextInput,
              custom_id: "timeout",
              value: "",
            },
          ],
        },
      ];

      expect(getComponentValueNumber(components, "timeout")).toBeUndefined();
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

    it("should return undefined if option name matches but type is not String", () => {
      const components: APIApplicationCommandInteractionDataOption[] = [
        {
          name: "option1",
          type: ApplicationCommandOptionType.Integer,
          value: 42,
        } as any,
      ];

      const value = getOptionValue(components, "option1");
      expect(value).toBeUndefined();
    });
  });
});
