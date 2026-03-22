import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SoundboardStorage } from "../../src/util/soundboardStorage.js";
import { fileTypeFromBuffer } from "file-type";
import {
  BlobServiceClient,
  generateBlobSASQueryParameters,
  type SASQueryParameters,
} from "@azure/storage-blob";

vi.mock("@azure/storage-blob", () => ({
  BlobServiceClient: {
    fromConnectionString: vi.fn(),
  },
  StorageSharedKeyCredential: vi.fn(),
  generateBlobSASQueryParameters: vi.fn(),
  BlobSASPermissions: {
    parse: vi.fn(),
  },
}));

vi.mock("file-type", () => ({
  fileTypeFromBuffer: vi.fn(),
}));

const originalFetch = global.fetch;

describe("SoundboardStorage", () => {
  let storage: SoundboardStorage;
  let blobServiceClientMock: any;
  let blockBlobClientMock: any;
  let containerClientMock: any;
  let previousAccountKey: string | undefined;
  let previousAccountName: string | undefined;

  beforeEach(() => {
    vi.clearAllMocks();

    previousAccountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
    previousAccountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;

    blockBlobClientMock = {
      url: "https://mock.blob.core.windows.net/SoundboardAudio/guild1/sound1.mp3",
      uploadData: vi.fn().mockResolvedValue(undefined),
      download: vi.fn(),
      deleteIfExists: vi.fn().mockResolvedValue(undefined),
    };

    containerClientMock = {
      createIfNotExists: vi.fn().mockResolvedValue(undefined),
      getBlockBlobClient: vi.fn().mockReturnValue(blockBlobClientMock),
      listBlobsFlat: vi.fn(),
    };

    blobServiceClientMock = {
      getContainerClient: vi.fn().mockReturnValue(containerClientMock),
    };

    storage = new SoundboardStorage(
      "mock-connection-string",
      "mock-key",
      "mock-name",
      blobServiceClientMock,
    );

    vi.mocked(fileTypeFromBuffer).mockReset();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (previousAccountKey) {
      process.env.AZURE_STORAGE_ACCOUNT_KEY = previousAccountKey;
    } else {
      delete process.env.AZURE_STORAGE_ACCOUNT_KEY;
    }
    if (previousAccountName) {
      process.env.AZURE_STORAGE_ACCOUNT_NAME = previousAccountName;
    } else {
      delete process.env.AZURE_STORAGE_ACCOUNT_NAME;
    }
  });

  describe("constructor", () => {
    it("should use provided BlobServiceClient", () => {
      const customClient = { getContainerClient: vi.fn() };
      const s = new SoundboardStorage(
        undefined,
        "key",
        "name",
        customClient as any,
      );
      expect(s["blobClient"]).toBe(customClient);
    });

    it("should create client from connection string when no client provided", () => {
      new SoundboardStorage("my-conn-str", "key", "name");
      expect(BlobServiceClient.fromConnectionString).toHaveBeenCalledWith(
        "my-conn-str",
      );
    });

    it("should throw when no connection string and no client provided", () => {
      expect(
        () => new SoundboardStorage(undefined, "key", "name"),
      ).toThrow("invalid connection string");
    });

    it("should throw when storage account key env var is missing", () => {
      delete process.env.AZURE_STORAGE_ACCOUNT_KEY;
      expect(
        () => new SoundboardStorage("conn"),
      ).toThrow("invalid storage account key");
    });

    it("should throw when storage account name env var is missing", () => {
      delete process.env.AZURE_STORAGE_ACCOUNT_NAME;
      expect(
        () => new SoundboardStorage("conn", "key"),
      ).toThrow("invalid storage account name");
    });
  });

  describe("downloadAndStoreSound", () => {
    it("should download, validate, and store a valid audio file", async () => {
      const audioBuffer = Buffer.from("audio-data");

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(audioBuffer.buffer),
      } as unknown as Response);

      vi.mocked(fileTypeFromBuffer).mockResolvedValue({
        mime: "audio/mpeg",
        ext: "mp3",
      } as any);

      const result = await storage.downloadAndStoreSound(
        "https://example.com/audio.mp3",
        "guild1",
        "sound1",
      );

      expect(result).toBe("guild1/sound1.mp3");
      expect(containerClientMock.createIfNotExists).toHaveBeenCalled();
      expect(containerClientMock.getBlockBlobClient).toHaveBeenCalledWith(
        "guild1/sound1.mp3",
      );
      expect(blockBlobClientMock.uploadData).toHaveBeenCalledWith(
        expect.any(Buffer),
        { blobHTTPHeaders: { blobContentType: "audio/mpeg" } },
      );
    });

    it("should throw when file exceeds 10MB", async () => {
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(largeBuffer.buffer),
      } as unknown as Response);

      await expect(
        storage.downloadAndStoreSound(
          "https://example.com/big.mp3",
          "guild1",
          "sound1",
        ),
      ).rejects.toThrow("Audio file exceeds 10MB size limit.");
    });

    it("should throw when MIME type is invalid", async () => {
      const audioBuffer = Buffer.from("audio-data");

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(audioBuffer.buffer),
      } as unknown as Response);

      vi.mocked(fileTypeFromBuffer).mockResolvedValue({
        mime: "application/pdf",
        ext: "pdf",
      } as any);

      await expect(
        storage.downloadAndStoreSound(
          "https://example.com/file.pdf",
          "guild1",
          "sound1",
        ),
      ).rejects.toThrow("Invalid audio file type.");
    });

    it("should throw when fileTypeFromBuffer returns undefined", async () => {
      const audioBuffer = Buffer.from("audio-data");

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(audioBuffer.buffer),
      } as unknown as Response);

      vi.mocked(fileTypeFromBuffer).mockResolvedValue(undefined);

      await expect(
        storage.downloadAndStoreSound(
          "https://example.com/unknown",
          "guild1",
          "sound1",
        ),
      ).rejects.toThrow("Invalid audio file type.");
    });

    it("should throw when fetch fails", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      } as unknown as Response);

      await expect(
        storage.downloadAndStoreSound(
          "https://example.com/missing.mp3",
          "guild1",
          "sound1",
        ),
      ).rejects.toThrow("Failed to fetch audio: 404 Not Found");
    });
  });

  describe("getSoundPresignedUrl", () => {
    it("should return a presigned URL", () => {
      const mockSASQueryParameters = {
        toString: vi.fn().mockReturnValue("sas-token"),
      } as unknown as SASQueryParameters;

      vi.mocked(generateBlobSASQueryParameters).mockReturnValue(
        mockSASQueryParameters,
      );

      const url = storage.getSoundPresignedUrl("guild1/sound1.mp3");

      expect(url).toBe(
        `${blockBlobClientMock.url}?sas-token`,
      );
      expect(blobServiceClientMock.getContainerClient).toHaveBeenCalledWith(
        "SoundboardAudio",
      );
      expect(containerClientMock.getBlockBlobClient).toHaveBeenCalledWith(
        "guild1/sound1.mp3",
      );
    });
  });

  describe("downloadSound", () => {
    it("should download and return buffer from stream", async () => {
      const chunk1 = Buffer.from("chunk1");
      const chunk2 = Buffer.from("chunk2");

      const asyncIterable = {
        [Symbol.asyncIterator]: () => {
          let i = 0;
          const chunks = [chunk1, chunk2];
          return {
            next: async () => {
              if (i < chunks.length) {
                return { value: chunks[i++], done: false };
              }
              return { value: undefined, done: true };
            },
          };
        },
      };

      blockBlobClientMock.download.mockResolvedValue({
        readableStreamBody: asyncIterable,
      });

      const result = await storage.downloadSound("guild1/sound1.mp3");

      expect(result).toEqual(Buffer.concat([chunk1, chunk2]));
      expect(blockBlobClientMock.download).toHaveBeenCalledWith(0);
    });

    it("should throw when readableStreamBody is missing", async () => {
      blockBlobClientMock.download.mockResolvedValue({
        readableStreamBody: undefined,
      });

      await expect(
        storage.downloadSound("guild1/sound1.mp3"),
      ).rejects.toThrow("No stream body in download response");
    });
  });

  describe("deleteSound", () => {
    it("should delete the blob", async () => {
      await storage.deleteSound("guild1/sound1.mp3");

      expect(containerClientMock.getBlockBlobClient).toHaveBeenCalledWith(
        "guild1/sound1.mp3",
      );
      expect(blockBlobClientMock.deleteIfExists).toHaveBeenCalled();
    });
  });

  describe("listSounds", () => {
    it("should list blobs with the guild prefix", async () => {
      const blobs = [
        { name: "guild1/sound1.mp3" },
        { name: "guild1/sound2.ogg" },
      ];

      containerClientMock.listBlobsFlat.mockReturnValue({
        [Symbol.asyncIterator]: () => {
          let i = 0;
          return {
            next: async () => {
              if (i < blobs.length) {
                return { value: blobs[i++], done: false };
              }
              return { value: undefined, done: true };
            },
          };
        },
      });

      const result = await storage.listSounds("guild1");

      expect(result).toEqual(["guild1/sound1.mp3", "guild1/sound2.ogg"]);
      expect(containerClientMock.listBlobsFlat).toHaveBeenCalledWith({
        prefix: "guild1/",
      });
    });

    it("should return empty array when no blobs exist", async () => {
      containerClientMock.listBlobsFlat.mockReturnValue({
        [Symbol.asyncIterator]: () => ({
          next: async () => ({ value: undefined, done: true }),
        }),
      });

      const result = await storage.listSounds("guild-empty");
      expect(result).toEqual([]);
    });
  });
});
