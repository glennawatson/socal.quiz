import { QuizState } from "./quizState";
import {
  APIInteraction,
  APIInteractionResponse,
  InteractionType,
  Routes,
} from "discord-api-types/v10";
import { REST } from "@discordjs/rest";
import {
  ActionRowBuilder,
  ButtonBuilder,
  EmbedBuilder,
} from "@discordjs/builders";
import {
  createEphemeralResponse,
  isNullOrWhitespace,
} from "../util/interactionHelpers";
import { Question } from "../question";
import { asyncScheduler, lastValueFrom, SchedulerLike, timer } from "rxjs";
import { IQuestionStorage } from "../util/questionStorage";

export class QuizManager {
  public quizzes: Map<string, QuizState>;

  constructor(
    private readonly rest: REST,
    private readonly quizStateStorage: IQuestionStorage,
    public readonly summaryDurationMs = 5000,
  ) {
    this.quizzes = new Map();
  }

  public async startQuiz(
    channelId: string,
    questionBankName: string,
    scheduler: SchedulerLike = asyncScheduler,
  ): Promise<APIInteractionResponse> {
    if (isNullOrWhitespace(questionBankName)) {
      return createEphemeralResponse(`There is no valid question bank name`);
    }

    const questions =
      await this.quizStateStorage.getQuestions(questionBankName);

    if (!questions || questions.length === 0) {
      return createEphemeralResponse(
        `There are no valid questions in the question bank ${questionBankName}`,
      );
    }

    return await this.startQuizInternal(questions, channelId, scheduler);
  }

  public async startQuizInternal(
    questions: Question[],
    channelId: string,
    scheduler: SchedulerLike = asyncScheduler,
  ): Promise<APIInteractionResponse> {
    if (questions.length === 0) {
      return createEphemeralResponse("There are no valid questions");
    }

    // Check for invalid questions
    const invalidQuestions = questions.filter(
      (q) => !q || typeof q.question !== "string" || q.question.trim() === "",
    );

    if (invalidQuestions.length > 0) {
      const invalidQuestionIds = invalidQuestions
        .map((q) => q?.questionId ?? "unknown")
        .join(", ");
      return createEphemeralResponse(
        `There are invalid questions with IDs: ${invalidQuestionIds}`,
      );
    }

    const quiz: QuizState = {
      questionBank: questions,
      activeUsers: new Map(),
      correctUsersForQuestion: new Set<string>(),
      quizSubscription: null,
      channelId: channelId,
      currentQuestionId: questions[0]?.questionId ?? null,
      answeredUsersForQuestion: new Set<string>(),
    };

    this.stopQuiz(channelId);
    this.quizzes.set(channelId, quiz);

    for (let index = 0; index < quiz.questionBank.length; index++) {
      const question = quiz.questionBank[index];
      if (!question) continue;

      if (!question.question) continue;

      console.debug(`'now process question ${question.questionId}`);

      try {
        quiz.currentQuestionId = question.questionId;
        await this.postQuestion(quiz.channelId, question);

        if (index !== quiz.questionBank.length - 1) {
          await lastValueFrom(timer(question.questionShowTimeMs, scheduler));
        }

        await this.sendQuestionSummary(quiz.channelId, question, index + 1);

        quiz.correctUsersForQuestion.clear();
        quiz.answeredUsersForQuestion.clear();

        await lastValueFrom(timer(this.summaryDurationMs, scheduler));
      } catch (error) {
        console.error(error);
      }
    }

    await this.showScores(quiz);

    this.stopQuiz(channelId);
    return createEphemeralResponse(
      `Quiz for channel ${quiz.channelId} completed successfully.`,
    );
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

  public async sendQuestionSummary(
    channelId: string,
    question: Question,
    questionNumber: number,
  ): Promise<void> {
    const quiz = this.quizzes.get(channelId);
    if (!quiz) return;

    if (isNaN(questionNumber)) throw new Error("invalid question index number");

    const correctAnswerText =
      question.answers[question.correctAnswerIndex]?.answer;
    const correctCount = quiz.correctUsersForQuestion.size;

    const summaryEmbed = new EmbedBuilder()
      .setTitle(`Summary for Question ${questionNumber}`)
      .setDescription(
        `${correctCount} user(s) answered correctly!\n` +
          `The correct answer was: ${correctAnswerText}` +
          (question.explanation
            ? `\nExplanation: ${question.explanation}`
            : ""),
      );

    if (question.explanationImagePartitionKey) {
      const imageUrl =
        await this.quizStateStorage.getExplanationImagePresignedUrl(
          question.bankName,
          question.questionId,
        );
      summaryEmbed.setImage(imageUrl);
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

    console.debug(
      `now conducting handling for quiz in ${interaction.channel.id}`,
    );

    const quiz = this.quizzes.get(interaction.channel.id);
    if (!quiz) {
      console.error(
        `no quiz found for channel ${interaction.channel.id} while handling the message reply with quizzes having ${this.quizzes.size} entries`,
      );
      return createEphemeralResponse("No quiz found for this channel.");
    }

    if (!quiz.currentQuestionId) {
      console.error(
        `no active question found for channel ${interaction.channel.id}`,
      );
      return createEphemeralResponse("No active question");
    }

    const question = quiz.questionBank.find(
      (x) => x.questionId == quiz.currentQuestionId,
    );
    if (!question) {
      return createEphemeralResponse(
        "No quiz question found for this channel.",
      );
    }

    const userId = interaction.member?.user?.id;
    const selectedAnswerId = interaction.data.custom_id.split("_")[1];

    if (!userId) {
      return createEphemeralResponse("Invalid user id");
    }

    const selectedAnswerIndex = question.answers.findIndex(
      (answer) => answer.answerId === selectedAnswerId,
    );

    if (selectedAnswerIndex === -1) {
      return createEphemeralResponse(
        "This answer is not part of the current quiz, answer again.",
      );
    }

    if (quiz.answeredUsersForQuestion.has(userId)) {
      return createEphemeralResponse("Already answered for this question");
    }

    quiz.answeredUsersForQuestion.add(userId);
    if (selectedAnswerIndex === question.correctAnswerIndex) {
      quiz.activeUsers.set(userId, (quiz.activeUsers.get(userId) || 0) + 1);
      quiz.correctUsersForQuestion.add(userId);
      return createEphemeralResponse("Correct!");
    } else {
      quiz.activeUsers.set(userId, quiz.activeUsers.get(userId) || 0);
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

    console.debug(
      `showing the scores for quiz in ${quiz?.channelId} with ${quiz.activeUsers.size} user entries.`,
    );

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

  public async nextQuizQuestion(channelId: string, scheduler?: SchedulerLike) {
    console.debug("starting to go to next question");
    scheduler ??= asyncScheduler;
    const quiz = this.quizzes.get(channelId);

    if (!quiz) {
      console.log(`could not find a quiz for channel ${channelId}`);
      return createEphemeralResponse("No quiz found for this channel.");
    }

    const questionIndex = quiz.questionBank.findIndex(
      (x) => x.questionId == quiz.currentQuestionId,
    );
    if (questionIndex === -1) {
      console.log(
        `Could not find a valid quiz question for ${channelId} and ${quiz.currentQuestionId} and index ${questionIndex}`,
      );
      return createEphemeralResponse(
        "No quiz question found for this channel.",
      );
    }

    const nextQuestions = quiz.questionBank.slice(questionIndex + 1);
    if (nextQuestions.length === 0) {
      console.log(
        `No more questions available in the quiz bank for channel ${channelId}`,
      );
      return createEphemeralResponse("No more questions in the quiz.");
    }

    await this.startQuizInternal(nextQuestions, channelId, scheduler);

    console.debug("finished to go to next question");

    return createEphemeralResponse("Quiz restarted at the next question.");
  }
}
