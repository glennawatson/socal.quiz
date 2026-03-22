import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { generatePKCE } from "./pkce";
import { secureGet, secureRemove, secureSet } from "./secureStorage";

const DISCORD_REDIRECT_URI = import.meta.env.VITE_DISCORD_REDIRECT_URI;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const TOKEN_KEY = "discord_token";
const PKCE_KEY = "pkce_verifier";
const STATE_KEY = "oauth_state";

interface AuthState {
  token: string | null;
  user: { username: string; id: string } | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: () => Promise<void>;
  logout: () => void;
  getToken: () => string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    user: null,
    isLoading: true,
  });

  const fetchUser = useCallback(async (token: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/userinfo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error("Failed to fetch user");
      }
      const data = (await res.json()) as {
        sub: string;
        preferred_username: string;
      };
      setState({
        token,
        user: { username: data.preferred_username, id: data.sub },
        isLoading: false,
      });
    } catch {
      secureRemove(TOKEN_KEY);
      setState({ token: null, user: null, isLoading: false });
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const token = await secureGet(TOKEN_KEY);
      if (token) {
        await fetchUser(token);
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    })();
  }, []);

  const login = useCallback(async () => {
    const { codeVerifier, codeChallenge } = await generatePKCE();
    const oauthState = crypto.randomUUID();
    await secureSet(PKCE_KEY, codeVerifier);
    await secureSet(STATE_KEY, oauthState);

    const params = new URLSearchParams({
      state: oauthState,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      redirect_uri: DISCORD_REDIRECT_URI,
    });
    params.append("scope", "identify");
    params.append("scope", "guilds");

    window.location.href = `${API_BASE_URL}/api/auth/authorize?${params.toString()}`;
  }, []);

  const logout = useCallback(() => {
    void (async () => {
      const token = await secureGet(TOKEN_KEY);
      secureRemove(TOKEN_KEY);
      secureRemove(PKCE_KEY);
      secureRemove(STATE_KEY);
      setState({ token: null, user: null, isLoading: false });

      if (token) {
        void fetch(
          `${API_BASE_URL}/api/auth/revokeToken?token=${encodeURIComponent(token)}`,
          { method: "POST" },
        ).catch(() => {});
      }
    })();
  }, []);

  const getToken = useCallback(() => state.token, [state.token]);

  const value = useMemo(
    () => ({ ...state, login, logout, getToken }),
    [state, login, logout, getToken],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

export async function handleOAuthCallback(code: string): Promise<string> {
  const codeVerifier = await secureGet(PKCE_KEY);
  if (!codeVerifier) {
    throw new Error("Missing PKCE verifier");
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    code_verifier: codeVerifier,
    redirect_uri: DISCORD_REDIRECT_URI,
  });

  const res = await fetch(`${API_BASE_URL}/api/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${text}`);
  }

  const data = (await res.json()) as { access_token: string };
  secureRemove(PKCE_KEY);
  secureRemove(STATE_KEY);
  await secureSet(TOKEN_KEY, data.access_token);
  return data.access_token;
}
