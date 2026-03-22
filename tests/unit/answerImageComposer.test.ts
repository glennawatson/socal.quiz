import { afterEach, describe, it, expect, beforeEach, vi } from "vitest";
import { composeAnswerGrid } from "../../src/util/answerImageComposer.js";
import type { Answer } from "../../src/answer.interfaces.js";
import type { QuizImageStorage } from "../../src/util/quizImageStorage.js";

const sharpInstanceMock = {
  resize: vi.fn().mockReturnThis(),
  toBuffer: vi.fn().mockResolvedValue(Buffer.from("resized-image")),
};

const sharpCreateMock = {
  composite: vi.fn().mockReturnThis(),
  jpeg: vi.fn().mockReturnThis(),
  toBuffer: vi.fn().mockResolvedValue(Buffer.from("final-jpeg")),
};

vi.mock("sharp", () => ({
  default: vi.fn((input: any) => {
    if (input && typeof input === "object" && "create" in input) {
      return sharpCreateMock;
    }
    return sharpInstanceMock;
  }),
}));

const originalFetch = global.fetch;

describe("composeAnswerGrid", () => {
  let imageStorageMock: QuizImageStorage;

  beforeEach(() => {
    vi.clearAllMocks();

    sharpInstanceMock.resize.mockReturnThis();
    sharpInstanceMock.toBuffer.mockResolvedValue(Buffer.from("resized-image"));
    sharpCreateMock.composite.mockReturnThis();
    sharpCreateMock.jpeg.mockReturnThis();
    sharpCreateMock.toBuffer.mockResolvedValue(Buffer.from("final-jpeg"));

    imageStorageMock = {
      getAnswerImagePresignedUrl: vi
        .fn()
        .mockResolvedValue("https://mock-presigned-url.com/image.jpg"),
    } as unknown as QuizImageStorage;

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () =>
        Promise.resolve(Buffer.from("image-bytes").buffer),
    } as unknown as Response);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("should throw when no answers have images", async () => {
    const answers: Answer[] = [
      { answerId: "a1", answer: "Answer 1" },
      { answerId: "a2", answer: "Answer 2" },
    ];

    await expect(
      composeAnswerGrid(answers, "q1", imageStorageMock),
    ).rejects.toThrow("No answers with images to compose");
  });

  it("should compose a grid for a single answer with image", async () => {
    const answers: Answer[] = [
      { answerId: "a1", answer: "Answer 1", imagePartitionKey: "img1" },
    ];

    const result = await composeAnswerGrid(answers, "q1", imageStorageMock);

    expect(result).toEqual(Buffer.from("final-jpeg"));
    expect(imageStorageMock.getAnswerImagePresignedUrl).toHaveBeenCalledWith(
      "q1",
      "a1",
    );
    expect(global.fetch).toHaveBeenCalledWith(
      "https://mock-presigned-url.com/image.jpg",
    );
    expect(sharpInstanceMock.resize).toHaveBeenCalledWith(400, 300, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    });
    // Canvas should be created with 2 columns, 1 row
    expect(sharpCreateMock.composite).toHaveBeenCalledOnce();
    expect(sharpCreateMock.jpeg).toHaveBeenCalledWith({ quality: 85 });
  });

  it("should compose a grid for multiple answers with images", async () => {
    const answers: Answer[] = [
      { answerId: "a1", answer: "Answer A", imagePartitionKey: "img1" },
      { answerId: "a2", answer: "Answer B", imagePartitionKey: "img2" },
      { answerId: "a3", answer: "Answer C", imagePartitionKey: "img3" },
    ];

    const result = await composeAnswerGrid(answers, "q1", imageStorageMock);

    expect(result).toEqual(Buffer.from("final-jpeg"));
    expect(imageStorageMock.getAnswerImagePresignedUrl).toHaveBeenCalledTimes(3);
    expect(imageStorageMock.getAnswerImagePresignedUrl).toHaveBeenCalledWith("q1", "a1");
    expect(imageStorageMock.getAnswerImagePresignedUrl).toHaveBeenCalledWith("q1", "a2");
    expect(imageStorageMock.getAnswerImagePresignedUrl).toHaveBeenCalledWith("q1", "a3");

    // Should have composites: 3 images + 3 labels = 6
    const compositeCall = sharpCreateMock.composite.mock.calls[0][0];
    expect(compositeCall).toHaveLength(6);
  });

  it("should use correct labels mapped to original answer indices", async () => {
    // Mix of answers with and without images -- labels should correspond to original index
    const answers: Answer[] = [
      { answerId: "a1", answer: "Answer A" }, // no image, index 0 = 'A'
      { answerId: "a2", answer: "Answer B", imagePartitionKey: "img2" }, // index 1 = 'B'
      { answerId: "a3", answer: "Answer C" }, // no image, index 2 = 'C'
      { answerId: "a4", answer: "Answer D", imagePartitionKey: "img4" }, // index 3 = 'D'
    ];

    await composeAnswerGrid(answers, "q1", imageStorageMock);

    const compositeCall = sharpCreateMock.composite.mock.calls[0][0];
    // 2 images + 2 labels = 4 composites
    expect(compositeCall).toHaveLength(4);

    // Extract label SVGs (odd indices: 1 and 3)
    const label1Svg = compositeCall[1].input.toString();
    const label2Svg = compositeCall[3].input.toString();

    expect(label1Svg).toContain(">B<");
    expect(label2Svg).toContain(">D<");
  });

  it("should only include answers that have imagePartitionKey", async () => {
    const answers: Answer[] = [
      { answerId: "a1", answer: "Answer A" },
      { answerId: "a2", answer: "Answer B", imagePartitionKey: "img2" },
    ];

    await composeAnswerGrid(answers, "q1", imageStorageMock);

    expect(imageStorageMock.getAnswerImagePresignedUrl).toHaveBeenCalledTimes(1);
    expect(imageStorageMock.getAnswerImagePresignedUrl).toHaveBeenCalledWith(
      "q1",
      "a2",
    );
  });

  it("should throw when fetch for an answer image fails", async () => {
    const answers: Answer[] = [
      { answerId: "a1", answer: "Answer A", imagePartitionKey: "img1" },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      statusText: "Not Found",
    } as unknown as Response);

    await expect(
      composeAnswerGrid(answers, "q1", imageStorageMock),
    ).rejects.toThrow("Failed to fetch answer image: Not Found");
  });

  it("should position images in a 2-column grid layout", async () => {
    const answers: Answer[] = [
      { answerId: "a1", answer: "A", imagePartitionKey: "img1" },
      { answerId: "a2", answer: "B", imagePartitionKey: "img2" },
      { answerId: "a3", answer: "C", imagePartitionKey: "img3" },
    ];

    await composeAnswerGrid(answers, "q1", imageStorageMock);

    const compositeCall = sharpCreateMock.composite.mock.calls[0][0];

    // Image composites at indices 0, 2, 4
    // First image: col=0, row=0 -> left=0, top=0
    expect(compositeCall[0].left).toBe(0);
    expect(compositeCall[0].top).toBe(0);

    // Second image: col=1, row=0 -> left=400, top=0
    expect(compositeCall[2].left).toBe(400);
    expect(compositeCall[2].top).toBe(0);

    // Third image: col=0, row=1 -> left=0, top=300
    expect(compositeCall[4].left).toBe(0);
    expect(compositeCall[4].top).toBe(300);
  });
});
