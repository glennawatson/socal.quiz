import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HttpRequest, InvocationContext } from "@azure/functions";
import {
  initiateOAuth,
  exchangeToken,
  wellKnownConfig,
  revokeToken,
  userInfo,
  preflight,
} from "../../src/functions/oauthRelayHttpTriggers.js";
import { Config } from "../../src/util/config.js";

const mockOAuth2Relay = {
  getAuthorizeUrl: vi.fn(),
  exchangeCodeForToken: vi.fn(),
  revokeToken: vi.fn(),
  getUserInfo: vi.fn(),
};

const createMockHttpRequest = (
  options: {
    method?: string;
    query?: Record<string, string | string[]>;
    headers?: Record<string, string>;
    body?: string;
  } = {},
): HttpRequest => {
  const queryMap = new Map<string, string | string[]>();
  for (const [k, v] of Object.entries(options.query ?? {})) {
    queryMap.set(k, v);
  }
  const headersMap = new Map(Object.entries(options.headers ?? {}));
  // Always provide a host header for getBaseUrl
  if (!headersMap.has("host")) {
    headersMap.set("host", "localhost:7071");
  }

  return {
    method: options.method ?? "GET",
    url: "http://localhost:7071/api/auth",
    headers: {
      get: (key: string) => headersMap.get(key) ?? null,
      has: (key: string) => headersMap.has(key),
    },
    query: {
      get: (key: string) => {
        const val = queryMap.get(key);
        if (Array.isArray(val)) return val[0] ?? null;
        return (val as string) ?? null;
      },
      getAll: (key: string) => {
        const val = queryMap.get(key);
        if (Array.isArray(val)) return val;
        return val ? [val as string] : [];
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

describe("oauthRelayHttpTriggers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (Config as any).oauth2Relay = mockOAuth2Relay;
    (Config as any)["_initialized"] = true;
    (Config as any)["_initializePromise"] = Promise.resolve(new Config());
  });

  describe("initiateOAuth", () => {
    it("should return 400 when required query parameters are missing", async () => {
      const req = createMockHttpRequest();
      const context = createMockContext();

      const response = await initiateOAuth(req, context);

      expect(response.status).toBe(400);
      const body = JSON.parse(response.body as string);
      expect(body.error).toBe("Missing required query parameters");
    });

    it("should return 400 when scope is missing", async () => {
      const req = createMockHttpRequest({
        query: {
          state: "test-state",
          code_challenge: "test-challenge",
          redirect_uri: "http://localhost:3000/callback",
        },
      });
      const context = createMockContext();

      const response = await initiateOAuth(req, context);

      expect(response.status).toBe(400);
    });

    it("should redirect to auth URL on success", async () => {
      const expectedUrl = "https://discord.com/oauth2/authorize?client_id=test&scope=guilds";
      mockOAuth2Relay.getAuthorizeUrl.mockReturnValue(expectedUrl);

      const req = createMockHttpRequest({
        query: {
          state: "test-state",
          code_challenge: "test-challenge",
          code_challenge_method: "S256",
          redirect_uri: "http://localhost:3000/callback",
          scope: ["guilds", "email"],
        },
      });
      const context = createMockContext();

      const response = await initiateOAuth(req, context);

      expect(response.status).toBe(302);
      expect(response.headers).toHaveProperty("Location", expectedUrl);
      expect(mockOAuth2Relay.getAuthorizeUrl).toHaveBeenCalledWith(
        "http://localhost:3000/callback",
        "test-state",
        "test-challenge",
        "S256",
        ["guilds", "email"],
      );
    });

    it("should use default code_challenge_method S256 when not provided", async () => {
      const expectedUrl = "https://discord.com/oauth2/authorize?test";
      mockOAuth2Relay.getAuthorizeUrl.mockReturnValue(expectedUrl);

      const req = createMockHttpRequest({
        query: {
          state: "test-state",
          code_challenge: "test-challenge",
          redirect_uri: "http://localhost:3000/callback",
          scope: "guilds",
        },
      });
      const context = createMockContext();

      const response = await initiateOAuth(req, context);

      expect(response.status).toBe(302);
      expect(mockOAuth2Relay.getAuthorizeUrl).toHaveBeenCalledWith(
        "http://localhost:3000/callback",
        "test-state",
        "test-challenge",
        "S256",
        ["guilds"],
      );
    });
  });

  describe("exchangeToken", () => {
    it("should return 400 when grant_type is missing", async () => {
      const req = createMockHttpRequest({
        method: "POST",
        body: "",
      });
      const context = createMockContext();

      const response = await exchangeToken(req, context);

      expect(response.status).toBe(400);
      const body = JSON.parse(response.body as string);
      expect(body.error).toBe("grant_type is required in the request body");
    });

    it("should exchange authorization_code successfully", async () => {
      const tokenResponse = {
        access_token: "test-access-token",
        token_type: "Bearer",
        refresh_token: "test-refresh-token",
      };
      mockOAuth2Relay.exchangeCodeForToken.mockResolvedValue(tokenResponse);

      const req = createMockHttpRequest({
        method: "POST",
        body: "grant_type=authorization_code&code=test-code&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcallback&code_verifier=test-verifier&state=test-state",
      });
      const context = createMockContext();

      const response = await exchangeToken(req, context);

      expect(response.status).toBe(200);
      expect(JSON.parse(response.body as string)).toEqual(tokenResponse);
      expect(mockOAuth2Relay.exchangeCodeForToken).toHaveBeenCalledWith(
        "authorization_code",
        {
          code: "test-code",
          redirect_uri: "http://localhost:3000/callback",
          code_verifier: "test-verifier",
          state: "test-state",
        },
      );
    });

    it("should return 400 when authorization_code is missing code or redirect_uri", async () => {
      const req = createMockHttpRequest({
        method: "POST",
        body: "grant_type=authorization_code",
      });
      const context = createMockContext();

      const response = await exchangeToken(req, context);

      expect(response.status).toBe(400);
      const body = JSON.parse(response.body as string);
      expect(body.error).toBe("code and redirect_uri are required in the request body");
    });

    it("should exchange refresh_token successfully", async () => {
      const tokenResponse = {
        access_token: "new-access-token",
        token_type: "Bearer",
        refresh_token: "new-refresh-token",
      };
      mockOAuth2Relay.exchangeCodeForToken.mockResolvedValue(tokenResponse);

      const req = createMockHttpRequest({
        method: "POST",
        body: "grant_type=refresh_token&refresh_token=my-refresh-token",
      });
      const context = createMockContext();

      const response = await exchangeToken(req, context);

      expect(response.status).toBe(200);
      expect(JSON.parse(response.body as string)).toEqual(tokenResponse);
      expect(mockOAuth2Relay.exchangeCodeForToken).toHaveBeenCalledWith(
        "refresh_token",
        { refresh_token: "my-refresh-token" },
      );
    });

    it("should return 400 when refresh_token is missing for refresh_token grant", async () => {
      const req = createMockHttpRequest({
        method: "POST",
        body: "grant_type=refresh_token",
      });
      const context = createMockContext();

      const response = await exchangeToken(req, context);

      expect(response.status).toBe(400);
      const body = JSON.parse(response.body as string);
      expect(body.error).toBe("refresh_token is required in the request body");
    });

    it("should return 400 for unsupported grant_type", async () => {
      const req = createMockHttpRequest({
        method: "POST",
        body: "grant_type=client_credentials",
      });
      const context = createMockContext();

      const response = await exchangeToken(req, context);

      expect(response.status).toBe(400);
      const body = JSON.parse(response.body as string);
      expect(body.error).toBe("Unsupported grant_type");
    });

    it("should return 500 when token exchange fails", async () => {
      mockOAuth2Relay.exchangeCodeForToken.mockRejectedValue(
        new Error("Exchange failed"),
      );

      const req = createMockHttpRequest({
        method: "POST",
        body: "grant_type=authorization_code&code=test-code&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcallback",
      });
      const context = createMockContext();

      const response = await exchangeToken(req, context);

      expect(response.status).toBe(500);
      const body = JSON.parse(response.body as string);
      expect(body.error).toBe("Failed to handle OAuth callback");
      expect(context.error).toHaveBeenCalled();
    });
  });

  describe("wellKnownConfig", () => {
    it("should return correct OpenID configuration endpoints", () => {
      const req = createMockHttpRequest({
        headers: {
          host: "myapp.azurewebsites.net",
          "x-forwarded-proto": "https",
          "x-forwarded-host": "myapp.azurewebsites.net",
        },
      });
      const context = createMockContext();

      const response = wellKnownConfig(req, context);

      expect(response.status).toBe(200);
      const body = JSON.parse(response.body as string);
      expect(body.authorization_endpoint).toBe(
        "https://myapp.azurewebsites.net/api/auth/authorize",
      );
      expect(body.token_endpoint).toBe(
        "https://myapp.azurewebsites.net/api/auth/token",
      );
      expect(body.revocation_endpoint).toBe(
        "https://myapp.azurewebsites.net/api/auth/revokeToken",
      );
      expect(body.userinfo_endpoint).toBe(
        "https://myapp.azurewebsites.net/api/auth/userinfo",
      );
      expect(body.issuer).toBe("https://discord.com");
      expect(body.response_types_supported).toEqual(["code"]);
      expect(body.subject_types_supported).toEqual(["public"]);
      expect(body.id_token_signing_alg_values_supported).toEqual(["RS256"]);
    });

    it("should use http and host header when x-forwarded headers are absent", () => {
      const req = createMockHttpRequest({
        headers: {
          host: "localhost:7071",
        },
      });
      const context = createMockContext();

      const response = wellKnownConfig(req, context);

      expect(response.status).toBe(200);
      const body = JSON.parse(response.body as string);
      // localhost triggers CORS wildcard "*" for Access-Control-Allow-Origin
      expect(body.authorization_endpoint).toBe(
        "http://localhost:7071/api/auth/authorize",
      );
    });
  });

  describe("revokeToken", () => {
    it("should return 400 when token query parameter is missing", async () => {
      const req = createMockHttpRequest();
      const context = createMockContext();

      const response = await revokeToken(req, context);

      expect(response.status).toBe(400);
      const body = JSON.parse(response.body as string);
      expect(body.error).toBe("token query parameter is required");
    });

    it("should return 200 on successful revocation", async () => {
      mockOAuth2Relay.revokeToken.mockResolvedValue(undefined);

      const req = createMockHttpRequest({
        query: { token: "test-token-to-revoke" },
      });
      const context = createMockContext();

      const response = await revokeToken(req, context);

      expect(response.status).toBe(200);
      const body = JSON.parse(response.body as string);
      expect(body.message).toBe("Token revoked successfully");
      expect(mockOAuth2Relay.revokeToken).toHaveBeenCalledWith("test-token-to-revoke");
    });

    it("should return 500 when revocation fails", async () => {
      mockOAuth2Relay.revokeToken.mockRejectedValue(new Error("Revocation failed"));

      const req = createMockHttpRequest({
        query: { token: "test-token" },
      });
      const context = createMockContext();

      const response = await revokeToken(req, context);

      expect(response.status).toBe(500);
      const body = JSON.parse(response.body as string);
      expect(body.error).toBe("Failed to revoke token");
      expect(context.error).toHaveBeenCalled();
    });
  });

  describe("userInfo", () => {
    it("should return 400 when Authorization header is missing", async () => {
      const req = createMockHttpRequest();
      const context = createMockContext();

      const response = await userInfo(req, context);

      expect(response.status).toBe(400);
      const body = JSON.parse(response.body as string);
      expect(body.error).toBe("Authorization header is required");
    });

    it("should return 400 when Authorization header has invalid format (empty after replacing Bearer)", async () => {
      const req = createMockHttpRequest({
        headers: {
          Authorization: "Bearer ",
          host: "localhost:7071",
        },
      });
      const context = createMockContext();

      const response = await userInfo(req, context);

      expect(response.status).toBe(400);
      const body = JSON.parse(response.body as string);
      expect(body.error).toBe("Invalid authorization header format");
    });

    it("should return 200 with user info on success", async () => {
      const mockUserInfo = {
        sub: "123456",
        name: "TestUser",
        preferred_username: "testuser",
        email: "test@example.com",
      };
      mockOAuth2Relay.getUserInfo.mockResolvedValue(mockUserInfo);

      const req = createMockHttpRequest({
        headers: {
          Authorization: "Bearer test-access-token",
          host: "localhost:7071",
        },
      });
      const context = createMockContext();

      const response = await userInfo(req, context);

      expect(response.status).toBe(200);
      expect(JSON.parse(response.body as string)).toEqual(mockUserInfo);
      expect(mockOAuth2Relay.getUserInfo).toHaveBeenCalledWith("test-access-token");
    });

    it("should return 500 when user info retrieval fails", async () => {
      mockOAuth2Relay.getUserInfo.mockRejectedValue(new Error("API error"));

      const req = createMockHttpRequest({
        headers: {
          Authorization: "Bearer test-access-token",
          host: "localhost:7071",
        },
      });
      const context = createMockContext();

      const response = await userInfo(req, context);

      expect(response.status).toBe(500);
      const body = JSON.parse(response.body as string);
      expect(body.error).toBe("Failed to retrieve user info");
      expect(context.error).toHaveBeenCalled();
    });
  });

  describe("preflight", () => {
    it("should return 204 with CORS headers", () => {
      const req = createMockHttpRequest({
        method: "OPTIONS",
        headers: { host: "example.com" },
      });
      const context = createMockContext();

      const response = preflight(req, context);

      expect(response.status).toBe(204);
      expect(response.headers).toEqual({
        "Access-Control-Allow-Origin": "http://example.com",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      });
      expect(context.log).toHaveBeenCalledWith("Handling preflight request");
    });
  });
});
