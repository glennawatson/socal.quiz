import {
  APIApplicationCommandInteractionDataStringOption,
  APIChatInputApplicationCommandInteraction,
  APIModalSubmitInteraction,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ChannelType,
  ComponentType,
  GuildMemberFlags,
  InteractionType,
} from "discord-api-types/v10";

class InteractionGenerator {
  static generateModalSubmit(
    guildId: string,
    bankName: string,
    question: string,
    answersInput: string[],
    correctAnswerIndex: number | string | undefined,
  ): APIModalSubmitInteraction {
    const answers = answersInput.map((answer, index) => ({
      type: ComponentType.TextInput,
      custom_id: `answer${index + 1}`,
      value: answer,
    }));

    return {
      guild_id: guildId,
      channel_id: "channel-id",
      channel: { id: "channel-id", type: ChannelType.GuildVoice },
      id: "add_question_modal",
      application_id: "",
      type: InteractionType.ModalSubmit,
      token: "",
      version: 1,
      app_permissions: "",
      locale: "en-US",
      entitlements: [],
      authorizing_integration_owners: {},
      data: {
        custom_id: "add-question-modal",
        components: [
          {
            type: ComponentType.ActionRow,
            components: [
              {
                type: ComponentType.TextInput,
                custom_id: "questionText",
                value: question,
              },
              ...answers,
              {
                type: ComponentType.TextInput,
                custom_id: "correctAnswerIndex",
                value: correctAnswerIndex?.toString() ?? "",
              },
              {
                type: ComponentType.TextInput,
                custom_id: "bankname",
                value: bankName,
              },
            ],
          },
        ],
      },
    };
  }

  static generateAddQuestionOptions(
    userId: string,
    bankName: string,
    question: string,
    inputAnswers: string[],
    correctAnswerIndex: number,
  ): APIChatInputApplicationCommandInteraction {
    const answers: APIApplicationCommandInteractionDataStringOption[] =
      inputAnswers.map((answer, index) => ({
        name: `answer${index + 1}`,
        type: ApplicationCommandOptionType.String,
        value: answer,
      }));

    return {
      app_permissions: "",
      authorizing_integration_owners: {},
      channel: { id: "channel-id", type: ChannelType.GuildVoice },
      entitlements: [],
      locale: "en-US",
      version: 1,
      type: InteractionType.ApplicationCommand,
      data: {
        id: "command-id",
        name: "add_question",
        options: [
          {
            name: "bankname",
            type: ApplicationCommandOptionType.String,
            value: bankName,
          },
          {
            name: "question",
            type: ApplicationCommandOptionType.String,
            value: question,
          },
          ...answers,
          {
            name: "correctanswer",
            type: ApplicationCommandOptionType.Integer,
            value: correctAnswerIndex,
          },
        ],
        resolved: {},
        type: ApplicationCommandType.ChatInput,
      },
      guild_id: userId,
      channel_id: "channel-id",
      member: {
        user: {
          id: userId,
          username: "username",
          discriminator: "0001",
          avatar: "avatar-hash",
          global_name: userId,
        },
        roles: [],
        premium_since: null,
        permissions: "0",
        pending: false,
        mute: false,
        deaf: false,
        joined_at: "",
        flags: GuildMemberFlags.CompletedOnboarding,
      },
      token: "interaction-token",
      id: "interaction-id",
      application_id: "application-id",
    };
  }

  static generateBankOptions(
    userId: string,
    bankName: string,
  ): APIChatInputApplicationCommandInteraction {
    return {
      app_permissions: "",
      authorizing_integration_owners: {},
      channel: { id: "channel-id", type: ChannelType.GuildVoice },
      entitlements: [],
      locale: "en-US",
      version: 1,
      type: InteractionType.ApplicationCommand,
      data: {
        id: "command-id",
        name: "start_quiz",
        options: [
          {
            name: "bankname",
            type: ApplicationCommandOptionType.String,
            value: bankName,
          },
        ],
        resolved: {},
        type: ApplicationCommandType.ChatInput,
      },
      guild_id: userId,
      channel_id: "channel-id",
      member: {
        user: {
          id: userId,
          username: "username",
          discriminator: "0001",
          avatar: "avatar-hash",
          global_name: userId,
        },
        roles: [],
        premium_since: null,
        permissions: "0",
        pending: false,
        mute: false,
        deaf: false,
        joined_at: "",
        flags: GuildMemberFlags.CompletedOnboarding,
      },
      token: "interaction-token",
      id: "interaction-id",
      application_id: "application-id",
    };
  }

  static generateStopQuizOptions(
    userId: string,
  ): APIChatInputApplicationCommandInteraction {
    return {
      app_permissions: "",
      authorizing_integration_owners: {},
      channel: { id: "channel-id", type: ChannelType.GuildVoice },
      entitlements: [],
      locale: "en-US",
      version: 1,
      type: InteractionType.ApplicationCommand,
      data: {
        id: "command-id",
        name: "stop_quiz",
        options: [],
        resolved: {},
        type: ApplicationCommandType.ChatInput,
      },
      guild_id: userId,
      channel_id: "channel-id",
      member: {
        user: {
          id: userId,
          username: "username",
          discriminator: "0001",
          avatar: "avatar-hash",
          global_name: userId,
        },
        roles: [],
        premium_since: null,
        permissions: "0",
        pending: false,
        mute: false,
        deaf: false,
        joined_at: "",
        flags: GuildMemberFlags.CompletedOnboarding,
      },
      token: "interaction-token",
      id: "interaction-id",
      application_id: "application-id",
    };
  }
}

export default InteractionGenerator;
