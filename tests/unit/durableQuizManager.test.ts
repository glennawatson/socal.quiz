import { describe, it, beforeEach, expect, vi } from "vitest";
import { REST } from "@discordjs/rest";
import {DurableQuizManager} from "../../src/handlers/durableQuizManager.js";
import {IQuestionStorage} from "../../src/util/IQuestionStorage.interfaces.js";
import {DurableClient} from "durable-functions";
import {createEphemeralResponse} from "../../src/util/interactionHelpers.js";
import {InteractionResponseType} from "discord-api-types/v10";
import {QuizState} from "../../src/handlers/quizState.interfaces.js";

describe("DurableQuizManager", () => {
    let durableQuizManager: DurableQuizManager;
    let restMock: REST;
    let quizStateStorageMock: IQuestionStorage;
    let durableClientMock: DurableClient;

    beforeEach(() => {
        restMock = {} as REST;
        quizStateStorageMock = {
            getQuestions: vi.fn(),
            updateQuestion: vi.fn(),
            deleteQuestion: vi.fn(),
            deleteQuestionBank: vi.fn(),
            generateAndAddQuestion: vi.fn(),
            generateQuestion: vi.fn(),
        } as unknown as IQuestionStorage;

        durableClientMock = {
            raiseEvent: vi.fn(),
            startNew: vi.fn(),
            terminate: vi.fn(),
        } as unknown as DurableClient;

        durableQuizManager = new DurableQuizManager(
            restMock,
            quizStateStorageMock,
            durableClientMock
        );
    });

    describe("answerInteraction", () => {
        it("should return an ephemeral response if instanceId is missing", async () => {
            const response = await durableQuizManager.answerInteraction(
                "",
                "",
                "user123",
                "answer123"
            );
            expect(response).toEqual(
                createEphemeralResponse("No active quiz could be found")
            );
        });

        it("should raise an event with correct data", async () => {
            const response = await durableQuizManager.answerInteraction(
                "guild123",
                "channel123",
                "user123",
                "answer123"
            );

            expect(durableClientMock.raiseEvent).toHaveBeenCalledWith(
                "guild123-channel123",
                "answerQuestion",
                { userId: "user123", selectedAnswerId: "answer123" },
                {}
            );
            expect(response).toEqual({
                type: InteractionResponseType.DeferredChannelMessageWithSource,
            });
        });

        it("should return an ephemeral response if an error occurs", async () => {
            durableClientMock.raiseEvent = vi.fn().mockRejectedValue(new Error("Error"));
            const response = await durableQuizManager.answerInteraction(
                "guild123",
                "channel123",
                "user123",
                "answer123"
            );
            expect(response).toEqual(
                createEphemeralResponse("There was a error submitting your answer.")
            );
        });
    });

    describe("stopQuiz", () => {
        it("should return if instanceId is missing", async () => {
            const consoleErrorSpy = vi.spyOn(console, "error");
            await durableQuizManager.stopQuiz("", "");

            expect(consoleErrorSpy).toHaveBeenCalledWith('could not find a valid guild or channel id');
            expect(durableClientMock.raiseEvent).not.toHaveBeenCalled();
            expect(durableClientMock.terminate).not.toHaveBeenCalled();
        });

        it("should raise a cancelQuiz event", async () => {
            await durableQuizManager.stopQuiz("guild123", "channel123");
            expect(durableClientMock.raiseEvent).toHaveBeenCalledWith(
                "guild123-channel123",
                "cancelQuiz",
                {}
            );
        });

        it("should terminate the quiz if raising event fails", async () => {
            durableClientMock.raiseEvent = vi.fn().mockRejectedValue(new Error("Error"));
            await durableQuizManager.stopQuiz("guild123", "channel123");
            expect(durableClientMock.terminate).toHaveBeenCalledWith(
                "guild123-channel123",
                "Quiz stopped"
            );
        });
    });

    describe("runQuiz", () => {
        it("should return if instanceId is missing", async () => {
            const consoleErrorSpy = vi.spyOn(console, "error");

            const quizState: QuizState = {
                questionBank: [],
                activeUsers: new Map(),
                correctUsersForQuestion: new Set(),
                channelId: "",
                currentQuestionId: null,
                answeredUsersForQuestion: new Set(),
                guildId: "",
            };

            await durableQuizManager.runQuiz(quizState);

            expect(consoleErrorSpy).toHaveBeenCalledWith('could not find a valid guild or channel id');
            expect(durableClientMock.startNew).not.toHaveBeenCalled();
        });

        it("should start a new quiz instance", async () => {
            const quizState: QuizState = {
                questionBank: [],
                activeUsers: new Map(),
                correctUsersForQuestion: new Set(),
                channelId: "channel123",
                currentQuestionId: null,
                answeredUsersForQuestion: new Set(),
                guildId: "guild123",
            };
            await durableQuizManager.runQuiz(quizState);
            expect(durableClientMock.startNew).toHaveBeenCalledWith(
                "QuizOrchestrator",
                { input: quizState, instanceId: "guild123-channel123" }
            );
        });
    });

    describe("nextQuizQuestion", () => {
        it("should return if instanceId is missing", async () => {
            const consoleErrorSpy = vi.spyOn(console, "error");
            await durableQuizManager.nextQuizQuestion("", "");

            expect(consoleErrorSpy).toHaveBeenCalledWith('could not find a valid guild or channel id');
            expect(durableClientMock.raiseEvent).not.toHaveBeenCalled();
        });

        it("should raise an answerQuestion event", async () => {
            await durableQuizManager.nextQuizQuestion("guild123", "channel123");
            expect(durableClientMock.raiseEvent).toHaveBeenCalledWith(
                "guild123-channel123",
                "answerQuestion",
                {},
                {}
            );
        });
    });
});
