import { describe, it, expect, vi, beforeEach } from 'vitest';
import {DiscordBotService} from "../../src/handlers/discordBotService";
import {StopQuizCommand} from "../../src/handlers/actions/stopQuizCommand";
import {
    APIChatInputApplicationCommandInteraction,
    ApplicationCommandType,
    ChannelType,
    InteractionType
} from "discord-api-types/v10";
import {createEphemeralResponse, generateOptionMissingErrorResponse} from "../../src/util/interactionHelpers";

describe('StopQuizCommand', () => {
    let discordBotServiceMock: DiscordBotService;
    let stopQuizCommand: StopQuizCommand;

    beforeEach(() => {
        discordBotServiceMock = {
            getQuizManager: vi.fn(),
        } as unknown as DiscordBotService;

        stopQuizCommand = new StopQuizCommand(discordBotServiceMock);
    });

    describe('data', () => {
        it('should return the correct command data', () => {
            const commandData = stopQuizCommand.data();
            expect(commandData.name).toBe('stop_quiz');
        });
    });

    describe('execute', () => {
        it('should stop the quiz and return a confirmation message', async () => {
            const quizManagerMock = {
                stopQuiz: vi.fn(),
            };

            discordBotServiceMock.getQuizManager = vi.fn().mockResolvedValue(quizManagerMock);

            const interaction: APIChatInputApplicationCommandInteraction = {
                guild_id: 'guild-id',
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
                data: { id: 'data', type: ApplicationCommandType.ChatInput, name: '' }
            };

            const response = await stopQuizCommand.execute(interaction);

            expect(quizManagerMock.stopQuiz).toHaveBeenCalledWith('channel-id');
            expect(response).toEqual(createEphemeralResponse('Stopped quiz'));
        });

        it('should return an error if the guild id is missing', async () => {
            const interaction = {
                guild_id: null,
            } as unknown as APIChatInputApplicationCommandInteraction;

            const response = await stopQuizCommand.execute(interaction);

            expect(response).toEqual(generateOptionMissingErrorResponse('guild id'));
        });
    });
});
