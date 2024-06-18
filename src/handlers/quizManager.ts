import { QuizState } from "./quizState";
import { getQuestions } from "../util/questionStorage";
import {
  APIInteraction,
  APIInteractionResponse,
  ButtonStyle,
  InteractionType,
  Routes,
} from "discord-api-types/v10";
import { REST } from "@discordjs/rest";
import {
  ActionRowBuilder,
  ButtonBuilder,
  EmbedBuilder,
} from "@discordjs/builders";
import { createEphemeralResponse } from "../util/interactionHelpers";
import { Question } from "../question";
import { from, of } from "rxjs";
import { concatMap, delay, finalize } from "rxjs/operators";

export class QuizManager {
  private quizzes: Map<string, QuizState>;

  private static readonly SUMMARY_DURATION_MS = 5000; // 5 seconds to show summary

  constructor(private readonly rest: REST) {
    this.quizzes = new Map();
  }

  public async startQuiz(
    channelId: string,
    questionBankName: string,
  ): Promise<void> {
    const questions = await getQuestions(questionBankName);

    const quiz: QuizState = {
      currentQuestionIndex: 0,
      questionBank: questions,
      activeUsers: new Map(),
      correctUsers: new Set<string>(),
      quizSubscription: null,
      channelId: channelId,
    };

    this.quizzes.set(channelId, quiz);

    await this.startQuizAtIndex(quiz, 0);
  }

  private async startQuizAtIndex(
    quizState: QuizState,
    startQuestionIndex: number,
  ) {
    this.unsubcribeQuiz(quizState);

    quizState.currentQuestionIndex = startQuestionIndex;

    this.startQuizTimer(quizState);
  }

  private startQuizTimer(quiz: QuizState) {
    this.unsubcribeQuiz(quiz);
    const questionObservable = from(
      quiz.questionBank.slice(quiz.currentQuestionIndex),
    ).pipe(
      concatMap((question, index) =>
        of(question).pipe(
          concatMap(async () => {
            quiz.currentQuestionIndex += index;
            await this.postQuestion(quiz.channelId, question);
          }),
          delay(question.questionShowTimeMs),
          concatMap(async () => {
            await this.sendQuestionSummary(quiz.channelId, question);
          }),
          delay(QuizManager.SUMMARY_DURATION_MS),
        ),
      ),
      finalize(async () => {
        await this.showScores(quiz.channelId);
        this.stopQuiz(quiz.channelId);
      }),
    );

    quiz.quizSubscription = questionObservable.subscribe();
  }

  public stopQuiz(channelId: string) {
    const quiz = this.quizzes.get(channelId);
    this.unsubcribeQuiz(quiz);
    this.quizzes.delete(channelId);
  }

  private unsubcribeQuiz(quiz: QuizState | undefined) {
    if (quiz && quiz.quizSubscription) {
      quiz.quizSubscription.unsubscribe();
    }
  }

  private async postQuestion(channelId: string, question: Question) {
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

    if (question.imageUrl) {
      embed.setImage(question.imageUrl);
    }

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      question.answers.map((answer, index) =>
        new ButtonBuilder()
          .setCustomId(`answer_${answer.answerId}`)
          .setLabel(String.fromCharCode(65 + index))
          .setStyle(ButtonStyle.Primary),
      ),
    );

    await this.rest.post(Routes.channelMessages(channelId), {
      body: {
        embeds: [embed.toJSON()],
        components: [buttons.toJSON()],
      },
    });
  }

  private async sendQuestionSummary(
    channelId: string,
    question: Question,
  ): Promise<void> {
    const quiz = this.quizzes.get(channelId);
    if (!quiz) return;

    const correctAnswerText =
      question.answers[question.correctAnswerIndex]?.answer;
    const correctCount = quiz.correctUsers.size;

    const summaryEmbed = new EmbedBuilder()
      .setTitle(`Summary for Question ${quiz.currentQuestionIndex + 1}`)
      .setDescription(
        `${correctCount} user(s) answered correctly!\n` +
          `The correct answer was: ${correctAnswerText}\n` +
          (question.explanation ? `Explanation: ${question.explanation}` : ""),
      );

    if (question.explanationImageUrl) {
      summaryEmbed.setImage(question.explanationImageUrl);
    }

    await this.rest.post(Routes.channelMessages(channelId), {
      body: {
        embeds: [summaryEmbed.toJSON()],
      },
    });
  }

  public async handleAnswer(
    interaction: APIInteraction,
  ): Promise<APIInteractionResponse> {
    if (interaction.type !== InteractionType.MessageComponent) {
      return createEphemeralResponse("Invalid interaction type.");
    }

    const quiz = this.quizzes.get(interaction.channel_id);
    if (!quiz) {
      return createEphemeralResponse("No quiz found for this channel.");
    }

    const question = quiz.questionBank[quiz.currentQuestionIndex];
    if (!question) {
      return createEphemeralResponse(
        "No quiz question found for this channel.",
      );
    }

    const userId = interaction.member?.user.id;
    const selectedAnswerId = interaction.data.custom_id.split("_")[1];

    if (!userId) {
      return createEphemeralResponse("Invalid user id");
    }

    const selectedAnswerIndex = question.answers.findIndex(
      (answer) => answer.answerId === selectedAnswerId,
    );

    if (selectedAnswerIndex === question.correctAnswerIndex) {
      quiz.activeUsers.set(userId, (quiz.activeUsers.get(userId) || 0) + 1);
      quiz.correctUsers.add(userId);
      return createEphemeralResponse("Correct!");
    } else {
      return createEphemeralResponse("Incorrect!");
    }
  }

  public async showScores(channelId: string) {
    const quiz = this.quizzes.get(channelId);
    if (!quiz) return;

    const scoreEntries = Array.from(quiz.activeUsers.entries());
    scoreEntries.sort(([, scoreA], [, scoreB]) => scoreB - scoreA); // Higher scores first

    let scoreMessage = "**Quiz Scores**\n";
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

  public async nextQuizQuestion(channelId: string) {
    const quiz = this.quizzes.get(channelId);

    if (!quiz) return;

    await this.startQuizAtIndex(quiz, quiz.currentQuestionIndex++);
  }
}
