import {beforeEach, describe, expect, it, vi} from 'vitest';
import {
    APIChatInputApplicationCommandInteraction,
} from 'discord-api-types/v10';
import {QuestionStorage} from "../../src/util/questionStorage";
import {DeleteQuestionBankCommand} from "../../src/handlers/actions/deleteQuestionBankCommand";
import {createEphemeralResponse, generateOptionMissingErrorResponse} from "../../src/util/interactionHelpers";
import {generateBankOptions} from "./optionsHelper";

describe('DeleteQuestionBankCommand', () => {
    let questionStorageMock: QuestionStorage;
    let deleteQuestionBankCommand: DeleteQuestionBankCommand;

    beforeEach(() => {
        questionStorageMock = {
            deleteQuestionBank: vi.fn(),
        } as unknown as QuestionStorage;

        deleteQuestionBankCommand = new DeleteQuestionBankCommand(questionStorageMock);
    });

    describe('data', () => {
        it('should return the correct command data', () => {
            const commandData = deleteQuestionBankCommand.data();
            expect(commandData.name).toBe('delete_question_bank');
        });
    });

    describe('execute', () => {
        it('should delete a question bank and return a confirmation message', async () => {
            const interaction : APIChatInputApplicationCommandInteraction = generateBankOptions('123', 'sampleBank');

            const response = await deleteQuestionBankCommand.execute(interaction);

            expect(response).toEqual(createEphemeralResponse('Deleted question bank: sampleBank'));
            expect(questionStorageMock.deleteQuestionBank).toHaveBeenCalledWith('sampleBank');
        });

        it('should return an error if the question bank name is missing', async () => {
            const interaction : APIChatInputApplicationCommandInteraction = generateBankOptions('123', '');

            const response = await deleteQuestionBankCommand.execute(interaction);

            expect(response).toEqual(generateOptionMissingErrorResponse('bankname'));
        });
    });
});
