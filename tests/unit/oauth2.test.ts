import { describe, it, expect, vi, beforeEach } from "vitest";
import { OAuth2 } from "@src/util/OAuth2.js";

const mockFetch = vi.fn();

global.fetch = mockFetch;

describe("OAuth2", () => {
  const clientId = "test-client-id";
  const clientSecret = "test-client-secret";
  const redirectUri = "http://localhost/callback";
  const state = "test-state";
  const scopes = ["identify", "guilds"];
  const code = "test-code";
  const token = "test-token";

  let oauth2: OAuth2;

  beforeEach(() => {
    oauth2 = new OAuth2(clientId, clientSecret, redirectUri);
    vi.clearAllMocks();
  });

  describe("getAuthorizeUrl", () => {
    it("should return the correct authorization URL", () => {
      const url = oauth2.getAuthorizeUrl(state, scopes);
      expect(url).toBe(
        `https://discord.com/api/oauth2/authorize?response_type=code&client_id=${clientId}&scope=${encodeURIComponent(
          scopes.join(" "),
        )}&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}`,
      );
    });

    it("should throw an error if redirectUri is not set", () => {
      const invalidOauth2 = new OAuth2(clientId, clientSecret, "");
      expect(() => invalidOauth2.getAuthorizeUrl(state, scopes)).toThrow(
        "Must have a valid redirect uri",
      );
    });
  });

  describe("exchangeCode", () => {
    it("should exchange code for tokens successfully", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ access_token: token }),
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await oauth2.exchangeCode(code);
      expect(result).toEqual({ access_token: token });
      expect(mockFetch).toHaveBeenCalledWith(
        "https://discord.com/api/oauth2/token",
        {
          method: "POST",
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: "authorization_code",
            code: code,
            redirect_uri: redirectUri,
          }),
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        },
      );
    });

    it("should throw an error if the response is not ok", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });

      await expect(oauth2.exchangeCode(code)).rejects.toThrow(
        "Failed to exchange code for tokens",
      );
    });

    it("should throw an error if redirectUri is not set", async () => {
      const invalidOauth2 = new OAuth2(clientId, clientSecret, "");
      await expect(invalidOauth2.exchangeCode(code)).rejects.toThrow(
        "Must have a valid redirect uri",
      );
    });
  });

  describe("validateToken", () => {
    it("should validate token successfully", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ user_id: "123" }),
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await oauth2.validateToken(token);
      expect(result).toEqual({ user_id: "123" });
      expect(mockFetch).toHaveBeenCalledWith(
        "https://discord.com/api/oauth2/@me",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
    });

    it("should throw an error if the response is not ok", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });

      await expect(oauth2.validateToken(token)).rejects.toThrow(
        "Invalid token",
      );
    });
  });

  describe("getUserGuilds", () => {
    it("should fetch user guilds successfully", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([{ id: "guild1" }, { id: "guild2" }]),
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await oauth2.getUserGuilds(token);
      expect(result).toEqual([{ id: "guild1" }, { id: "guild2" }]);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://discord.com/api/users/@me/guilds",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
    });

    it("should throw an error if the response is not ok", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });

      await expect(oauth2.getUserGuilds(token)).rejects.toThrow(
        "Failed to fetch user guilds",
      );
    });
  });
});
