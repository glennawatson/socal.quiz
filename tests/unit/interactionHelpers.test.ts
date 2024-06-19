import { describe, it, expect, beforeAll  } from 'vitest';
import {
    ApplicationCommandOptionType,
    InteractionResponseType,
    MessageFlags,
} from 'discord-api-types/v10';
import {
    generateErrorResponse,
    generateOptionMissingErrorResponse,
    isNullOrWhitespace,
    createEphemeralResponse,
} from '../../src/util/interactionHelpers';

describe('interactionHelpers', () => {
    describe('generateErrorResponse', () => {
        it('should generate an error response', () => {
            const error = new Error('Something went wrong');
            const response = generateErrorResponse(error);

            expect(response).toEqual({
                type: InteractionResponseType.ChannelMessageWithSource,
                data: {
                    content: 'Something went wrong',
                    flags: MessageFlags.Ephemeral,
                },
            });
        });
    });

    describe('generateOptionMissingErrorResponse', () => {
        it('should generate a missing option error response', () => {
            const response = generateOptionMissingErrorResponse('optionName');

            expect(response).toEqual({
                type: InteractionResponseType.ChannelMessageWithSource,
                data: {
                    content: 'The optionName was not specified!',
                    flags: MessageFlags.Ephemeral,
                },
            });
        });
    });

    describe('isNullOrWhitespace', () => {
        it('should return true for null, undefined, or whitespace strings', () => {
            expect(isNullOrWhitespace(null)).toBe(true);
            expect(isNullOrWhitespace(undefined)).toBe(true);
            expect(isNullOrWhitespace('')).toBe(true);
            expect(isNullOrWhitespace(' ')).toBe(true);
        });

        it('should return false for non-whitespace strings', () => {
            expect(isNullOrWhitespace('hello')).toBe(false);
            expect(isNullOrWhitespace(' world ')).toBe(false);
        });
    });

    describe('createEphemeralResponse', () => {
        it('should create an ephemeral response', () => {
            const response = createEphemeralResponse('Hello, world!');

            expect(response).toEqual({
                type: InteractionResponseType.ChannelMessageWithSource,
                data: {
                    content: 'Hello, world!',
                    flags: MessageFlags.Ephemeral,
                },
            });
        });
    });

    describe('Array.prototype.getStringOption', () => {
        beforeAll(() => {
            Array.prototype.getStringOption = function (optionName: string) {
                const option = this.find((opt) => opt.name === optionName);

                if (!option) {
                    throw new Error(`The ${optionName} was not specified!`);
                }

                if (option.type !== ApplicationCommandOptionType.String) {
                    throw new Error(
                        `The ${optionName} was not specified correctly as a string!`,
                    );
                }

                return option.value as string;
            };
        });

        it('should return the value of the specified string option', () => {
            const options = [
                { name: 'option1', type: ApplicationCommandOptionType.String, value: 'value1' },
                { name: 'option2', type: ApplicationCommandOptionType.String, value: 'value2' },
            ];

            const value = options.getStringOption('option1');
            expect(value).toBe('value1');
        });

        it('should throw an error if the option is not found', () => {
            const options = [
                { name: 'option1', type: ApplicationCommandOptionType.String, value: 'value1' },
            ];

            expect(() => options.getStringOption('option2')).toThrow(
                'The option2 was not specified!',
            );
        });

        it('should throw an error if the option is not a string', () => {
            const options = [
                { name: 'option1', type: ApplicationCommandOptionType.Integer, value: 123 },
            ];

            expect(() => options.getStringOption('option1')).toThrow(
                'The option1 was not specified correctly as a string!',
            );
        });
    });
});
