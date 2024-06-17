import {IDiscordCommand} from "./discordCommand";
import {SlashCommandBuilder, SlashCommandOptionsOnlyBuilder} from "@discordjs/builders";
import {
    APIChatInputApplicationCommandInteraction,
    APIInteractionResponse
} from "discord-api-types/v10";
import {deleteQuestion} from "../../util/questionStorage";
import {createEphemeralResponse, generateErrorResponse, generateOptionMissingErrorResponse} from "../../util/interactionHelpers";

export class DeleteQuestionFromBankCommand implements IDiscordCommand {
    data(): SlashCommandOptionsOnlyBuilder {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription('Delete a question from a question bank')
            .addStringOption(option =>
                option.setName('questionbankname')
                    .setDescription('The name of the question bank')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option.setName('questionid')
                    .setDescription('The ID of the question')
                    .setRequired(true)
            );
    }

    name  = 'deleteQuestionFromBank';

    async execute(interaction: APIChatInputApplicationCommandInteraction): Promise<APIInteractionResponse> {
        try {
            const bankName = interaction.data.options?.getStringOption('questionbankname');
            const questionId = interaction.data.options?.getStringOption('questionid');

            // ... inside your execute method ...
            if (!bankName) {
                return generateOptionMissingErrorResponse('name of the question bank');
            }

            if (!questionId) {
                return generateOptionMissingErrorResponse('name of the question id');
            }

            await deleteQuestion(bankName, questionId);

            return createEphemeralResponse(`Deleted question: ${questionId} from ${bankName}`);
        }
        catch (error) {
            return generateErrorResponse(error as Error);
        }
    }
}