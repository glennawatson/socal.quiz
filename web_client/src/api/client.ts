import { secureGet } from "@/auth/secureStorage";

const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL;

/**
 * Authenticated fetch wrapper for the quiz API.
 *
 * @param path - The API path to fetch (e.g. "/api/getGuilds").
 * @param options - Additional fetch options (method, body, etc.).
 * @returns A promise resolving to the parsed JSON response.
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token: string | null = await secureGet("discord_token");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  if (options.headers) {
    const incomingHeaders = new Headers(options.headers);
    incomingHeaders.forEach((value, key) => {
      headers[key] = value;
    });
  }

  const res: Response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const text: string = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}
