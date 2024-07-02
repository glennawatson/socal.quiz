import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import {
  validateAuthAndGuildOwnership,
  validateAuth,
  isErrorResponse,
  AuthResult,
  oauth2,
} from "@src/util/authHelper.js";

vi.mock("@src/util/OAuth2.js");
vi.mock("@src/util/errorHelpers.js", () => ({
  throwError: vi.fn((msg) => {
    throw new Error(msg);
  }),
}));

const mockOAuth2 = {
  validateToken: vi.fn(),
  getUserGuilds: vi.fn(),
};

oauth2.validateToken = mockOAuth2.validateToken;
oauth2.getUserGuilds = mockOAuth2.getUserGuilds;

const setupMocks = () => {
  process.env.CLIENT_ID = "test-client-id";
  process.env.CLIENT_SECRET = "test-client-secret";
  process.env.REDIRECT_URI = "http://localhost/callback";
};

const createMockHttpRequest = (
  headers: Record<string, string>,
  queryParams: Record<string, string>,
): HttpRequest =>
  ({
    headers: new Map(Object.entries(headers)),
    query: new Map(Object.entries(queryParams)),
  }) as any as HttpRequest;

const createMockInvocationContext = (): InvocationContext =>
  ({
    log: vi.fn(),
    error: vi.fn(),
  }) as any as InvocationContext;

describe("Auth Helper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  describe("validateAuthAndGuildOwnership", () => {
    let mockHttpRequest: HttpRequest;
    let mockInvocationContext: InvocationContext;

    beforeEach(() => {
      mockInvocationContext = createMockInvocationContext();
    });

    it("should return 401 if Authorization header is missing", async () => {
      mockHttpRequest = createMockHttpRequest({}, { guildId: "test-guild" });

      const result = await validateAuthAndGuildOwnership(
        mockHttpRequest,
        mockInvocationContext,
      );

      expect(result).toEqual({
        status: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify("Authorization token is missing"),
      });
    });

    it("should return 401 if token is invalid", async () => {
      mockHttpRequest = createMockHttpRequest(
        { Authorization: "Bearer " },
        { guildId: "test-guild" },
      );

      const result = await validateAuthAndGuildOwnership(
        mockHttpRequest,
        mockInvocationContext,
      );

      expect(result).toEqual({
        status: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify("Invalid token"),
      });
    });

    it("should return 400 if guildId is missing", async () => {
      mockHttpRequest = createMockHttpRequest(
        { Authorization: "Bearer test-token" },
        {},
      );

      mockOAuth2.validateToken.mockResolvedValue({ user: { id: "test-user" } });
      mockOAuth2.getUserGuilds.mockResolvedValue([
        { id: "test-guild", owner: true },
      ]);

      const result = await validateAuthAndGuildOwnership(
        mockHttpRequest,
        mockInvocationContext,
      );

      expect(result).toEqual({
        status: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify("Required field: guildId"),
      });
    });

    it("should return 403 if user does not own the guild", async () => {
      mockHttpRequest = createMockHttpRequest(
        { Authorization: "Bearer test-token" },
        { guildId: "test-guild" },
      );

      mockOAuth2.validateToken.mockResolvedValue({ user: { id: "test-user" } });
      mockOAuth2.getUserGuilds.mockResolvedValue([
        { id: "test-guild", owner: false },
      ]);

      const result = await validateAuthAndGuildOwnership(
        mockHttpRequest,
        mockInvocationContext,
      );

      expect(result).toEqual({
        status: 403,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify("You do not own this guild"),
      });
    });

    it("should return userId and guildId if user owns the guild", async () => {
      mockHttpRequest = createMockHttpRequest(
        { Authorization: "Bearer test-token" },
        { guildId: "test-guild" },
      );

      mockOAuth2.validateToken.mockResolvedValue({ user: { id: "test-user" } });
      mockOAuth2.getUserGuilds.mockResolvedValue([
        { id: "test-guild", owner: true },
      ]);

      const result = await validateAuthAndGuildOwnership(
        mockHttpRequest,
        mockInvocationContext,
      );

      expect(result).toEqual({ userId: "test-user", guildId: "test-guild" });
    });

    it("should return 401 if token validation fails", async () => {
      mockHttpRequest = createMockHttpRequest(
        { Authorization: "Bearer test-token" },
        { guildId: "test-guild" },
      );

      mockOAuth2.validateToken.mockRejectedValue(new Error("Invalid token"));

      const result = await validateAuthAndGuildOwnership(
        mockHttpRequest,
        mockInvocationContext,
      );

      expect(result).toEqual({
        status: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify("Invalid token"),
      });
    });
  });

  describe("validateAuth", () => {
    let mockHttpRequest: HttpRequest;
    let mockInvocationContext: InvocationContext;

    beforeEach(() => {
      mockInvocationContext = createMockInvocationContext();
    });

    it("should return 401 if Authorization header is missing", async () => {
      mockHttpRequest = createMockHttpRequest({}, {});

      const result = await validateAuth(mockHttpRequest, mockInvocationContext);

      expect(result).toEqual({
        status: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify("Authorization token is missing"),
      });
    });

    it("should return 401 if token is invalid", async () => {
      mockHttpRequest = createMockHttpRequest({ Authorization: "Bearer " }, {});

      const result = await validateAuth(mockHttpRequest, mockInvocationContext);

      expect(result).toEqual({
        status: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify("No auth token"),
      });
    });

    it("should return 401 if token validation fails", async () => {
      mockHttpRequest = createMockHttpRequest(
        { Authorization: "Bearer test-token" },
        {},
      );

      mockOAuth2.validateToken.mockRejectedValue(new Error("Invalid token"));

      const result = await validateAuth(mockHttpRequest, mockInvocationContext);

      expect(result).toEqual({
        status: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify("Invalid token"),
      });
    });

    it("should return undefined if token is valid", async () => {
      mockHttpRequest = createMockHttpRequest(
        { Authorization: "Bearer test-token" },
        {},
      );

      mockOAuth2.validateToken.mockResolvedValue({ user: { id: "test-user" } });

      const result = await validateAuth(mockHttpRequest, mockInvocationContext);

      expect(result).toBeUndefined();
    });
  });

  describe("isErrorResponse", () => {
    it("should return true for an error response", () => {
      const response: HttpResponseInit = {
        status: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify("Error"),
      };

      expect(isErrorResponse(response)).toBe(true);
    });

    it("should return false for a valid response", () => {
      const response: AuthResult = {
        userId: "test-user",
        guildId: "test-guild",
      };

      expect(isErrorResponse(response)).toBe(false);
    });
  });
});
