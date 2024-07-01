import {beforeEach, describe, expect, it, vi} from "vitest";
import {HttpRequest, InvocationContext} from "@azure/functions";
import {
    APIApplicationCommandInteraction,
    APIPingInteraction,
    ApplicationCommandType,
    ChannelType,
    InteractionResponseType,
    InteractionType,
} from "discord-api-types/v10";
import {interactions} from "../../src/functions/lambdaHttpTrigger.js";
import {Config} from "../../src/util/config.js";
import {QuestionStorage} from "../../src/util/questionStorage.js";
import {GuildStorage} from "../../src/util/guildStorage.js";
import {DiscordBotService} from "../../src/handlers/discordBotService.js";
import {TableClient} from "@azure/data-tables";
import {verify} from "discord-verify";
import {StateManager} from "../../src/handlers/stateManager.js";
import {QuizImageStorage} from "../../src/util/quizImageStorage.js";
import {QuizManagerFactoryManager} from "../../src/handlers/quizManagerFactoryManager.js";
import {MockQuizManager} from "./mocks/mockQuizManager.js";

// Mock implementations
// Mocking durable-functions
vi.mock("durable-functions", async () => {
    const originalModule = await vi.importActual("durable-functions");
    return {
        ...originalModule,
        getClient: vi.fn().mockReturnValue({
            extraInputs: vi.fn(),
            startNew: vi.fn(),
            getStatus: vi.fn(),
            terminate: vi.fn(),
            purge: vi.fn()
        })
    };
});
vi.mock("@azure/data-tables", () => {
    const tableClientMock = {
        getEntity: vi.fn(),
        createEntity: vi.fn(),
        listEntities: vi.fn().mockReturnValue({
            next: vi.fn().mockResolvedValue({done: true, value: undefined}),
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

vi.mock("@azure/storage-blob", () => {
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
            toString: vi.fn().mockReturnValue("sas-token"),
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

const createMockHttpRequest = (
    body: any,
    headers: Record<string, string> = {},
): HttpRequest =>
    ({
        method: "POST",
        url: "http://localhost:7071/api/interactions",
        headers: new Map(Object.entries(headers)),
        text: async () => JSON.stringify(body),
    }) as unknown as HttpRequest;

const createMockInvocationContext = (): InvocationContext =>
    ({
        log: vi.fn(),
    }) as unknown as InvocationContext;

describe("interactions function", () => {
    let tableClientMock: TableClient;

    beforeEach(async () => {
        // Reset mocks and stubs
        vi.clearAllMocks();

        // Re-initialize mocks
        tableClientMock = {
            getEntity: vi.fn(),
            createEntity: vi.fn(),
            listEntities: vi.fn().mockReturnValue({
                next: vi.fn().mockResolvedValue({done: true, value: undefined}),
                [Symbol.asyncIterator]() {
                    return this;
                },
            }),
            deleteEntity: vi.fn(),
            upsertEntity: vi.fn(),
        } as any as TableClient;

        const imageClient: QuizImageStorage = {
            getQuestionImagePresignedUrl: vi.fn(),
            getExplanationImagePresignedUrl: vi.fn(),
            getPresignedUrl: vi.fn(),
            downloadAndValidateImageForDiscord: vi.fn()
        } as any as QuizImageStorage;


        await Config.initialize(
            undefined,
            "test-token",
            "test-client-id",
            "test-public-key",
            new QuestionStorage(
                imageClient,
                "test1",
                tableClientMock),
            new GuildStorage(undefined, tableClientMock as unknown as TableClient),
            imageClient,
            new StateManager(undefined, tableClientMock as unknown as TableClient),
            new QuizManagerFactoryManager(() => new MockQuizManager()),
            mockDiscordBotService as unknown as DiscordBotService,
        );
    });

    it("should return 401 for invalid request signature", async () => {
        verifyMock.mockReturnValue(Promise.resolve(false));

        const request = createMockHttpRequest(
            {},
            {
                "x-signature-ed25519": "invalid-signature",
                "x-signature-timestamp": "timestamp",
            },
        );
        const context = createMockInvocationContext();

        const response = await interactions(request, context);

        expect(response.status).toBe(401);
        expect(response.body).toBe("Invalid request signature");
    });

    it("should return Pong for PING interaction", async () => {
        verifyMock.mockReturnValue(Promise.resolve(true));

        const interaction: APIPingInteraction = {
            app_permissions: "",
            application_id: "",
            authorizing_integration_owners: {},
            entitlements: [],
            id: "",
            token: "",
            type: InteractionType.Ping,
            version: 1,
        };

        const request = createMockHttpRequest(interaction, {
            "x-signature-ed25519": "valid-signature",
            "x-signature-timestamp": "timestamp",
        });
        const context = createMockInvocationContext();

        const response = await interactions(request, context);

        expect(response.status).toBe(200);
        expect(response.body).toBe(
            JSON.stringify({type: InteractionResponseType.Pong}),
        );
    });

    it("should delegate to DiscordBotService for other interactions", async () => {
        verifyMock.mockReturnValue(Promise.resolve(true));

        const interaction: APIApplicationCommandInteraction = {
            channel: {id: "channel-id", type: ChannelType.GuildVoice},
            type: InteractionType.ApplicationCommand,
            id: "interaction-id",
            application_id: "application-id",
            guild_id: "guild-id",
            token: "interaction-token",
            entitlements: [],
            authorizing_integration_owners: {},
            version: 1,
            data: {
                id: "command-id",
                name: "test-command",
                type: ApplicationCommandType.Message,
                target_id: "target-id",
                resolved: {
                    messages: {
                        "message-id": {
                            id: "message-id",
                            channel_id: "channel-id",
                            author: {
                                id: "user-id",
                                username: "username",
                                discriminator: "0001",
                                avatar: null,
                                global_name: "username",
                            },
                            content: "test message",
                            timestamp: "2021-01-01T00:00:00Z",
                            edited_timestamp: null,
                            tts: false,
                            mention_everyone: false,
                            mentions: [],
                            mention_roles: [],
                            attachments: [],
                            embeds: [],
                            reactions: [],
                            pinned: false,
                            webhook_id: "webhook-id",
                            type: 0,
                            activity: undefined,
                            application: undefined,
                            application_id: "application-id",
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
                id: "user-id",
                username: "username",
                discriminator: "0001",
                avatar: null,
                global_name: "username",
            },
            app_permissions: "0",
            channel_id: "channel-id",
            locale: "en-US",
            guild_locale: "en-US",
        };

        const mockResponse = {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {content: "Response from bot"},
        };
        handleInteractionMock.mockResolvedValue(mockResponse);

        const request = createMockHttpRequest(interaction, {
            "x-signature-ed25519": "valid-signature",
            "x-signature-timestamp": "timestamp",
        });
        const context = createMockInvocationContext();

        const response = await interactions(request, context);

        expect(response.status).toBe(200);
        expect(response.headers).toEqual({"Content-Type": "application/json"});
        expect(response.body).toBe(JSON.stringify(mockResponse));
        expect(handleInteractionMock).toHaveBeenCalledWith(interaction);
    });
});
