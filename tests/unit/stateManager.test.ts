import {describe, it, expect, vi, beforeEach, afterEach, Mock} from 'vitest';
import {TableClient, TableEntity} from "@azure/data-tables";
import {QuizState} from "../../src/handlers/quizState.interfaces";
import {StateManager} from "../../src/util/stateManager";

vi.mock("@azure/data-tables");

describe('StateManager', () => {
    let mockTableClient: TableClient;
    let quizState: QuizState;
    let tableEntity: TableEntity<QuizState>;
    let stateManager: StateManager;
    let mockTableGetEntity : Mock<any, any>;
    let connectionString: string;

    beforeEach(() => {
        mockTableGetEntity = vi.fn();

        mockTableClient = {
            getEntity: mockTableGetEntity,
            upsertEntity: vi.fn(),
            deleteEntity: vi.fn(),
        } as unknown as TableClient;

        quizState = {
            guildId: "guild123",
            channelId: "channel456",
            activeUsers: new Map(),
            answeredUsersForQuestion: new Set(),
            questionBank: [],
            correctUsersForQuestion: new Set(),
            currentQuestionId: null
        };

        tableEntity = {
            partitionKey: quizState.guildId,
            rowKey: quizState.channelId,
            activeUsers: quizState.activeUsers,
            answeredUsersForQuestion: quizState.answeredUsersForQuestion,
            questionBank: quizState.questionBank,
            correctUsersForQuestion: quizState.correctUsersForQuestion,
            currentQuestionId: quizState.currentQuestionId,
            guildId: quizState.guildId,
            channelId: quizState.channelId
        };

        stateManager = new StateManager(undefined, mockTableClient);
        connectionString = "DefaultEndpointsProtocol=https;AccountName=accountName;AccountKey=accountKey;EndpointSuffix=core.windows.net";
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should throw an error if no connection string or client is provided', () => {
        expect(() => new StateManager()).toThrow("Must have a valid connection string");
    });

    it('should initialize with connection string if no client is provided', () => {
        const stateManager = new StateManager(connectionString);
        expect(stateManager).toBeInstanceOf(StateManager);
        expect(TableClient.fromConnectionString).toHaveBeenCalledWith(connectionString, "QuizStateTable");
    });

    it('should get state from the table', async () => {
        mockTableGetEntity.mockResolvedValueOnce(tableEntity);
        const state = await stateManager.getState("guild123", "channel456");
        expect(state).toEqual(quizState);
        expect(mockTableClient.getEntity).toHaveBeenCalledWith("guild123", "channel456");
    });

    it('should set state in the table', async () => {
        await stateManager.setState(quizState);
        expect(mockTableClient.upsertEntity).toHaveBeenCalledWith(tableEntity, "Merge");
    });

    it('should delete state from the table', async () => {
        await stateManager.deleteState("guild123", "channel456");
        expect(mockTableClient.deleteEntity).toHaveBeenCalledWith("guild123", "channel456");
    });
});
