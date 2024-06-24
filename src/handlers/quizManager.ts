import {QuizState} from "./quizState.interfaces";
import {APIInteraction, APIInteractionResponse, InteractionType, Routes} from "discord-api-types/v10";
import {REST} from "@discordjs/rest";
import {ActionRowBuilder, ButtonBuilder, EmbedBuilder} from "@discordjs/builders";
import {createEphemeralResponse, isNullOrWhitespace} from "../util/interactionHelpers";
import {Question} from "../question.interfaces";
import {IQuestionStorage} from "../util/IQuestionStorage.interfaces";
import {StateManager} from "../util/stateManager";
import {asyncScheduler, lastValueFrom, timer} from "rxjs";

export abstract class QuizManagerBase {
    protected constructor(
        protected readonly rest: REST,
        protected readonly quizStateStorage: IQuestionStorage,
        protected readonly stateManager: StateManager) {
    }

    public abstract runQuiz(quiz: QuizState) : Promise<void>;

    public async startQuiz(guildId: string, channelId: string, questionBankName: string): Promise<APIInteractionResponse> {
        if (isNullOrWhitespace(questionBankName)) {
            return createEphemeralResponse(`There is no valid question bank name`);
        }

        const questions = await this.quizStateStorage.getQuestions(questionBankName);

        if (!questions || questions.length === 0) {
            return createEphemeralResponse(`There are no valid questions in the question bank ${questionBankName}`);
        }

        return await this.startQuizInternal(questions, guildId, channelId);
    }

    public async startQuizInternal(questions: Question[], guildId: string, channelId: string): Promise<APIInteractionResponse> {
        if (questions.length === 0) {
            return createEphemeralResponse("There are no valid questions");
        }

        const invalidQuestions = questions.filter(q => !q || typeof q.question !== "string" || q.question.trim() === "");

        if (invalidQuestions.length > 0) {
            const invalidQuestionIds = invalidQuestions.map(q => q?.questionId ?? "unknown").join(", ");
            return createEphemeralResponse(`There are invalid questions with IDs: ${invalidQuestionIds}`);
        }

        const quiz: QuizState = {
            questionBank: questions,
            activeUsers: new Map(),
            correctUsersForQuestion: new Set<string>(),
            channelId: channelId,
            currentQuestionId: questions[0]?.questionId ?? null,
            answeredUsersForQuestion: new Set<string>(),
            guildId: guildId,
        };

        await this.stopQuiz(guildId, channelId); // Stop any existing quiz before starting a new one
        await this.stateManager.setState(quiz);

        await this.runQuiz(quiz);

        return createEphemeralResponse(`Quiz for channel ${quiz.channelId} started successfully.`);
    }

    public async stopQuiz(guildId: string, channelId: string) {
        await this.stateManager.deleteState(guildId, channelId); // Remove state from storage
    }

    protected async postQuestion(channelId: string, question: Question) {
        const embed = new EmbedBuilder()
            .setTitle("Quiz Question")
            .setDescription(
                `**Question**: ${question.question}\n` +
                question.answers
                    .map(
                        (answer, index) =>
                            `${String.fromCharCode(65 + index)}: ${answer.answer}`,
                    )
                    .join("\n"),
            )
            .setFooter({
                text: "Select the correct answer by clicking the buttons below.",
            });

        if (question.imagePartitionKey) {
            const imageUrl = await this.quizStateStorage.getQuestionImagePresignedUrl(
                question.bankName,
                question.questionId,
            );
            embed.setImage(imageUrl);
        }

        const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
            question.answers.map((answer, index) =>
                new ButtonBuilder()
                    .setCustomId(`answer_${answer.answerId}`)
                    .setLabel(String.fromCharCode(65 + index)),
            ),
        );

        console.debug(`sending quiz question/answers to channel ${channelId}`);
        await this.rest.post(Routes.channelMessages(channelId), {
            body: {
                embeds: [embed.toJSON()],
                components: [buttons.toJSON()],
            },
        });
        console.debug(`sent quiz question/answers to channel ${channelId}`);
    }

    public async sendQuestionSummary(quiz: QuizState, question: Question, questionNumber: number): Promise<void> {
        if (isNaN(questionNumber)) throw new Error("invalid question index number");

        const correctAnswerText = question.answers[question.correctAnswerIndex]?.answer;
        const correctCount = quiz.correctUsersForQuestion.size;

        const summaryEmbed = new EmbedBuilder()
            .setTitle(`Summary for Question ${questionNumber}`)
            .setDescription(
                `${correctCount} user(s) answered correctly!\n` +
                `The correct answer was: ${correctAnswerText}` +
                (question.explanation ? `\nExplanation: ${question.explanation}` : ""),
            );

        if (question.explanationImagePartitionKey) {
            const imageUrl = await this.quizStateStorage.getExplanationImagePresignedUrl(
                question.bankName,
                question.questionId,
            );
            summaryEmbed.setImage(imageUrl);
        }

        await this.rest.post(Routes.channelMessages(quiz.channelId), {
            body: {
                embeds: [summaryEmbed.toJSON()],
            },
        });
    }

    public async handleAnswer(interaction: APIInteraction): Promise<APIInteractionResponse> {
        if (interaction.type !== InteractionType.MessageComponent) {
            return createEphemeralResponse("Invalid interaction type.");
        }

        if (!interaction.guild_id) {
            return createEphemeralResponse("Must have a valid guild id.");
        }

        if (!interaction.channel.id) {
            return createEphemeralResponse("Must have a valid channel");
        }

        const quiz = await this.stateManager.getState(interaction.guild_id, interaction.channel.id);
        if (!quiz) {
            console.error(`no quiz found for channel ${interaction.channel.id}`);
            return createEphemeralResponse("No quiz found for this channel.");
        }

        if (!quiz.currentQuestionId) {
            console.error(`no active question found for channel ${interaction.channel.id}`);
            return createEphemeralResponse("No active question");
        }

        const question = quiz.questionBank.find(x => x.questionId == quiz.currentQuestionId);
        if (!question) {
            return createEphemeralResponse("No quiz question found for this channel.");
        }

        const userId = interaction.member?.user?.id;
        const selectedAnswerId = interaction.data.custom_id.split("_")[1];

        if (!userId) {
            console.error(`no user id for ${userId}`);
            return createEphemeralResponse("Invalid user id");
        }

        const selectedAnswerIndex = question.answers.findIndex(answer => answer.answerId === selectedAnswerId);

        if (selectedAnswerIndex === -1) {
            console.error(`Could not find a answer with id ${selectedAnswerId}`);
            return createEphemeralResponse("This answer is not part of the current quiz, answer again.");
        }

        if (quiz.answeredUsersForQuestion.has(userId)) {
            console.error(`user id has already answered for ${userId} ${selectedAnswerId}`);
            return createEphemeralResponse("Already answered for this question");
        }

        quiz.answeredUsersForQuestion.add(userId);
        if (selectedAnswerIndex === question.correctAnswerIndex) {
            quiz.activeUsers.set(userId, (quiz.activeUsers.get(userId) || 0) + 1);
            quiz.correctUsersForQuestion.add(userId);
            await this.stateManager.setState(quiz); // Update state after answering
            return createEphemeralResponse("Correct!");
        } else {
            quiz.activeUsers.set(userId, quiz.activeUsers.get(userId) || 0);
            await this.stateManager.setState(quiz); // Update state after answering
            return createEphemeralResponse("Incorrect!");
        }
    }

    public async showScores(quiz: QuizState) {
        if (!quiz) {
            console.log("invalid quiz");
            return;
        }

        const channelId = quiz.channelId;

        if (!channelId) {
            console.log("no valid channel defined for the quiz to send scores to");
            return;
        }

        console.debug(`showing the scores for quiz in ${quiz?.channelId} with ${quiz.activeUsers.size} user entries.`);

        const scoreEntries = Array.from(quiz.activeUsers.entries());
        scoreEntries.sort(([, scoreA], [, scoreB]) => scoreB - scoreA); // Higher scores first

        let scoreDescription = "";
        for (const [userId, score] of scoreEntries) {
            scoreDescription += `<@${userId}>: ${score} points\n`;
        }

        if (scoreDescription === "") {
            scoreDescription = "No scores available.";
        }

        console.debug(`sending final scores to channel ${channelId}`);

        const summaryEmbed = new EmbedBuilder()
            .setTitle("Quiz Scores")
            .setDescription(scoreDescription);

        await this.rest.post(Routes.channelMessages(channelId), {
            body: {
                embeds: [summaryEmbed.toJSON()],
            },
        });
    }

    public async nextQuizQuestion(channelId: string) {
        console.debug("starting to go to next question");

        const quiz = await this.stateManager.getState(channelId, channelId);

        if (!quiz) {
            console.log(`could not find a quiz for channel ${channelId}`);
            return createEphemeralResponse("No quiz found for this channel.");
        }

        const questionIndex = quiz.questionBank.findIndex(x => x.questionId == quiz.currentQuestionId);
        if (questionIndex === -1) {
            console.log(`Could not find a valid quiz question for ${channelId} and ${quiz.currentQuestionId} and index ${questionIndex}`);
            return createEphemeralResponse("No quiz question found for this channel.");
        }

        const nextQuestions = quiz.questionBank.slice(questionIndex + 1);
        if (nextQuestions.length === 0) {
            console.log(`No more questions available in the quiz bank for channel ${channelId}`);
            return createEphemeralResponse("No more questions in the quiz.");
        }

        await this.startQuizInternal(nextQuestions, quiz.guildId, channelId);

        console.debug("finished to go to next question");

        return createEphemeralResponse("Quiz restarted at the next question.");
    }
}

export class QuizManager extends QuizManagerBase {

    public constructor(rest: REST, quizStateStorage: IQuestionStorage, stateManager: StateManager, public readonly summaryDurationMs = 5000, private readonly scheduler = asyncScheduler) {
        super(rest, quizStateStorage, stateManager);
    }

    public async runQuiz(quiz: QuizState): Promise<void> {
        for (let index = 0; index < quiz.questionBank.length; index++) {
            const question = quiz.questionBank[index];
            if (!question || !question.question) continue;

            console.debug(`'now process question ${question.questionId}`);

            try {
                quiz.currentQuestionId = question.questionId;
                await this.stateManager.setState(quiz); // Update state after setting the current question
                await this.postQuestion(quiz.channelId, question);

                if (index !== quiz.questionBank.length - 1) {
                    await lastValueFrom(timer(question.questionShowTimeMs, this.scheduler));
                }

                await this.sendQuestionSummary(quiz, question, index + 1);

                quiz.correctUsersForQuestion.clear();
                quiz.answeredUsersForQuestion.clear();

                await this.stateManager.setState(quiz); // Update state after clearing users

                await lastValueFrom(timer(this.summaryDurationMs, this.scheduler));
            } catch (error) {
                console.error(error);
            }
        }

        await this.showScores(quiz);

        await this.stopQuiz(quiz.guildId, quiz.channelId);
    }
}
