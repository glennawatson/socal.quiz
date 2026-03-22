import type { Question } from "../question.interfaces.js";
import {
  ActionRowBuilder,
  ButtonBuilder,
  EmbedBuilder,
} from "@discordjs/builders";
import { Routes } from "discord-api-types/v10";
import { QuizImageStorage } from "../util/quizImageStorage.js";
import { REST } from "@discordjs/rest";
import type { QuizState } from "./quizState.interfaces.js";
import type { InterQuestionMessage } from "../quizConfig.interfaces.js";
import { composeAnswerGrid } from "../util/answerImageComposer.js";

/**
 * Posts a question summary embed showing the correct answer, how many users
 * answered correctly, and an optional explanation with image.
 *
 * @param rest - The Discord REST client.
 * @param imageStorage - The image storage for retrieving presigned URLs.
 * @param question - The question to summarize.
 * @param quiz - The current quiz state.
 * @param questionNumber - The 1-based question number.
 * @returns A promise that resolves when the summary is posted.
 */
export async function sendQuestionSummary(
  rest: REST,
  imageStorage: QuizImageStorage,
  question: Question,
  quiz: QuizState,
  questionNumber: number,
): Promise<void> {
  const correctAnswer = question.answers.find(
    (x) => x.answerId === question.correctAnswerId,
  );

  if (!correctAnswer) {
    return;
  }

  const correctAnswerText: string = correctAnswer.answer;
  const correctCount: number = quiz.correctUsersForQuestion.size;

  const summaryEmbed = new EmbedBuilder()
    .setTitle(`Summary for Question ${questionNumber}`)
    .setDescription(
      `${correctCount} user(s) answered correctly!\n` +
        `The correct answer was: ${correctAnswerText}` +
        (question.explanation ? `\nExplanation: ${question.explanation}` : ""),
    );

  if (question.explanationImagePartitionKey) {
    const imageUrl: string = await imageStorage.getExplanationImagePresignedUrl(
      question.questionId,
    );
    summaryEmbed.setImage(imageUrl);
  }

  await rest.post(Routes.channelMessages(quiz.channelId), {
    body: {
      embeds: [summaryEmbed.toJSON()],
    },
  });
}

/**
 * Posts a quiz question embed with answer buttons to a Discord channel.
 * If answers have images, composes them into a labeled grid.
 * Buttons are split across action rows (max 5 per row, max 6 answers).
 *
 * @param rest - The Discord REST client.
 * @param imageStorage - The image storage for retrieving presigned URLs.
 * @param channelId - The channel to post the question to.
 * @param interactionId - The interaction ID for button custom IDs.
 * @param question - The question to post.
 * @returns A promise that resolves when the question is posted.
 */
export async function postQuestion(
  rest: REST,
  imageStorage: QuizImageStorage,
  channelId: string,
  interactionId: string,
  question: Question,
): Promise<void> {
  const embed = new EmbedBuilder()
    .setTitle("Quiz Question")
    .setDescription(
      `**Question**: ${question.question}\n` +
        question.answers
          .map(
            (answer, index: number) =>
              `${String.fromCharCode(65 + index)}: ${answer.answer}`,
          )
          .join("\n"),
    )
    .setFooter({
      text: "Select the correct answer by clicking the buttons below.",
    });

  const hasAnswerImages: boolean = question.answers.some((a) => a.imagePartitionKey);

  if (hasAnswerImages) {
    // Compose a grid image from answer images
    try {
      const gridBuffer: Buffer = await composeAnswerGrid(
        question.answers,
        question.questionId,
        imageStorage,
      );
      // Upload grid as a temporary blob and get presigned URL
      const gridKey = `${question.questionId}-answer-grid`;
      await imageStorage.uploadImageBuffer(
        gridBuffer,
        "AnswerImage",
        `${gridKey}.jpg`,
      );
      const gridUrl: string = await imageStorage.getPresignedUrl(
        "AnswerImage",
        gridKey,
      );
      embed.setImage(gridUrl);
    } catch (error) {
      console.error(`Failed to compose answer grid: ${String(error)}`);
    }
  } else if (question.imagePartitionKey) {
    const imageUrl: string = await imageStorage.getQuestionImagePresignedUrl(
      question.questionId,
    );
    embed.setImage(imageUrl);
  }

  const maxAnswers = 6;
  const buttonsPerRow = 5;
  const limitedAnswers = question.answers.slice(0, maxAnswers);

  const actionRows: ActionRowBuilder<ButtonBuilder>[] = [];
  for (let i = 0; i < limitedAnswers.length; i += buttonsPerRow) {
    const chunk = limitedAnswers.slice(i, i + buttonsPerRow);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      chunk.map((answer, chunkIndex: number) =>
        new ButtonBuilder()
          .setCustomId(`answer_${interactionId}_${answer.answerId}`)
          .setLabel(String.fromCharCode(65 + i + chunkIndex))
          .setStyle(1),
      ),
    );
    actionRows.push(row);
  }

  console.debug(`sending quiz question/answers to channel ${channelId}`);
  await rest.post(Routes.channelMessages(channelId), {
    body: {
      embeds: [embed.toJSON()],
      components: actionRows.map((row) => row.toJSON()),
    },
  });
  console.debug(`sent quiz question/answers to channel ${channelId}`);
}

/**
 * Posts the final quiz leaderboard, sorted by score descending, to the channel.
 *
 * @param rest - The Discord REST client.
 * @param quiz - The current quiz state.
 * @returns A promise that resolves when scores are posted.
 */
export async function showScores(rest: REST, quiz: QuizState): Promise<void> {
  const channelId: string = quiz.channelId;

  console.debug(
    `showing the scores for quiz in ${quiz.channelId} with ${quiz.activeUsers.size} user entries.`,
  );

  const scoreEntries: [string, number][] = quiz.activeUsers.entries()
    .toArray()
    .sort(([, scoreA], [, scoreB]) => scoreB - scoreA); // Higher scores first

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

  await rest.post(Routes.channelMessages(channelId), {
    body: {
      embeds: [summaryEmbed.toJSON()],
    },
  });
}

/**
 * Posts a configured inter-question message embed with optional image to the channel.
 *
 * @param rest - The Discord REST client.
 * @param channelId - The channel to post the message to.
 * @param message - The inter-question message content.
 * @returns A promise that resolves when the message is posted.
 */
export async function postInterQuestionMessage(
  rest: REST,
  channelId: string,
  message: InterQuestionMessage,
): Promise<void> {
  const embed = new EmbedBuilder()
    .setTitle("Did you know?")
    .setDescription(message.content);

  if (message.imageUrl) {
    embed.setImage(message.imageUrl);
  }

  await rest.post(Routes.channelMessages(channelId), {
    body: {
      embeds: [embed.toJSON()],
    },
  });
}
