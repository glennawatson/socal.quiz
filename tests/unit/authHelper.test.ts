import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

vi.mock("@azure/data-tables", () => ({
  TableClient: {
    fromConnectionString: vi.fn().mockReturnValue({
      createTable: vi.fn(),
      getEntity: vi.fn(),
      createEntity: vi.fn(),
      listEntities: vi.fn(),
      deleteEntity: vi.fn(),
    }),
  },
}));

vi.mock("@azure/storage-blob", () => ({
  BlobServiceClient: {
    fromConnectionString: vi.fn().mockReturnValue({
      getContainerClient: vi.fn().mockReturnValue({
        getBlockBlobClient: vi.fn().mockReturnValue({
          uploadData: vi.fn(),
        }),
      }),
    }),
  },
  BlobSASPermissions: { parse: vi.fn() },
  StorageSharedKeyCredential: vi.fn(),
  generateBlobSASQueryParameters: vi.fn().mockReturnValue({
    toString: vi.fn().mockReturnValue("mock-sas-token"),
  }),
}));

import {
  validateAuthAndGuildOwnership,
  validateAuth,
  isErrorResponse,
  isValidationSuccess,
  AuthResult,
} from "@src/util/authHelper.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

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

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: "test-guild", owner: false }],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "test-user" }),
        });

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

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: "test-guild", owner: true }],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "test-user" }),
        });

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

      mockFetch.mockRejectedValue(new Error("Invalid token"));

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

      mockFetch.mockRejectedValue(new Error("Invalid token"));

      const result = await validateAuth(mockHttpRequest, mockInvocationContext);

      expect(result).toEqual({
        status: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify("Invalid token"),
      });
    });

    it("should return token if token is valid", async () => {
      mockHttpRequest = createMockHttpRequest(
        { Authorization: "Bearer test-token" },
        {},
      );

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: "test-user" }),
      });

      const result = await validateAuth(mockHttpRequest, mockInvocationContext);

      expect(isValidationSuccess(result)).toBe(true);
      expect(result).toEqual({ token: "test-token" });
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
