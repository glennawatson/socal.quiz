import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import {
  uploadSoundHandler,
  listSoundsHandler,
  deleteSoundHandler,
} from "../../src/functions/soundboardHttpTriggers.js";
import { Config } from "../../src/util/config.js";
import * as authHelper from "../../src/util/authHelper.js";

vi.mock("../../src/util/authHelper.js", () => ({
  validateAuthAndGuildOwnership: vi.fn(),
  isErrorResponse: vi.fn(),
}));

const validateAuthMock = vi.mocked(authHelper.validateAuthAndGuildOwnership);
const isErrorResponseMock = vi.mocked(authHelper.isErrorResponse);

const mockSoundboardStorage = {
  downloadAndStoreSound: vi.fn(),
  listSounds: vi.fn(),
  deleteSound: vi.fn(),
};

const createMockHttpRequest = (
  options: {
    method?: string;
    query?: Record<string, string>;
    body?: string;
  } = {},
): HttpRequest => {
  const queryMap = new Map(Object.entries(options.query ?? {}));
  return {
    method: options.method ?? "GET",
    url: "http://localhost:7071/api/sounds",
    headers: new Map<string, string>(),
    query: {
      get: (key: string) => queryMap.get(key) ?? null,
      getAll: (key: string) => {
        const val = queryMap.get(key);
        return val ? [val] : [];
      },
    },
    text: async () => options.body ?? "",
  } as unknown as HttpRequest;
};

const createMockContext = (): InvocationContext =>
  ({
    log: vi.fn(),
    error: vi.fn(),
  }) as unknown as InvocationContext;

describe("soundboardHttpTriggers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (Config as any).soundboardStorage = mockSoundboardStorage;
    (Config as any)["_initialized"] = true;
    (Config as any)["_initializePromise"] = Promise.resolve(new Config());
  });

  describe("uploadSoundHandler", () => {
    it("should return auth error when authentication fails", async () => {
      const authError: HttpResponseInit = {
        status: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify("Authorization token is missing"),
      };
      validateAuthMock.mockResolvedValue(authError);
      isErrorResponseMock.mockReturnValue(true);

      const req = createMockHttpRequest({ method: "POST" });
      const context = createMockContext();

      const response = await uploadSoundHandler(req, context);

      expect(response.status).toBe(401);
    });

    it("should return 400 for invalid JSON body", async () => {
      const authSuccess = { userId: "user-1", guildId: "guild-1" };
      validateAuthMock.mockResolvedValue(authSuccess);
      isErrorResponseMock.mockReturnValue(false);

      const req = createMockHttpRequest({ method: "POST", body: "not-json{{{" });
      const context = createMockContext();

      const response = await uploadSoundHandler(req, context);

      expect(response.status).toBe(400);
      expect(response.body).toBe(JSON.stringify("Invalid JSON body"));
    });

    it("should return 400 when audioUrl is missing", async () => {
      const authSuccess = { userId: "user-1", guildId: "guild-1" };
      validateAuthMock.mockResolvedValue(authSuccess);
      isErrorResponseMock.mockReturnValue(false);

      const req = createMockHttpRequest({
        method: "POST",
        body: JSON.stringify({ name: "test-sound" }),
      });
      const context = createMockContext();

      const response = await uploadSoundHandler(req, context);

      expect(response.status).toBe(400);
      expect(response.body).toBe(JSON.stringify("Required field: audioUrl"));
    });

    it("should return 200 with soundId and blobName on success with custom name", async () => {
      const authSuccess = { userId: "user-1", guildId: "guild-1" };
      validateAuthMock.mockResolvedValue(authSuccess);
      isErrorResponseMock.mockReturnValue(false);

      mockSoundboardStorage.downloadAndStoreSound.mockResolvedValue("guild-1/my-sound.mp3");

      const req = createMockHttpRequest({
        method: "POST",
        body: JSON.stringify({ audioUrl: "https://example.com/sound.mp3", name: "my-sound" }),
      });
      const context = createMockContext();

      const response = await uploadSoundHandler(req, context);

      expect(response.status).toBe(200);
      const parsed = JSON.parse(response.body as string);
      expect(parsed.soundId).toBe("my-sound");
      expect(parsed.blobName).toBe("guild-1/my-sound.mp3");
      expect(mockSoundboardStorage.downloadAndStoreSound).toHaveBeenCalledWith(
        "https://example.com/sound.mp3",
        "guild-1",
        "my-sound",
      );
    });

    it("should return 200 with auto-generated UUID when name not provided", async () => {
      const authSuccess = { userId: "user-1", guildId: "guild-1" };
      validateAuthMock.mockResolvedValue(authSuccess);
      isErrorResponseMock.mockReturnValue(false);

      mockSoundboardStorage.downloadAndStoreSound.mockResolvedValue("guild-1/auto-id.mp3");

      const req = createMockHttpRequest({
        method: "POST",
        body: JSON.stringify({ audioUrl: "https://example.com/sound.mp3" }),
      });
      const context = createMockContext();

      const response = await uploadSoundHandler(req, context);

      expect(response.status).toBe(200);
      const parsed = JSON.parse(response.body as string);
      // soundId should be a UUID (36 chars with dashes)
      expect(parsed.soundId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(parsed.blobName).toBe("guild-1/auto-id.mp3");
    });

    it("should return 500 on storage error", async () => {
      const authSuccess = { userId: "user-1", guildId: "guild-1" };
      validateAuthMock.mockResolvedValue(authSuccess);
      isErrorResponseMock.mockReturnValue(false);

      mockSoundboardStorage.downloadAndStoreSound.mockRejectedValue(
        new Error("Upload failed"),
      );

      const req = createMockHttpRequest({
        method: "POST",
        body: JSON.stringify({ audioUrl: "https://example.com/sound.mp3" }),
      });
      const context = createMockContext();

      const response = await uploadSoundHandler(req, context);

      expect(response.status).toBe(500);
      expect(response.body).toBe(
        JSON.stringify("Error uploading sound: Upload failed"),
      );
      expect(context.error).toHaveBeenCalled();
    });
  });

  describe("listSoundsHandler", () => {
    it("should return auth error when authentication fails", async () => {
      const authError: HttpResponseInit = {
        status: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify("Authorization token is missing"),
      };
      validateAuthMock.mockResolvedValue(authError);
      isErrorResponseMock.mockReturnValue(true);

      const req = createMockHttpRequest();
      const context = createMockContext();

      const response = await listSoundsHandler(req, context);

      expect(response.status).toBe(401);
    });

    it("should return 200 with sound list on success", async () => {
      const authSuccess = { userId: "user-1", guildId: "guild-1" };
      validateAuthMock.mockResolvedValue(authSuccess);
      isErrorResponseMock.mockReturnValue(false);

      const mockSounds = [
        { name: "sound-1", blobName: "guild-1/sound-1.mp3" },
        { name: "sound-2", blobName: "guild-1/sound-2.mp3" },
      ];
      mockSoundboardStorage.listSounds.mockResolvedValue(mockSounds);

      const req = createMockHttpRequest();
      const context = createMockContext();

      const response = await listSoundsHandler(req, context);

      expect(response.status).toBe(200);
      expect(response.body).toBe(JSON.stringify(mockSounds));
      expect(mockSoundboardStorage.listSounds).toHaveBeenCalledWith("guild-1");
    });

    it("should return 500 on storage error", async () => {
      const authSuccess = { userId: "user-1", guildId: "guild-1" };
      validateAuthMock.mockResolvedValue(authSuccess);
      isErrorResponseMock.mockReturnValue(false);

      mockSoundboardStorage.listSounds.mockRejectedValue(new Error("List failed"));

      const req = createMockHttpRequest();
      const context = createMockContext();

      const response = await listSoundsHandler(req, context);

      expect(response.status).toBe(500);
      expect(response.body).toBe(JSON.stringify("Error listing sounds"));
      expect(context.error).toHaveBeenCalled();
    });
  });

  describe("deleteSoundHandler", () => {
    it("should return auth error when authentication fails", async () => {
      const authError: HttpResponseInit = {
        status: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify("Authorization token is missing"),
      };
      validateAuthMock.mockResolvedValue(authError);
      isErrorResponseMock.mockReturnValue(true);

      const req = createMockHttpRequest({ method: "DELETE" });
      const context = createMockContext();

      const response = await deleteSoundHandler(req, context);

      expect(response.status).toBe(401);
    });

    it("should return 400 when blobName is missing", async () => {
      const authSuccess = { userId: "user-1", guildId: "guild-1" };
      validateAuthMock.mockResolvedValue(authSuccess);
      isErrorResponseMock.mockReturnValue(false);

      const req = createMockHttpRequest({ method: "DELETE" });
      const context = createMockContext();

      const response = await deleteSoundHandler(req, context);

      expect(response.status).toBe(400);
      expect(response.body).toBe(JSON.stringify("Required field: blobName"));
    });

    it("should return 200 on successful deletion", async () => {
      const authSuccess = { userId: "user-1", guildId: "guild-1" };
      validateAuthMock.mockResolvedValue(authSuccess);
      isErrorResponseMock.mockReturnValue(false);

      mockSoundboardStorage.deleteSound.mockResolvedValue(undefined);

      const req = createMockHttpRequest({
        method: "DELETE",
        query: { blobName: "guild-1/sound-1.mp3" },
      });
      const context = createMockContext();

      const response = await deleteSoundHandler(req, context);

      expect(response.status).toBe(200);
      expect(response.body).toBe(JSON.stringify("Sound deleted successfully"));
      expect(mockSoundboardStorage.deleteSound).toHaveBeenCalledWith("guild-1/sound-1.mp3");
    });

    it("should return 500 on storage error", async () => {
      const authSuccess = { userId: "user-1", guildId: "guild-1" };
      validateAuthMock.mockResolvedValue(authSuccess);
      isErrorResponseMock.mockReturnValue(false);

      mockSoundboardStorage.deleteSound.mockRejectedValue(new Error("Delete failed"));

      const req = createMockHttpRequest({
        method: "DELETE",
        query: { blobName: "guild-1/sound-1.mp3" },
      });
      const context = createMockContext();

      const response = await deleteSoundHandler(req, context);

      expect(response.status).toBe(500);
      expect(response.body).toBe(JSON.stringify("Error deleting sound"));
      expect(context.error).toHaveBeenCalled();
    });
  });
});
