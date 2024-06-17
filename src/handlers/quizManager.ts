import { QuizState } from "./quizState";
import { getQuestions } from "../util/questionStorage";
import SetIntervalAsync from "set-interval-async";
import {
    APIInteraction, APIInteractionResponse,
    ButtonStyle,
    InteractionResponseType, InteractionType, MessageFlags,
    Routes
} from "discord-api-types/v10";
import { REST } from "@discordjs/rest";
import { ActionRowBuilder, ButtonBuilder, EmbedBuilder } from "@discordjs/builders";
import { createEphemeralResponse } from "../util/interactionHelpers";
import { Question } from "../question";
import { firstValueFrom, timer } from "rxjs";

const sleep = (ms: number) => firstValueFrom(timer(ms));

export class QuizManager {
    private quizzes: Map<string, QuizState>;

    private static readonly QUESTION_DURATION_MS = 20000; // 20 seconds to answer
    private static readonly SUMMARY_DURATION_MS = 5000; // 5 seconds to show summary

    constructor(private readonly rest: REST) {
        this.quizzes = new Map();
    }

    public async startQuiz(channelId: string, questionBankName: string): Promise<void> {
        const questions = await getQuestions(questionBankName);

        const quiz: QuizState = {
            currentQuestionIndex: 0,
            questionBank: questions,
            activeUsers: new Map(),
            quizInterval: null,
            correctUsers: new Set<string>(),
        };

        this.quizzes.set(channelId, quiz);

        await this.sendQuizQuestion(channelId);
    }

    public async stopQuiz(channelId: string) {
        const quiz = this.quizzes.get(channelId);
        if (quiz && quiz.quizInterval) {
            await SetIntervalAsync.clearIntervalAsync(quiz.quizInterval);
        }
        this.quizzes.delete(channelId);
    }

    private async sendQuizQuestion(channelId: string) {
        const quiz = this.quizzes.get(channelId);
        if (!quiz) return;

        if (quiz.currentQuestionIndex >= quiz.questionBank.length) {
            await this.showScores(channelId);
            return;
        }

        const question = quiz.questionBank[quiz.currentQuestionIndex];
        quiz.correctUsers.clear();

        if (!question) return;

        quiz.currentQuestionIndex++;

        const embed = new EmbedBuilder()
            .setTitle('Quiz Question')
            .setDescription(`**Question**: ${question.question}\n` +
                question.answers.map((answer, index) => `${String.fromCharCode(65 + index)}: ${answer.answer}`).join('\n'))
            .setFooter({ text: 'Select the correct answer by clicking the buttons below.' });

        if (question.imageUrl) {
            embed.setImage(question.imageUrl);
        }

        const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
            question.answers.map((answer, index) =>
                new ButtonBuilder()
                    .setCustomId(`answer_${answer.answerId}`)
                    .setLabel(String.fromCharCode(65 + index))
                    .setStyle(ButtonStyle.Primary)
            )
        );

        await this.rest.post(Routes.channelMessages(channelId), {
            body: {
                embeds: [embed.toJSON()],
                components: [buttons.toJSON()],
            },
        });

        quiz.quizInterval = SetIntervalAsync.setIntervalAsync(async () => {
            await this.sendQuestionSummary(channelId, question);
            await sleep(QuizManager.SUMMARY_DURATION_MS);
            await this.sendQuizQuestion(channelId);
        }, QuizManager.QUESTION_DURATION_MS);
    }

    private async sendQuestionSummary(channelId: string, question: Question): Promise<void> {
        const quiz = this.quizzes.get(channelId);
        if (!quiz) return;

        const correctAnswerText = question.answers[question.correctAnswerIndex]?.answer;
        const correctCount = quiz.correctUsers.size;

        const summaryEmbed = new EmbedBuilder()
            .setTitle(`Summary for Question ${quiz.currentQuestionIndex}`)
            .setDescription(`${correctCount} user(s) answered correctly!\n` +
                `The correct answer was: ${correctAnswerText}\n` +
                (question.explanation ? `Explanation: ${question.explanation}` : ''));

        if (question.explanationImageUrl) {
            summaryEmbed.setImage(question.explanationImageUrl);
        }

        await this.rest.post(Routes.channelMessages(channelId), {
            body: {
                embeds: [summaryEmbed.toJSON()],
            },
        });
    }

    public async handleAnswer(interaction: APIInteraction): Promise<APIInteractionResponse> {
        if (interaction.type !== InteractionType.MessageComponent) {
            return createEphemeralResponse('Invalid interaction type.');
        }

        const quiz = this.quizzes.get(interaction.channel.id);
        if (!quiz) {
            return createEphemeralResponse('No quiz found for this channel.');
        }

        const question = quiz.questionBank[quiz.currentQuestionIndex - 1];
        if (!question) {
            return createEphemeralResponse('No quiz question found for this channel.');
        }

        const userId = interaction.user?.id;
        const selectedAnswerId = interaction.data.custom_id.split('_')[1];

        if (!userId) {
            return createEphemeralResponse('Invalid user id');
        }

        const selectedAnswerIndex = question.answers.findIndex(answer => answer.answerId === selectedAnswerId);

        if (selectedAnswerIndex === question.correctAnswerIndex) {
            quiz.activeUsers.set(userId, (quiz.activeUsers.get(userId) || 0) + 1);
            quiz.correctUsers.add(userId);
            return {
                type: InteractionResponseType.ChannelMessageWithSource,
                data: {
                    content: 'Correct!',
                    flags: MessageFlags.Ephemeral
                }
            };
        } else {
            return {
                type: InteractionResponseType.ChannelMessageWithSource,
                data: {
                    content: 'Incorrect!',
                    flags: MessageFlags.Ephemeral
                }
            };
        }
    }

    public async showScores(channelId: string) {
        const quiz = this.quizzes.get(channelId);
        if (!quiz) return;

        const scoreEntries = Array.from(quiz.activeUsers.entries());
        scoreEntries.sort(([, scoreA], [, scoreB]) => scoreB - scoreA); // Higher scores first

        let scoreMessage = '**Quiz Scores**\n';
        for (const [userId, score] of scoreEntries) {
            scoreMessage += `<@${userId}>: ${score} points\n`;
        }

        await this.rest.post(Routes.channelMessages(channelId), {
            body: {
                content: scoreMessage,
            },
        });

        quiz.activeUsers.clear();
    }
}
