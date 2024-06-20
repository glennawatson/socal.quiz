import {QuestionStorage} from "../../src/util/questionStorage";
import {DeleteQuestionFromBankCommand} from "../../src/handlers/actions/deleteQuestionFromBankCommand";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {ApplicationCommandOptionType} from "discord-api-types/v10";
import {createEphemeralResponse, generateOptionMissingErrorResponse} from "../../src/util/interactionHelpers";
import {generateBankOptions} from "./optionsHelper";

describe('DeleteQuestionFromBankCommand', () => {
    let questionStorageMock: QuestionStorage;
    let deleteQuestionFromBankCommand: DeleteQuestionFromBankCommand;

    beforeEach(() => {
        questionStorageMock = {
            deleteQuestion: vi.fn(),
        } as unknown as QuestionStorage;

        deleteQuestionFromBankCommand = new DeleteQuestionFromBankCommand(questionStorageMock);
    });

    describe('data', () => {
        it('should return the correct command data', () => {
            const commandData = deleteQuestionFromBankCommand.data();
            expect(commandData.name).toBe('delete_question_from_bank');
        });
    });

    describe('execute', () => {
        it('should delete a question and return a confirmation message', async () => {
            const interaction = generateBankOptions('123', 'sampleBank');
            interaction.data.options?.push({ name: 'questionid', value: 'sampleQuestion', type: ApplicationCommandOptionType.String });

            const response = await deleteQuestionFromBankCommand.execute(interaction);

            expect(questionStorageMock.deleteQuestion).toHaveBeenCalledWith('sampleBank', 'sampleQuestion');
            expect(response).toEqual(createEphemeralResponse('Deleted question: sampleQuestion from sampleBank'));
        });

        it('should return an error if the question bank name or question id is missing', async () => {
            const interaction = generateBankOptions('123', '');
            interaction.data.options?.push({ name: 'questionid', value: 'sampleQuestion', type: ApplicationCommandOptionType.String });

            const response = await deleteQuestionFromBankCommand.execute(interaction);

            expect(response).toEqual(generateOptionMissingErrorResponse('bankname'));

            const interaction2 = generateBankOptions('123', 'sampleBank');

            const response2 = await deleteQuestionFromBankCommand.execute(interaction2);

            expect(response2).toEqual(generateOptionMissingErrorResponse('questionid'));
        });
    });
});
