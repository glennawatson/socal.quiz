import sharp from "sharp";
import type { Answer } from "../answer.interfaces.js";
import type { QuizImageStorage } from "./quizImageStorage.js";

const CELL_WIDTH = 400;
const CELL_HEIGHT = 300;
const LABEL_SIZE = 40;
const COLUMNS = 2;

/**
 * Composes a grid image of answer images for a quiz question.
 *
 * Downloads each answer's image via presigned URLs, resizes them into uniform
 * cells, overlays a letter label (A, B, C, ...) on each cell, and returns
 * the final composite as a JPEG buffer.
 *
 * @param answers - The full list of answers for the question (only those with `imagePartitionKey` are included).
 * @param questionId - The ID of the question these answers belong to.
 * @param imageStorage - The image storage client used to generate presigned URLs.
 * @returns A JPEG buffer containing the composed answer grid image.
 */
export async function composeAnswerGrid(
  answers: Answer[],
  questionId: string,
  imageStorage: QuizImageStorage,
): Promise<Buffer> {
  const answersWithImages = answers.filter((a) => a.imagePartitionKey);
  if (answersWithImages.length === 0) {
    throw new Error("No answers with images to compose");
  }

  const rows = Math.ceil(answersWithImages.length / COLUMNS);
  const totalWidth = COLUMNS * CELL_WIDTH;
  const totalHeight = rows * CELL_HEIGHT;

  const composites: sharp.OverlayOptions[] = [];

  for (let i = 0; i < answersWithImages.length; i++) {
    const answer = answersWithImages[i];
    if (!answer) continue;

    const answerIndex = answers.indexOf(answer);
    const label = String.fromCharCode(65 + answerIndex);

    const imageUrl = await imageStorage.getAnswerImagePresignedUrl(
      questionId,
      answer.answerId,
    );

    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch answer image: ${response.statusText}`);
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());

    const resizedImage = await sharp(imageBuffer)
      .resize(CELL_WIDTH, CELL_HEIGHT, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .toBuffer();

    const col = i % COLUMNS;
    const row = Math.floor(i / COLUMNS);

    composites.push({
      input: resizedImage,
      left: col * CELL_WIDTH,
      top: row * CELL_HEIGHT,
    });

    // Add label overlay
    const labelSvg = Buffer.from(
      `<svg width="${LABEL_SIZE * 2}" height="${LABEL_SIZE}">
        <rect width="${LABEL_SIZE * 2}" height="${LABEL_SIZE}" rx="4" fill="rgba(0,0,0,0.7)"/>
        <text x="${LABEL_SIZE}" y="${LABEL_SIZE * 0.75}" font-size="${LABEL_SIZE * 0.6}" fill="white" text-anchor="middle" font-family="sans-serif" font-weight="bold">${label}</text>
      </svg>`,
    );

    composites.push({
      input: labelSvg,
      left: col * CELL_WIDTH + 8,
      top: row * CELL_HEIGHT + 8,
    });
  }

  return sharp({
    create: {
      width: totalWidth,
      height: totalHeight,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .composite(composites)
    .jpeg({ quality: 85 })
    .toBuffer();
}
