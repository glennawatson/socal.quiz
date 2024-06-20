import {IModalHandlerCommand} from "./discordCommand";
import {
    APIChatInputApplicationCommandInteraction,
    APIInteractionResponse,
    APIModalSubmitInteraction,
    InteractionResponseType,
    TextInputStyle,
} from "discord-api-types/v10";
import {
    ActionRowBuilder,
    ModalBuilder,
    SlashCommandBuilder,
    SlashCommandOptionsOnlyBuilder,
    TextInputBuilder,
} from "@discordjs/builders";
import {v4 as uuidv4} from "uuid";
import {Question} from "../../question";
import {createEphemeralResponse, getComponentValue, getComponentValueNumber} from "../../util/interactionHelpers";
import {QuestionStorage} from "../../util/questionStorage";

export class AddQuestionToBankCommand implements IModalHandlerCommand {
    public static readonly componentIds = {
        bankName: "bankname",
        questionText: "questionText",
        imageUrl: "imageUrl",
        explanation: "explanation",
        explanationImageUrl: "explanationImageUrl",
        timeoutTimeSeconds: "timeoutTimeSeconds",
        answers: Array.from({length: 4}, (_, i) => `answer${i + 1}`),
        correctAnswerIndex: "correctAnswerIndex",
    };

    constructor(private readonly questionStorage: QuestionStorage) {
    }

    data(): SlashCommandOptionsOnlyBuilder {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription("Add a question to a question bank");
    }

    name = "add_question_to_bank";

    // Helper function to create text input components
    private createTextInput(
        customId: string,
        label: string,
        style: TextInputStyle,
        required = true,
    ) {
        return new TextInputBuilder()
            .setCustomId(customId)
            .setLabel(label)
            .setStyle(style)
            .setRequired(required);
    }

    public async execute(
        _: APIChatInputApplicationCommandInteraction, // eslint-disable-line @typescript-eslint/no-unused-vars
    ): Promise<APIInteractionResponse> {
        const modal = new ModalBuilder()
            .setCustomId(this.name)
            .setTitle("Add New Question");

        modal.addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                this.createTextInput(
                    AddQuestionToBankCommand.componentIds.bankName,
                    "Question Bank Name",
                    TextInputStyle.Short,
                ),
            ),
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                this.createTextInput(
                    AddQuestionToBankCommand.componentIds.questionText,
                    "Question Text",
                    TextInputStyle.Paragraph,
                ),
            ),
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                this.createTextInput(
                    AddQuestionToBankCommand.componentIds.timeoutTimeSeconds,
                    "Question timeout time",
                    TextInputStyle.Short,
                    false,
                ),
            ),
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                this.createTextInput(
                    AddQuestionToBankCommand.componentIds.imageUrl,
                    "Image URL (optional)",
                    TextInputStyle.Short,
                    false,
                ),
            ),
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                this.createTextInput(
                    AddQuestionToBankCommand.componentIds.explanation,
                    "Explanation (Optional)",
                    TextInputStyle.Paragraph,
                    false,
                ),
            ),
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                this.createTextInput(
                    AddQuestionToBankCommand.componentIds.explanationImageUrl,
                    "Explanation Image URL (Optional)",
                    TextInputStyle.Short,
                    false,
                ),
            ),
        );

        // Add answer input components (defaulting to 4 answers)
        for (const answerId of AddQuestionToBankCommand.componentIds.answers) {
            modal.addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                    this.createTextInput(
                        answerId,
                        `Answer ${answerId.replace("answer", "")}`,
                        TextInputStyle.Short,
                    ),
                ),
            );
        }

        // Correct answer index (last row)
        modal.addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                this.createTextInput(
                    AddQuestionToBankCommand.componentIds.correctAnswerIndex,
                    "Correct Answer Index (0-based)",
                    TextInputStyle.Short,
                ),
            ),
        );

        return {
            type: InteractionResponseType.Modal,
            data: modal.toJSON(),
        };
    }

    public async handleModalSubmit(
        interaction: APIModalSubmitInteraction,
    ): Promise<APIInteractionResponse> {
        const components = interaction.data.components;

        // Extract values using the componentIds map
        const bankName = getComponentValue(components, AddQuestionToBankCommand.componentIds.bankName);

        if (!bankName) {
            return createEphemeralResponse('Invalid bank name');
        }

        const questionText = getComponentValue(components, AddQuestionToBankCommand.componentIds.questionText);

        if (!questionText) {
            return createEphemeralResponse(`There is no valid question text for ${bankName}`);
        }
        const imageUrl = getComponentValue(components, AddQuestionToBankCommand.componentIds.imageUrl);
        const explanation = getComponentValue(components, AddQuestionToBankCommand.componentIds.explanation);
        const explanationImageUrl = getComponentValue(components, AddQuestionToBankCommand.componentIds.explanationImageUrl)
        const questionShowTimeMs =
            (getComponentValueNumber(components, AddQuestionToBankCommand.componentIds.timeoutTimeSeconds) ?? 20) *
            1000;

        // Extract answers
        const answers = AddQuestionToBankCommand.componentIds.answers.map((answerId) => ({
            answerId: uuidv4(),
            answer: getComponentValue(components, answerId) as string,
        }));

        const correctAnswerIndexStr = getComponentValue(
            components,
            AddQuestionToBankCommand.componentIds.correctAnswerIndex,
        );

        if (!correctAnswerIndexStr) {
            return createEphemeralResponse("Invalid correct answer index. No answer is specified.");
        }

        const correctAnswerIndex = parseInt(correctAnswerIndexStr, 10);
        if (
            isNaN(correctAnswerIndex) ||
            correctAnswerIndex < 0 ||
            correctAnswerIndex >= answers.length
        ) {
            createEphemeralResponse(`Invalid correct answer index. Please enter a number between 0 and ${answers.length - 1}`);
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
            questionShowTimeMs,
        };

        await this.questionStorage.addQuestion(question);

        return createEphemeralResponse(`Added question to bank ${bankName}.`);
    }
}
