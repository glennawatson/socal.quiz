"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateBankOptions = generateBankOptions;
var v10_1 = require("discord-api-types/v10");
function generateBankOptions(guildId, bankName) {
    var interaction = {
        guild_id: guildId,
        channel_id: "channel-id",
        channel: { id: "channel-id", type: v10_1.ChannelType.GuildVoice },
        id: "next_question",
        application_id: "",
        type: v10_1.InteractionType.ApplicationCommand,
        token: "",
        version: 1,
        app_permissions: "",
        locale: "en-US",
        entitlements: [],
        authorizing_integration_owners: {},
        data: {
            id: "data",
            type: v10_1.ApplicationCommandType.ChatInput,
            name: "",
            options: [
                {
                    name: "bankname",
                    value: bankName,
                    type: v10_1.ApplicationCommandOptionType.String,
                },
            ],
        },
    };
    return interaction;
}
