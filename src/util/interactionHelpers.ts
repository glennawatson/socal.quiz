import {
  type APIApplicationCommandInteractionDataOption,
  type APIInteractionResponse,
  ApplicationCommandOptionType,
  InteractionResponseType,
  MessageFlags,
  type APIModalSubmissionComponent,
  ComponentType,
} from "discord-api-types/v10";

/**
 * Creates an ephemeral error response from an Error object.
 *
 * @param error - The error to create a response for.
 * @returns An ephemeral interaction response containing the error message.
 */
export function generateErrorResponse(error: Error): APIInteractionResponse {
  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      content: error.message,
      flags: MessageFlags.Ephemeral,
    },
  };
}

/**
 * Creates an ephemeral error response indicating a missing command option.
 *
 * @param optionName - The name of the missing option.
 * @returns An ephemeral interaction response indicating the missing option.
 */
export function generateOptionMissingErrorResponse(
  optionName: string,
): APIInteractionResponse {
  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      content: `The ${optionName} was not specified!`,
      flags: MessageFlags.Ephemeral,
    },
  };
}

/**
 * Returns true if the input is null, undefined, or contains only whitespace.
 *
 * @param input - The string to check.
 * @returns True if the input is null, undefined, or whitespace-only.
 */
export function isNullOrWhitespace(input: string | null | undefined): boolean {
  return !input || input.trim().length === 0;
}

/**
 * Creates an ephemeral Discord interaction response with the given content.
 *
 * @param content - The message content.
 * @returns An ephemeral interaction response.
 */
export function createEphemeralResponse(
  content: string,
): APIInteractionResponse {
  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      content,
      flags: MessageFlags.Ephemeral,
    },
  };
}

/**
 * Extracts a text input value from a modal submission's components by custom ID.
 * Searches through action rows to find the matching component.
 *
 * @param components - The modal submission components to search.
 * @param customId - The custom ID to match.
 * @returns The value of the matching component, or undefined if not found.
 */
export function getComponentValue(
  components: APIModalSubmissionComponent[],
  customId: string,
): string | undefined {
  for (const row of components) {
    if (row.type === ComponentType.ActionRow) {
      for (const component of row.components) {
        if (component.custom_id === customId) {
          return component.value;
        }
      }
    }
  }
  return undefined;
}

/**
 * Extracts a numeric text input value from a modal submission's components.
 * Returns undefined if the component is not found or the value is empty.
 *
 * @param components - The modal submission components to search.
 * @param customId - The custom ID to match.
 * @returns The parsed numeric value, or undefined if not found or empty.
 */
export function getComponentValueNumber(
  components: APIModalSubmissionComponent[],
  customId: string,
): number | undefined {
  const value: string | undefined = getComponentValue(components, customId);
  return value ? parseInt(value, 10) : undefined;
}

/**
 * Extracts a string option value from a slash command's resolved options.
 * Only matches options of type String.
 *
 * @param components - The interaction data options to search.
 * @param customId - The option name to match.
 * @returns The string value of the matching option, or undefined if not found.
 */
export function getOptionValue(
  components: APIApplicationCommandInteractionDataOption[] | undefined,
  customId: string,
): string | undefined {
  if (!components) {
    return undefined;
  }
  for (const component of components) {
    if (
      component.name === customId &&
      component.type === ApplicationCommandOptionType.String
    ) {
      return component.value;
    }
  }
  return undefined;
}
