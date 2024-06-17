import {IModalHandlerCommand} from "./discordCommand";
import {addQuestion} from "../../util/questionStorage";
import {
    APIChatInputApplicationCommandInteraction, APIInteractionResponse,
    APIModalSubmitInteraction,
    InteractionResponseType,
    MessageFlags, TextInputStyle
} from "discord-api-types/v10";
import {
    ActionRowBuilder, ModalBuilder,
    SlashCommandBuilder,
    SlashCommandOptionsOnlyBuilder,
    TextInputBuilder
} from "@discordjs/builders";
import { v4 as uuidv4 } from "uuid";
import {Question} from "../../question";
import {createEphemeralResponse} from "../../util/interactionHelpers";

export class AddQuestionToBankCommand implements IModalHandlerCommand {
    private componentIds = {
        bankName: "questionBankName",
        questionText: "questionText",
        imageUrl: "imageUrl",
        explanation: "explanation",
        explanationImageUrl: "explanationImageUrl",
        answers: Array.from({ length: 4 }, (_, i) => `answer${i + 1}`),
        correctAnswerIndex: "correctAnswerIndex",
    };

    data(): SlashCommandOptionsOnlyBuilder {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription("Add a question to a question bank");
    }

    name = 'addQuestionToBank';

    // Helper function to create text input components
    private createTextInput(customId: string, label: string, style: TextInputStyle, required = true) {
        return new TextInputBuilder()
            .setCustomId(customId)
            .setLabel(label)
            .setStyle(style)
            .setRequired(required);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public async execute(_: APIChatInputApplicationCommandInteraction): Promise<APIInteractionResponse> {
        const modal = new ModalBuilder()
            .setCustomId(this.name)
            .setTitle('Add New Question');

        modal.addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                this.createTextInput(this.componentIds.bankName, 'Question Bank Name', TextInputStyle.Short),
            ),
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                this.createTextInput(this.componentIds.questionText, 'Question Text', TextInputStyle.Paragraph),
            ),
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                this.createTextInput(this.componentIds.imageUrl, 'Image URL (optional)', TextInputStyle.Short, false),
            ),
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                this.createTextInput(this.componentIds.explanation, 'Explanation (Optional)', TextInputStyle.Paragraph, false),
            ),
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                this.createTextInput(this.componentIds.explanationImageUrl, 'Explanation Image URL (Optional)', TextInputStyle.Short, false),
            )
        );

        // Add answer input components (defaulting to 4 answers)
        for (const answerId of this.componentIds.answers) {
            modal.addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                    this.createTextInput(answerId, `Answer ${answerId.replace('answer', '')}`, TextInputStyle.Short),
                ),
            );
        }

        // Correct answer index (last row)
        modal.addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                this.createTextInput(this.componentIds.correctAnswerIndex, 'Correct Answer Index (0-based)', TextInputStyle.Short),
            ),
        );

        return {
            type: InteractionResponseType.Modal,
            data: modal.toJSON(),
        };
    }

    public async handleModalSubmit(interaction: APIModalSubmitInteraction): Promise<APIInteractionResponse> {
        const components = interaction.data.components;

        // Helper function to extract values based on custom IDs
        const getComponentValue = (customId: string) => components?.find(row => row.components?.[0]?.custom_id === customId)?.components?.[0]?.value;

        // Extract values using the componentIds map
        const bankName = getComponentValue(this.componentIds.bankName) as string;
        const questionText = getComponentValue(this.componentIds.questionText) as string;
        const imageUrl = getComponentValue(this.componentIds.imageUrl);
        const explanation = getComponentValue(this.componentIds.explanation);
        const explanationImageUrl = getComponentValue(this.componentIds.explanationImageUrl);

        // Extract answers
        const answers = this.componentIds.answers.map(answerId => ({
            answerId: uuidv4(),
            answer: getComponentValue(answerId) as string,
        }));

        const correctAnswerIndexStr = getComponentValue(this.componentIds.correctAnswerIndex);

        if (!correctAnswerIndexStr) {
            return {
                type: InteractionResponseType.ChannelMessageWithSource,
                data: {
                    content: "Invalid correct answer index. Please enter a number between 0 and 3.",
                    flags: MessageFlags.Ephemeral,
                },
            };
        }

        const correctAnswerIndex = parseInt(correctAnswerIndexStr, 10);
        if (isNaN(correctAnswerIndex) || correctAnswerIndex < 0 || correctAnswerIndex >= answers.length) {

            return {
                type: InteractionResponseType.ChannelMessageWithSource,
                data: {
                    content: "Invalid correct answer index. Please enter a number between 0 and 3.",
                    flags: MessageFlags.Ephemeral,
                },
            };
        }

        const question: Question = {
            bankName,
            questionId: uuidv4(),
            question: questionText,
            answers,
            correctAnswerIndex,
            imageUrl,
            explanation,
            explanationImageUrl,
        };

        await addQuestion(question);

        return createEphemeralResponse(`Added question to bank ${bankName}.`);
    }
}