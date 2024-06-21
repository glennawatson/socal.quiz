import {
  APIApplicationCommandInteractionDataOption,
  APIInteractionResponse,
  ApplicationCommandOptionType,
  InteractionResponseType,
  MessageFlags,
  ModalSubmitActionRowComponent,
} from "discord-api-types/v10";

export function generateErrorResponse(error: Error): APIInteractionResponse {
  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      content: error.message,
      flags: MessageFlags.Ephemeral,
    },
  };
}

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

export function isNullOrWhitespace(input: string | null | undefined): boolean {
  return !input || input.trim().length === 0;
}

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

export function getComponentValue(
  components: ModalSubmitActionRowComponent[],
  customId: string,
) {
  for (const row of components) {
    for (const component of row.components) {
      if (component.custom_id === customId) {
        return component.value;
      }
    }
  }
  return undefined;
}

export function getComponentValueNumber(
  components: ModalSubmitActionRowComponent[],
  customId: string,
): number | undefined {
  const value = getComponentValue(components, customId);
  return value ? parseInt(value, 10) : undefined; // Use parseFloat if you expect a float value
}

export function getOptionValue(
  components: APIApplicationCommandInteractionDataOption[] | undefined,
  customId: string,
) {
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

export function getOptionValueNumber(
  components: APIApplicationCommandInteractionDataOption[],
  customId: string,
): number | undefined {
  for (const component of components) {
    if (
      component.name === customId &&
      component.type === ApplicationCommandOptionType.Number
    ) {
      return component.value;
    }
  }
  return undefined;
}
