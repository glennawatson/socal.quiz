import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import {
  getGuildConfigHandler,
  upsertGuildConfigHandler,
} from "../../src/functions/guildConfigHttpTriggers.js";
import { Config } from "../../src/util/config.js";
import * as authHelper from "../../src/util/authHelper.js";
import type { GuildQuizConfig } from "../../shared/quizConfig.interfaces.js";

vi.mock("../../src/util/authHelper.js", () => ({
  validateAuthAndGuildOwnership: vi.fn(),
  isErrorResponse: vi.fn(),
}));

const validateAuthMock = vi.mocked(authHelper.validateAuthAndGuildOwnership);
const isErrorResponseMock = vi.mocked(authHelper.isErrorResponse);

const mockGuildQuizConfigStorage = {
  getConfig: vi.fn(),
  upsertConfig: vi.fn(),
  initialize: vi.fn(),
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
    url: "http://localhost:7071/api/guildConfig",
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

describe("guildConfigHttpTriggers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (Config as any).guildQuizConfigStorage = mockGuildQuizConfigStorage;
    (Config as any)["_initialized"] = true;
    (Config as any)["_initializePromise"] = Promise.resolve(new Config());
  });

  describe("getGuildConfigHandler", () => {
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

      const response = await getGuildConfigHandler(req, context);

      expect(response.status).toBe(401);
      expect(response.body).toBe(JSON.stringify("Authorization token is missing"));
    });

    it("should return config with default scope when no scope provided", async () => {
      const authSuccess = { userId: "user-1", guildId: "guild-1" };
      validateAuthMock.mockResolvedValue(authSuccess);
      isErrorResponseMock.mockReturnValue(false);

      const mockConfig: GuildQuizConfig = {
        guildId: "guild-1",
        scope: "default",
        defaultQuestionShowTimeMs: 10000,
      };
      mockGuildQuizConfigStorage.getConfig.mockResolvedValue(mockConfig);

      const req = createMockHttpRequest();
      const context = createMockContext();

      const response = await getGuildConfigHandler(req, context);

      expect(response.status).toBe(200);
      expect(response.body).toBe(JSON.stringify(mockConfig));
      expect(mockGuildQuizConfigStorage.getConfig).toHaveBeenCalledWith("guild-1", "default");
    });

    it("should return config with custom scope when scope provided", async () => {
      const authSuccess = { userId: "user-1", guildId: "guild-1" };
      validateAuthMock.mockResolvedValue(authSuccess);
      isErrorResponseMock.mockReturnValue(false);

      const mockConfig: GuildQuizConfig = {
        guildId: "guild-1",
        scope: "my-bank",
      };
      mockGuildQuizConfigStorage.getConfig.mockResolvedValue(mockConfig);

      const req = createMockHttpRequest({ query: { scope: "my-bank" } });
      const context = createMockContext();

      const response = await getGuildConfigHandler(req, context);

      expect(response.status).toBe(200);
      expect(response.body).toBe(JSON.stringify(mockConfig));
      expect(mockGuildQuizConfigStorage.getConfig).toHaveBeenCalledWith("guild-1", "my-bank");
    });

    it("should return null when no config exists", async () => {
      const authSuccess = { userId: "user-1", guildId: "guild-1" };
      validateAuthMock.mockResolvedValue(authSuccess);
      isErrorResponseMock.mockReturnValue(false);

      mockGuildQuizConfigStorage.getConfig.mockResolvedValue(undefined);

      const req = createMockHttpRequest();
      const context = createMockContext();

      const response = await getGuildConfigHandler(req, context);

      expect(response.status).toBe(200);
      expect(response.body).toBe(JSON.stringify(null));
    });

    it("should return 500 on storage error", async () => {
      const authSuccess = { userId: "user-1", guildId: "guild-1" };
      validateAuthMock.mockResolvedValue(authSuccess);
      isErrorResponseMock.mockReturnValue(false);

      mockGuildQuizConfigStorage.getConfig.mockRejectedValue(new Error("Storage failure"));

      const req = createMockHttpRequest();
      const context = createMockContext();

      const response = await getGuildConfigHandler(req, context);

      expect(response.status).toBe(500);
      expect(response.body).toBe(JSON.stringify("Error retrieving guild config"));
      expect(context.error).toHaveBeenCalled();
    });
  });

  describe("upsertGuildConfigHandler", () => {
    it("should return auth error when authentication fails", async () => {
      const authError: HttpResponseInit = {
        status: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify("Authorization token is missing"),
      };
      validateAuthMock.mockResolvedValue(authError);
      isErrorResponseMock.mockReturnValue(true);

      const req = createMockHttpRequest({ method: "PUT" });
      const context = createMockContext();

      const response = await upsertGuildConfigHandler(req, context);

      expect(response.status).toBe(401);
    });

    it("should return 400 for invalid JSON body", async () => {
      const authSuccess = { userId: "user-1", guildId: "guild-1" };
      validateAuthMock.mockResolvedValue(authSuccess);
      isErrorResponseMock.mockReturnValue(false);

      const req = createMockHttpRequest({ method: "PUT", body: "not-json{{{" });
      const context = createMockContext();

      const response = await upsertGuildConfigHandler(req, context);

      expect(response.status).toBe(400);
      expect(response.body).toBe(JSON.stringify("Invalid JSON body"));
    });

    it("should return 400 when scope is missing", async () => {
      const authSuccess = { userId: "user-1", guildId: "guild-1" };
      validateAuthMock.mockResolvedValue(authSuccess);
      isErrorResponseMock.mockReturnValue(false);

      const body = JSON.stringify({ guildId: "guild-1" });
      const req = createMockHttpRequest({ method: "PUT", body });
      const context = createMockContext();

      const response = await upsertGuildConfigHandler(req, context);

      expect(response.status).toBe(400);
      expect(response.body).toBe(JSON.stringify("Required field: scope"));
    });

    it("should return 200 on successful upsert", async () => {
      const authSuccess = { userId: "user-1", guildId: "guild-1" };
      validateAuthMock.mockResolvedValue(authSuccess);
      isErrorResponseMock.mockReturnValue(false);

      mockGuildQuizConfigStorage.upsertConfig.mockResolvedValue(undefined);

      const configBody: GuildQuizConfig = {
        guildId: "ignored",
        scope: "my-scope",
        defaultQuestionShowTimeMs: 5000,
      };
      const req = createMockHttpRequest({ method: "PUT", body: JSON.stringify(configBody) });
      const context = createMockContext();

      const response = await upsertGuildConfigHandler(req, context);

      expect(response.status).toBe(200);
      expect(response.body).toBe(JSON.stringify("Config updated successfully"));
      // guildId should be overwritten with the auth-derived guildId
      expect(mockGuildQuizConfigStorage.upsertConfig).toHaveBeenCalledWith(
        expect.objectContaining({ guildId: "guild-1", scope: "my-scope" }),
      );
    });

    it("should return 500 on storage error", async () => {
      const authSuccess = { userId: "user-1", guildId: "guild-1" };
      validateAuthMock.mockResolvedValue(authSuccess);
      isErrorResponseMock.mockReturnValue(false);

      mockGuildQuizConfigStorage.upsertConfig.mockRejectedValue(new Error("Storage failure"));

      const configBody: GuildQuizConfig = {
        guildId: "guild-1",
        scope: "my-scope",
      };
      const req = createMockHttpRequest({ method: "PUT", body: JSON.stringify(configBody) });
      const context = createMockContext();

      const response = await upsertGuildConfigHandler(req, context);

      expect(response.status).toBe(500);
      expect(response.body).toBe(JSON.stringify("Error updating guild config"));
      expect(context.error).toHaveBeenCalled();
    });
  });
});
