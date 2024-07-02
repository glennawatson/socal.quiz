import {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { OAuth2 } from "./OAuth2.js";
import { throwError } from "./errorHelpers.js";

export const oauth2 = new OAuth2(
  process.env.CLIENT_ID ?? throwError("no valid client id"),
  process.env.CLIENT_SECRET ?? throwError("no valid client secret"),
  process.env.REDIRECT_URI ?? throwError("no valid redirect uri"),
);

export type AuthResult = { userId: string; guildId: string } | HttpResponseInit;

export function isErrorResponse(
  result: AuthResult,
): result is HttpResponseInit {
  return "status" in result;
}

export async function validateAuthAndGuildOwnership(
  req: HttpRequest,
  context: InvocationContext,
): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return {
      status: 401,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify("Authorization token is missing"),
    };
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return {
      status: 401,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify("Invalid token"),
    };
  }

  try {
    const userAuth = await oauth2.validateToken(token);
    const userGuilds = await oauth2.getUserGuilds(token);
    const guildId = req.query.get("guildId");

    if (!guildId) {
      return {
        status: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify("Required field: guildId"),
      };
    }

    const userGuild = userGuilds.find((guild) => guild.id === guildId);

    if (!userGuild || userGuild.owner !== true) {
      return {
        status: 403,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify("You do not own this guild"),
      };
    }

    return { userId: userAuth.user.id, guildId };
  } catch (error) {
    context.error(`Authorization error: ${error}`);
    return {
      status: 401,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify("Invalid token"),
    };
  }
}

export async function validateAuth(
  req: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit | undefined> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return {
      status: 401,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify("Authorization token is missing"),
    };
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    context.error(`No valid auth token specified`);
    return {
      status: 401,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify("No auth token"),
    };
  }

  try {
    await oauth2.validateToken(token);
    return undefined;
  } catch (error) {
    context.error(`Invalid token: ${error}`);
    return {
      status: 401,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify("Invalid token"),
    };
  }
}
