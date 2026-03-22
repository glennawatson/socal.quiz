import { HttpRequest, type HttpResponseInit, InvocationContext } from "@azure/functions";
import { Config } from "./config.js";
import type { APIGuild, APIUser } from "discord-api-types/v10";

await Config.initialize();

/**
 * Result of an authentication + guild ownership check.
 * Either a successful result containing `userId` and `guildId`, or an
 * {@link HttpResponseInit} error response to return to the caller.
 */
export type AuthResult = { userId: string; guildId: string } | HttpResponseInit;

/**
 * Type guard that checks whether an {@link AuthResult} is an error HTTP response.
 *
 * @param result - The auth result to check.
 * @returns `true` if the result is an HTTP error response.
 */
export function isErrorResponse(result: AuthResult): result is HttpResponseInit {
  return 'status' in result;
}

/**
 * Validates the request's Discord OAuth2 bearer token and verifies the
 * authenticated user owns the guild specified in the `guildId` query parameter.
 *
 * @param req - The incoming HTTP request (must include an `Authorization` header and `guildId` query param).
 * @param context - The Azure Functions invocation context for logging.
 * @returns The authenticated user's ID and guild ID on success, or an HTTP error response.
 */
export async function validateAuthAndGuildOwnership(
  req: HttpRequest,
  context: InvocationContext
): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    console.error("no authorization token");
    return {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify('Authorization token is missing'),
    };
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    console.error("invalid authorization token");
    return {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify('Invalid token'),
    };
  }

  try {
    const guildId = req.query.get('guildId');
    if (!guildId) {
      console.error("no guild id");
      return {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify('Required field: guildId'),
      };
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const userGuildsResponse = await fetch('https://discord.com/api/v10/users/@me/guilds', { headers });
    if (!userGuildsResponse.ok) {
      console.error("no user guilds found");
      return {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify('Could not get the user guilds'),
      };
    }

    const userGuilds = (await userGuildsResponse.json()) as APIGuild[];

    const userResponse = await fetch('https://discord.com/api/v10/users/@me', { headers });
    if (!userResponse.ok) {
      console.error("no user details found");
      return {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify('Could not get the user details'),
      };
    }

    const user = (await userResponse.json()) as APIUser;

    const userGuild = userGuilds.find(guild => guild.id === guildId);

    if (!userGuild?.owner) {
      console.error("not a user guild owner");

      return {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify('You do not own this guild'),
      };
    }

    return { userId: user.id, guildId };
  } catch (error) {
    context.error(`Authorization error: ${String(error)}`);
    return {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify('Invalid token'),
    };
  }
}

/**
 * Represents a successful token validation, containing the bearer token.
 */
export interface ValidationSuccess {
  /** The validated Discord OAuth2 bearer token. */
  token: string;
}

/**
 * Result of a token-only validation check.
 * Either a {@link ValidationSuccess} or an {@link HttpResponseInit} error response.
 */
export type ValidationResult = ValidationSuccess | HttpResponseInit;

/**
 * Type guard that checks whether a {@link ValidationResult} is a successful validation.
 *
 * @param successInfo - The validation result to check.
 * @returns `true` if the result contains a valid token.
 */
export function isValidationSuccess(successInfo: ValidationResult): successInfo is ValidationSuccess {
  return 'token' in successInfo;
}

/**
 * Validates the request's Discord OAuth2 bearer token by calling the
 * Discord `users/@me` endpoint.
 *
 * Does not check guild membership or ownership -- use
 * {@link validateAuthAndGuildOwnership} for that.
 *
 * @param req - The incoming HTTP request (must include an `Authorization` header).
 * @param context - The Azure Functions invocation context for logging.
 * @returns The validated token on success, or an HTTP error response.
 */
export async function validateAuth(
  req: HttpRequest,
  context: InvocationContext
): Promise<ValidationResult> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    context.error(`No valid auth header`);
    return {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify('Authorization token is missing'),
    };
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    context.error(`No valid auth token specified`);
    return {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify('No auth token'),
    };
  }

  try {
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const userResponse = await fetch('https://discord.com/api/v10/users/@me', { headers });
    if (!userResponse.ok) {
      return {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify('Invalid Token'),
      };
    }

    return { token };
  } catch (error) {
    context.error(`Invalid token: ${String(error)}`);
    return {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify('Invalid token'),
    };
  }
}
