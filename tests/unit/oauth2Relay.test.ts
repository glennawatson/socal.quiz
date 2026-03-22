import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OAuth2Relay } from "../../src/util/oauth2Relay.js";

describe("OAuth2Relay", () => {
  let relay: OAuth2Relay;
  const clientId = "test-client-id";
  const clientSecret = "test-client-secret";
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn();
    relay = new OAuth2Relay(clientId, clientSecret);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with default values", () => {
      const r = new OAuth2Relay("cid", "csecret");
      // Verify it works by calling getAuthorizeUrl
      const url = r.getAuthorizeUrl("http://redirect", "state1", "challenge1", "S256");
      expect(url).toContain("discord.com/oauth2/authorize");
      expect(url).toContain("client_id=cid");
    });

    it("should initialize with custom scopes and URLs", () => {
      const r = new OAuth2Relay(
        "cid",
        "csecret",
        ["custom-scope"],
        "https://custom.token",
        "https://custom.authorize",
        "https://custom.revoke",
      );

      const url = r.getAuthorizeUrl("http://redirect", "state1", "challenge1", "S256");
      expect(url).toContain("custom.authorize");
      expect(url).toContain("scope=custom-scope");
    });
  });

  describe("getAuthorizeUrl", () => {
    it("should build URL with default scopes", () => {
      const url = relay.getAuthorizeUrl(
        "http://localhost/callback",
        "test-state",
        "test-challenge",
        "S256",
      );

      expect(url).toContain("client_id=test-client-id");
      expect(url).toContain("redirect_uri=http%3A%2F%2Flocalhost%2Fcallback");
      expect(url).toContain("response_type=code");
      expect(url).toContain("state=test-state");
      expect(url).toContain("code_challenge=test-challenge");
      expect(url).toContain("code_challenge_method=S256");
      // Default scopes: guilds, email, openid (profile is filtered out)
      expect(url).toContain("guilds");
      expect(url).toContain("email");
      expect(url).toContain("openid");
    });

    it("should build URL with custom scopes and filter out profile", () => {
      const url = relay.getAuthorizeUrl(
        "http://localhost/callback",
        "test-state",
        "test-challenge",
        "S256",
        ["guilds", "profile", "identify"],
      );

      expect(url).toContain("guilds");
      expect(url).toContain("identify");
      // "profile" should be removed
      const params = new URLSearchParams(url.split("?")[1]);
      const scopes = params.get("scope")!;
      expect(scopes).not.toContain("profile");
    });

    it("should deduplicate space-separated scopes", () => {
      const url = relay.getAuthorizeUrl(
        "http://localhost/callback",
        "test-state",
        "test-challenge",
        "S256",
        ["guilds email", "guilds"],
      );

      const params = new URLSearchParams(url.split("?")[1]);
      const scopes = params.get("scope")!.split(" ");
      const uniqueScopes = new Set(scopes);
      expect(scopes.length).toBe(uniqueScopes.size);
    });
  });

  describe("exchangeCodeForToken", () => {
    it("should exchange code for token successfully", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          access_token: "test-access-token",
          refresh_token: "test-refresh-token",
        }),
      };
      vi.mocked(globalThis.fetch).mockResolvedValue(
        mockResponse as unknown as Response,
      );

      const result = await relay.exchangeCodeForToken("authorization_code", {
        code: "test-code",
        redirect_uri: "http://localhost/callback",
        code_verifier: "test-verifier",
      });

      expect(result).toEqual({
        access_token: "test-access-token",
        refresh_token: "test-refresh-token",
      });

      expect(globalThis.fetch).toHaveBeenCalledWith(
        "https://discord.com/api/oauth2/token",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }),
      );

      // Verify body params
      const callArgs = vi.mocked(globalThis.fetch).mock.calls[0]!;
      const body = callArgs[1]!.body as URLSearchParams;
      expect(body.get("client_id")).toBe(clientId);
      expect(body.get("client_secret")).toBe(clientSecret);
      expect(body.get("grant_type")).toBe("authorization_code");
      expect(body.get("code")).toBe("test-code");
      expect(body.get("redirect_uri")).toBe("http://localhost/callback");
      expect(body.get("code_verifier")).toBe("test-verifier");
    });

    it("should skip empty param values", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ access_token: "tok" }),
      };
      vi.mocked(globalThis.fetch).mockResolvedValue(
        mockResponse as unknown as Response,
      );

      await relay.exchangeCodeForToken("authorization_code", {
        code: "test-code",
        empty_param: "",
      });

      const callArgs = vi.mocked(globalThis.fetch).mock.calls[0]!;
      const body = callArgs[1]!.body as URLSearchParams;
      expect(body.has("empty_param")).toBe(false);
      expect(body.get("code")).toBe("test-code");
    });

    it("should throw on error response", async () => {
      const mockResponse = {
        ok: false,
        statusText: "Bad Request",
      };
      vi.mocked(globalThis.fetch).mockResolvedValue(
        mockResponse as unknown as Response,
      );

      await expect(
        relay.exchangeCodeForToken("authorization_code", {
          code: "bad-code",
        }),
      ).rejects.toThrow("Failed to exchange code for token: Bad Request");
    });
  });

  describe("getUserInfo", () => {
    it("should fetch user info with all fields", async () => {
      const discordUser = {
        id: "12345",
        global_name: "TestUser",
        username: "testuser",
        avatar: "abc123",
        email: "test@example.com",
        verified: true,
        locale: "en-US",
        discriminator: "0001",
        bot: false,
        system: false,
        mfa_enabled: true,
        banner: "banner123",
        accent_color: 0xff0000,
        flags: 64,
        premium_type: 2,
        public_flags: 64,
        avatar_decoration_data: { asset: "decoration" },
      };

      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(discordUser),
      } as unknown as Response);

      const result = await relay.getUserInfo("access-token");

      expect(globalThis.fetch).toHaveBeenCalledWith(
        "https://discord.com/api/users/@me",
        {
          method: "GET",
          headers: { Authorization: "Bearer access-token" },
        },
      );

      expect(result.sub).toBe("12345");
      expect(result.name).toBe("TestUser");
      expect(result.preferred_username).toBe("testuser");
      expect(result.profile).toBe("https://discord.com/users/12345");
      expect(result.picture).toBe(
        "https://cdn.discordapp.com/avatars/12345/abc123.png",
      );
      expect(result.email).toBe("test@example.com");
      expect(result.email_verified).toBe(true);
      expect(result.locale).toBe("en-US");
      expect(result.discriminator).toBe("0001");
      expect(result.bot).toBe(false);
      expect(result.system).toBe(false);
      expect(result.mfa_enabled).toBe(true);
      expect(result.banner).toBe("banner123");
      expect(result.accent_color).toBe(0xff0000);
      expect(result.flags).toBe(64);
      expect(result.premium_type).toBe(2);
      expect(result.public_flags).toBe(64);
      expect(result.avatar_decoration_data).toEqual({ asset: "decoration" });
    });

    it("should handle minimal user fields", async () => {
      const discordUser = {
        id: "12345",
        username: "testuser",
        name: "FallbackName",
      };

      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(discordUser),
      } as unknown as Response);

      const result = await relay.getUserInfo("access-token");

      expect(result.sub).toBe("12345");
      // global_name is undefined, so falls back to name
      expect(result.name).toBe("FallbackName");
      expect(result.preferred_username).toBe("testuser");
      expect(result.picture).toBeNull(); // no avatar
      expect(result.email).toBeUndefined();
      expect(result.email_verified).toBeUndefined();
      expect(result.locale).toBeUndefined();
      // Optional fields not present should not be in result
      expect(result).not.toHaveProperty("discriminator");
      expect(result).not.toHaveProperty("bot");
    });

    it("should throw on error response", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: false,
        statusText: "Unauthorized",
      } as unknown as Response);

      await expect(relay.getUserInfo("bad-token")).rejects.toThrow(
        "Failed to retrieve user info: Unauthorized",
      );
    });
  });

  describe("revokeToken", () => {
    it("should revoke token successfully", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: true,
      } as unknown as Response);

      await relay.revokeToken("test-token");

      expect(globalThis.fetch).toHaveBeenCalledWith(
        "https://discord.com/api/oauth2/revoke",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: expect.any(URLSearchParams),
        },
      );

      const callArgs = vi.mocked(globalThis.fetch).mock.calls[0]!;
      const body = callArgs[1]!.body as URLSearchParams;
      expect(body.get("token")).toBe("test-token");
      expect(body.get("client_id")).toBe(clientId);
      expect(body.get("client_secret")).toBe(clientSecret);
    });

    it("should throw on error response", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: false,
        text: vi.fn().mockResolvedValue("Revocation failed"),
      } as unknown as Response);

      await expect(relay.revokeToken("bad-token")).rejects.toThrow(
        "Revocation failed",
      );
    });

    it("should throw on fetch error", async () => {
      vi.mocked(globalThis.fetch).mockRejectedValue(
        new Error("Network error"),
      );

      await expect(relay.revokeToken("test-token")).rejects.toThrow(
        "Token revocation failed: Error: Network error",
      );
    });
  });
});
