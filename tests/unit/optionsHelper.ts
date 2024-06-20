import {
    APIChatInputApplicationCommandInteraction, ApplicationCommandOptionType,
    ApplicationCommandType,
    ChannelType,
    InteractionType
} from "discord-api-types/v10";

export function generateBankOptions(guildId: string | undefined, bankName: string)
{
    const interaction: APIChatInputApplicationCommandInteraction = {
        guild_id: guildId,
        channel_id: 'channel-id',
        channel: {id: 'channel-id', type: ChannelType.GuildVoice},
        id: 'next_question',
        application_id: '',
        type: InteractionType.ApplicationCommand,
        token: '',
        version: 1,
        app_permissions: '',
        locale: 'en-US',
        entitlements: [],
        authorizing_integration_owners: {},
        data: {
            id: 'data',
            type: ApplicationCommandType.ChatInput,
            name: '',
            options: [{name: 'bankname', value: bankName, type: ApplicationCommandOptionType.String}]
        }
    };

    return interaction;
}