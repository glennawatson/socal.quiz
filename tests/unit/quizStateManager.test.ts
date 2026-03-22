import { describe, it, expect, vi, beforeEach } from "vitest";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";
import { QuizState } from "../../src/handlers/quizState.interfaces.js";
import { Question } from "../../src/question.interfaces.js";
import {
  postQuestion,
  postInterQuestionMessage,
  sendQuestionSummary,
  showScores,
} from "../../src/handlers/quizStateManager.js";
import { QuizImageStorage } from "../../src/util/quizImageStorage.js";

vi.mock("../../src/util/quizImageStorage.js");
vi.mock("../../src/util/answerImageComposer.js", () => ({
  composeAnswerGrid: vi.fn(),
}));

describe("Quiz Functions", () => {
  let rest: REST;
  let imageStorage: QuizImageStorage;
  let quiz: QuizState;
  let question: Question;

  let mockRestPost = vi.fn();
  let mockGetExplanationImagePresignedUrl = vi.fn();
  let mockGetQuestionImagePresignedUrl = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockRestPost = vi.fn();
    mockGetExplanationImagePresignedUrl = vi.fn();
    mockGetQuestionImagePresignedUrl = vi.fn();

    rest = new REST();
    imageStorage = new QuizImageStorage();

    rest.post = mockRestPost;

    imageStorage.getExplanationImagePresignedUrl =
      mockGetExplanationImagePresignedUrl;
    imageStorage.getQuestionImagePresignedUrl =
      mockGetQuestionImagePresignedUrl;

    quiz = {
      answeredUsersForQuestion: new Set(),
      currentQuestionId: "",
      guildId: "123",
      questionBank: [],
      correctUsersForQuestion: new Set(["user1", "user2"]),
      channelId: "channel-id",
      activeUsers: new Map([
        ["user1", 10],
        ["user2", 8],
        ["user3", 5],
      ]),
      advanceMode: "auto",
      summaryDurationMs: 5000,
      interQuestionMessages: [],
    };
    question = {
      questionShowTimeMs: 10,
      questionId: "questionId",
      question: "What is the capital of France?",
      answers: [
        { answerId: "1", answer: "Paris" },
        { answerId: "2", answer: "London" },
        { answerId: "3", answer: "Berlin" },
      ],
      correctAnswerId: "1",
      explanation: "Paris is the capital of France.",
      explanationImagePartitionKey: "explanationImage",
      imagePartitionKey: "questionImage",
    };
  });

  it("should return if no correct answer is found", async () => {
    // Set the correctAnswerId to an ID that doesn't exist in the question.answers array
    question.correctAnswerId = "nonexistent-id";

    // Mock the getExplanationImagePresignedUrl method
    mockGetExplanationImagePresignedUrl.mockResolvedValue(
      "https://example.com/ImageUrl",
    );

    // Call the sendQuestionSummary function
    await sendQuestionSummary(rest, imageStorage, question, quiz, 1);

    // Expect that rest.post was not called since there was no correct answer
    expect(mockRestPost).not.toHaveBeenCalled();
  });

  it("should send question summary", async () => {
    mockGetExplanationImagePresignedUrl.mockResolvedValue(
      "https://example.com/ImageUrl",
    );

    await sendQuestionSummary(rest, imageStorage, question, quiz, 1);

    expect(mockRestPost).toHaveBeenCalledWith(
      Routes.channelMessages("channel-id"),
      {
        body: {
          embeds: [
            {
              title: "Summary for Question 1",
              description:
                "2 user(s) answered correctly!\nThe correct answer was: Paris\nExplanation: Paris is the capital of France.",
              image: {
                url: "https://example.com/ImageUrl",
              },
            },
          ],
        },
      },
    );
  });

  it("should post question", async () => {
    mockGetQuestionImagePresignedUrl.mockResolvedValue(
      "https://example.com/ImageUrl",
    );

    await postQuestion(
      rest,
      imageStorage,
      "channel-id",
      "interaction-id",
      question,
    );

    expect(mockRestPost).toHaveBeenCalledWith(
      Routes.channelMessages("channel-id"),
      {
        body: {
          embeds: [
            {
              title: "Quiz Question",
              description:
                "**Question**: What is the capital of France?\nA: Paris\nB: London\nC: Berlin",
              footer: {
                text: "Select the correct answer by clicking the buttons below.",
              },
              image: {
                url: "https://example.com/ImageUrl",
              },
            },
          ],
          components: [
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 1,
                  custom_id: "answer_interaction-id_1",
                  label: "A",
                },
                {
                  type: 2,
                  style: 1,
                  custom_id: "answer_interaction-id_2",
                  label: "B",
                },
                {
                  type: 2,
                  style: 1,
                  custom_id: "answer_interaction-id_3",
                  label: "C",
                },
              ],
            },
          ],
        },
      },
    );
  });

  it("should show scores", async () => {
    await showScores(rest, quiz);

    expect(mockRestPost).toHaveBeenCalledWith(
      Routes.channelMessages("channel-id"),
      {
        body: {
          embeds: [
            {
              title: "Quiz Scores",
              description:
                "<@user1>: 10 points\n<@user2>: 8 points\n<@user3>: 5 points\n",
            },
          ],
        },
      },
    );
  });

  it("should handle no scores", async () => {
    quiz.activeUsers.clear();

    await showScores(rest, quiz);

    expect(mockRestPost).toHaveBeenCalledWith(
      Routes.channelMessages("channel-id"),
      {
        body: {
          embeds: [
            {
              title: "Quiz Scores",
              description: "No scores available.",
            },
          ],
        },
      },
    );
  });

  it("should post scores even with empty channelId", async () => {
    quiz.channelId = "";

    await showScores(rest, quiz);

    expect(mockRestPost).toHaveBeenCalled();
  });

  it("should handle question summary without explanation", async () => {
    question.explanation = "";

    await sendQuestionSummary(rest, imageStorage, question, quiz, 1);

    expect(mockRestPost).toHaveBeenCalledWith(
      Routes.channelMessages("channel-id"),
      {
        body: {
          embeds: [
            {
              title: "Summary for Question 1",
              description:
                "2 user(s) answered correctly!\nThe correct answer was: Paris",
            },
          ],
        },
      },
    );
  });

  describe("postQuestion with answer images", () => {
    it("should compose answer grid when answers have images", async () => {
      const { composeAnswerGrid } = await import("../../src/util/answerImageComposer.js");
      const mockComposeAnswerGrid = vi.mocked(composeAnswerGrid);
      const gridBuffer = Buffer.from("grid-image-data");
      mockComposeAnswerGrid.mockResolvedValue(gridBuffer);

      const mockUploadImageBuffer = vi.fn().mockResolvedValue(undefined);
      const mockGetPresignedUrl = vi.fn().mockResolvedValue("https://example.com/grid.jpg");
      imageStorage.uploadImageBuffer = mockUploadImageBuffer;
      imageStorage.getPresignedUrl = mockGetPresignedUrl;

      const questionWithAnswerImages: Question = {
        questionShowTimeMs: 10,
        questionId: "questionId",
        question: "Which image is correct?",
        answers: [
          { answerId: "1", answer: "Option A", imagePartitionKey: "img1" },
          { answerId: "2", answer: "Option B", imagePartitionKey: "img2" },
        ],
        correctAnswerId: "1",
      };

      await postQuestion(
        rest,
        imageStorage,
        "channel-id",
        "interaction-id",
        questionWithAnswerImages,
      );

      expect(mockComposeAnswerGrid).toHaveBeenCalledWith(
        questionWithAnswerImages.answers,
        "questionId",
        imageStorage,
      );
      expect(mockUploadImageBuffer).toHaveBeenCalledWith(
        gridBuffer,
        "AnswerImage",
        "questionId-answer-grid.jpg",
      );
      expect(mockGetPresignedUrl).toHaveBeenCalledWith(
        "AnswerImage",
        "questionId-answer-grid",
      );
      expect(mockRestPost).toHaveBeenCalledWith(
        Routes.channelMessages("channel-id"),
        expect.objectContaining({
          body: expect.objectContaining({
            embeds: [
              expect.objectContaining({
                image: { url: "https://example.com/grid.jpg" },
              }),
            ],
          }),
        }),
      );
    });

    it("should handle composeAnswerGrid error gracefully", async () => {
      const { composeAnswerGrid } = await import("../../src/util/answerImageComposer.js");
      const mockComposeAnswerGrid = vi.mocked(composeAnswerGrid);
      mockComposeAnswerGrid.mockRejectedValue(new Error("Grid composition failed"));

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const questionWithAnswerImages: Question = {
        questionShowTimeMs: 10,
        questionId: "questionId",
        question: "Which image is correct?",
        answers: [
          { answerId: "1", answer: "Option A", imagePartitionKey: "img1" },
          { answerId: "2", answer: "Option B", imagePartitionKey: "img2" },
        ],
        correctAnswerId: "1",
      };

      await postQuestion(
        rest,
        imageStorage,
        "channel-id",
        "interaction-id",
        questionWithAnswerImages,
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to compose answer grid"),
      );
      // Should still post the question, just without the image
      expect(mockRestPost).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("postQuestion with no images at all", () => {
    it("should post question without any image when neither answer images nor question image exist", async () => {
      const questionNoImages: Question = {
        questionShowTimeMs: 10,
        questionId: "questionId",
        question: "What is 1 + 1?",
        answers: [
          { answerId: "1", answer: "1" },
          { answerId: "2", answer: "2" },
        ],
        correctAnswerId: "2",
      };

      await postQuestion(
        rest,
        imageStorage,
        "channel-id",
        "interaction-id",
        questionNoImages,
      );

      expect(mockRestPost).toHaveBeenCalledWith(
        Routes.channelMessages("channel-id"),
        expect.objectContaining({
          body: expect.objectContaining({
            embeds: [
              expect.not.objectContaining({
                image: expect.anything(),
              }),
            ],
          }),
        }),
      );
    });
  });

  describe("postInterQuestionMessage", () => {
    it("should post a message with text content", async () => {
      await postInterQuestionMessage(rest, "channel-id", {
        messageId: "m1",
        content: "Fun fact: The sky is blue!",
      });

      expect(mockRestPost).toHaveBeenCalledWith(
        Routes.channelMessages("channel-id"),
        {
          body: {
            embeds: [
              {
                title: "Did you know?",
                description: "Fun fact: The sky is blue!",
              },
            ],
          },
        },
      );
    });

    it("should post a message with image", async () => {
      await postInterQuestionMessage(rest, "channel-id", {
        messageId: "m2",
        content: "Check this out!",
        imageUrl: "https://example.com/image.png",
      });

      expect(mockRestPost).toHaveBeenCalledWith(
        Routes.channelMessages("channel-id"),
        {
          body: {
            embeds: [
              {
                title: "Did you know?",
                description: "Check this out!",
                image: { url: "https://example.com/image.png" },
              },
            ],
          },
        },
      );
    });
  });
});
