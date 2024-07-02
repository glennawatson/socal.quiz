import { Question } from "../question.interfaces.js";
import {
  ActionRowBuilder,
  ButtonBuilder,
  EmbedBuilder,
} from "@discordjs/builders";
import { Routes } from "discord-api-types/v10";
import { QuizImageStorage } from "../util/quizImageStorage.js";
import { REST } from "@discordjs/rest";
import { QuizState } from "./quizState.interfaces.js";

export async function sendQuestionSummary(
  rest: REST,
  imageStorage: QuizImageStorage,
  question: Question,
  quiz: QuizState,
  questionNumber: number,
) {
  const correctAnswer = question.answers.find(
    (x) => x.answerId === question.correctAnswerId,
  );

  if (!correctAnswer) {
    return;
  }

  const correctAnswerText = correctAnswer.answer;

  const correctCount = quiz.correctUsersForQuestion.size;

  const summaryEmbed = new EmbedBuilder()
    .setTitle(`Summary for Question ${questionNumber}`)
    .setDescription(
      `${correctCount} user(s) answered correctly!\n` +
        `The correct answer was: ${correctAnswerText}` +
        (question.explanation ? `\nExplanation: ${question.explanation}` : ""),
    );

  if (question.explanationImagePartitionKey) {
    const imageUrl = await imageStorage.getExplanationImagePresignedUrl(
      question.guildId,
      question.bankName,
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

export async function postQuestion(
  rest: REST,
  imageStorage: QuizImageStorage,
  channelId: string,
  interactionId: string,
  question: Question,
) {
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
    const imageUrl = await imageStorage.getQuestionImagePresignedUrl(
      question.guildId,
      question.bankName,
      question.questionId,
    );
    embed.setImage(imageUrl);
  }

  const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    question.answers.map((answer, index) =>
      new ButtonBuilder()
        .setCustomId(`answer_${interactionId}_${answer.answerId}`)
        .setLabel(String.fromCharCode(65 + index))
        .setStyle(1),
    ),
  );

  console.debug(`sending quiz question/answers to channel ${channelId}`);
  await rest.post(Routes.channelMessages(channelId), {
    body: {
      embeds: [embed.toJSON()],
      components: [buttons.toJSON()],
    },
  });
  console.debug(`sent quiz question/answers to channel ${channelId}`);
}

export async function showScores(rest: REST, quiz: QuizState) {
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

  await rest.post(Routes.channelMessages(channelId), {
    body: {
      embeds: [summaryEmbed.toJSON()],
    },
  });
}
