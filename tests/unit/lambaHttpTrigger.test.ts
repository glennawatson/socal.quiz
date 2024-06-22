import {beforeEach, describe, expect, it, vi} from 'vitest';
import {HttpRequest, InvocationContext} from "@azure/functions";
import {
    APIApplicationCommandInteraction,
    APIPingInteraction,
    ApplicationCommandType,
    ChannelType,
    InteractionResponseType,
    InteractionType
} from "discord-api-types/v10";
import {interactions} from "../../src/functions/lambdaHttpTrigger";
import { Config } from '../../src/functions/config';
import {QuestionStorage} from "../../src/util/questionStorage";
import {GuildStorage} from "../../src/util/guildStorage";
import {DiscordBotService} from "../../src/handlers/discordBotService";
import {TableClient} from "@azure/data-tables";
import {BlobServiceClient} from "@azure/storage-blob"; // Adjust the path as needed
import { verify } from "discord-verify";

// Mock implementations
vi.mock('@azure/data-tables', () => {
    const tableClientMock = {
        getEntity: vi.fn(),
        createEntity: vi.fn(),
        listEntities: vi.fn().mockReturnValue({
            next: vi.fn().mockResolvedValue({ done: true, value: undefined }),
            [Symbol.asyncIterator]() {
                return this;
            },
        }),
        deleteEntity: vi.fn(),
        upsertEntity: vi.fn(),
    };
    return {
        TableClient: {
            fromConnectionString: vi.fn().mockReturnValue(tableClientMock),
        },
    };
});

vi.mock('@azure/storage-blob', () => {
    const blobServiceClientMock = {
        getContainerClient: vi.fn().mockReturnValue({
            getBlockBlobClient: vi.fn().mockReturnValue({
                uploadData: vi.fn(),
            }),
        }),
    };
    return {
        BlobServiceClient: {
            fromConnectionString: vi.fn().mockReturnValue(blobServiceClientMock),
        },
        BlobSASPermissions: {
            parse: vi.fn(),
        },
        generateBlobSASQueryParameters: vi.fn().mockReturnValue({
            toString: vi.fn().mockReturnValue('sas-token'),
        }),
        StorageSharedKeyCredential: vi.fn(),
    };
});

// Mock the verifyKey function directly
vi.mock("discord-verify", () => ({
    verify: vi.fn(),
}));

// Store the mocked verifyKey in a variable
const verifyMock = vi.mocked(verify);

const handleInteractionMock = vi.fn();
const mockDiscordBotService = {
    handleInteraction: handleInteractionMock,
};

const createMockHttpRequest = (body: any, headers: Record<string, string> = {}): HttpRequest => ({
    method: 'POST',
    url: 'http://localhost:7071/api/interactions',
    headers: new Map(Object.entries(headers)),
    text: async () => JSON.stringify(body),
} as unknown as HttpRequest);

const createMockInvocationContext = (): InvocationContext => ({
    log: vi.fn(),
} as unknown as InvocationContext);

describe('interactions function', () => {
    let tableClientMock: any;
    let blobServiceClientMock: any;

    beforeEach(async () => {
        // Reset mocks and stubs
        vi.clearAllMocks();

        // Re-initialize mocks
        tableClientMock = {
            getEntity: vi.fn(),
            createEntity: vi.fn(),
            listEntities: vi.fn().mockReturnValue({
                next: vi.fn().mockResolvedValue({ done: true, value: undefined }),
                [Symbol.asyncIterator]() {
                    return this;
                },
            }),
            deleteEntity: vi.fn(),
            upsertEntity: vi.fn(),
        };

        blobServiceClientMock = {
            getContainerClient: vi.fn().mockReturnValue({
                getBlockBlobClient: vi.fn().mockReturnValue({
                    uploadData: vi.fn(),
                }),
            }),
        };

        await Config.initialize(
            'test-token',
            'test-client-id',
            'test-public-key',
            new QuestionStorage('test1', 'test2', 'test3', tableClientMock as unknown as TableClient, blobServiceClientMock as unknown as BlobServiceClient),
            new GuildStorage(undefined, tableClientMock as unknown as TableClient),
            mockDiscordBotService as unknown as DiscordBotService
        );
    });

    it('should return 401 for invalid request signature', async () => {
        verifyMock.mockReturnValue(Promise.resolve(false));

        const request = createMockHttpRequest({}, { 'x-signature-ed25519': 'invalid-signature', 'x-signature-timestamp': 'timestamp' });
        const context = createMockInvocationContext();

        const response = await interactions(request, context);

        expect(response.status).toBe(401);
        expect(response.body).toBe('Invalid request signature');
    });

    it('should return Pong for PING interaction', async () => {
        verifyMock.mockReturnValue(Promise.resolve(true));

        const interaction: APIPingInteraction = {
            app_permissions: "",
            application_id: "",
            authorizing_integration_owners: {},
            entitlements: [],
            id: "",
            token: "",
            type: InteractionType.Ping,
            version: 1
        };

        const request = createMockHttpRequest(interaction, { 'x-signature-ed25519': 'valid-signature', 'x-signature-timestamp': 'timestamp' });
        const context = createMockInvocationContext();

        const response = await interactions(request, context);

        expect(response.status).toBe(200);
        expect(response.body).toBe(JSON.stringify({ type: InteractionResponseType.Pong }));
    });

    it('should delegate to DiscordBotService for other interactions', async () => {
        verifyMock.mockReturnValue(Promise.resolve(true));

        const interaction: APIApplicationCommandInteraction = {
            channel: {id: 'channel-id', type: ChannelType.GuildVoice},
            type: InteractionType.ApplicationCommand,
            id: 'interaction-id',
            application_id: 'application-id',
            guild_id: 'guild-id',
            token: 'interaction-token',
            entitlements: [],
            authorizing_integration_owners: {},
            version: 1,
            data: {
                id: 'command-id',
                name: 'test-command',
                type: ApplicationCommandType.Message,
                target_id: 'target-id',
                resolved: {
                    messages: {
                        'message-id': {
                            id: 'message-id',
                            channel_id: 'channel-id',
                            author: {
                                id: 'user-id',
                                username: 'username',
                                discriminator: '0001',
                                avatar: null,
                                global_name: 'username',
                            },
                            content: 'test message',
                            timestamp: '2021-01-01T00:00:00Z',
                            edited_timestamp: null,
                            tts: false,
                            mention_everyone: false,
                            mentions: [],
                            mention_roles: [],
                            attachments: [],
                            embeds: [],
                            reactions: [],
                            pinned: false,
                            webhook_id: 'webhook-id',
                            type: 0,
                            activity: undefined,
                            application: undefined,
                            application_id: 'application-id',
                            message_reference: undefined,
                            flags: undefined,
                            referenced_message: undefined,
                            interaction: undefined,
                            thread: undefined,
                            components: [],
                            sticker_items: [],
                        },
                    },
                },
            },
            user: {
                id: 'user-id',
                username: 'username',
                discriminator: '0001',
                avatar: null,
                global_name: 'username',
            },
            app_permissions: '0',
            channel_id: 'channel-id',
            locale: 'en-US',
            guild_locale: 'en-US'
        };

        const mockResponse = { type: InteractionResponseType.ChannelMessageWithSource, data: { content: 'Response from bot' } };
        handleInteractionMock.mockResolvedValue(mockResponse);

        const request = createMockHttpRequest(interaction, { 'x-signature-ed25519': 'valid-signature', 'x-signature-timestamp': 'timestamp' });
        const context = createMockInvocationContext();

        const response = await interactions(request, context);

        expect(response.status).toBe(200);
        expect(response.headers).toEqual({ 'Content-Type': 'application/json' });
        expect(response.body).toBe(JSON.stringify(mockResponse));
        expect(handleInteractionMock).toHaveBeenCalledWith(interaction);
    });
});