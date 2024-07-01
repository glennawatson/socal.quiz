import {QuizManagerBase} from "../../../src/handlers/quizManagerBase.js";
import {QuizState} from "../../../src/handlers/quizState.interfaces.js";
import {APIInteractionResponse} from "discord-api-types/v10";
import {createEphemeralResponse} from "../../../src/util/interactionHelpers.js";
import {REST} from "@discordjs/rest";
import {MockQuizQuestionStorage} from "./mockQuizQuestionStorage.js";

export class MockQuizManager extends QuizManagerBase {
    public async runQuiz(_quiz: QuizState): Promise<void> {
    }

    public async stopQuiz(_guildId: string, _channelId: string): Promise<void> {
    }

    public async nextQuizQuestion(_guildId: string, _channelId: string): Promise<void> {
    }

    public async answerInteraction(_guildId: string, _channelId: string, _userId: string, _selectedAnswerId: string): Promise<APIInteractionResponse> {
        return createEphemeralResponse("Answer received.");
    }

    constructor() {
        super(new REST(), new MockQuizQuestionStorage());
    }
}