import {
  APIApplicationCommandInteractionDataOption,
  APIInteractionResponse,
  ApplicationCommandOptionType,
  InteractionResponseType,
  MessageFlags,
} from "discord-api-types/v10";

declare global {
  interface Array<T> {
    getStringOption(this: T[], optionName: string): string | null;
  }
}

export function generateErrorResponse(error: Error): APIInteractionResponse {
  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      content: error.message,
      flags: MessageFlags.Ephemeral,
    },
  };
}

export function createChannelMessageResponse(
  content: string,
): APIInteractionResponse {
  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      content,
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

Array.prototype.getStringOption = function (optionName: string) {
  const option = this.find((opt) => opt.name === optionName);

  if (!option) {
    throw new Error(`The ${optionName} was not specified!`);
  }

  if (option.type !== ApplicationCommandOptionType.String) {
    throw new Error(
      `The ${optionName} was not specified correctly as a string!`,
    );
  }

  return option.value as string;
};

export function getStringOption(
  options: APIApplicationCommandInteractionDataOption[] | undefined,
  optionName: string,
): string | null {
  const option = options?.find((opt) => opt.name === optionName);

  if (!option) {
    throw new Error(`The ${optionName} was not specified!`);
  }

  if (option.type !== ApplicationCommandOptionType.String) {
    throw new Error(
      `The ${optionName} was not specified correctly as a string!`,
    );
  }

  return option.value as string;
}
