import {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { Config } from "./config.js";
import { REST } from "@discordjs/rest";
import { APIGuild, APIUser, Routes } from "discord-api-types/v10";

await Config.initialize();

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
    const guildId = req.query.get("guildId");

    if (!guildId) {
      return {
        status: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify("Required field: guildId"),
      };
    }

    const rest = new REST().setToken(token);

    const userGuilds = await rest.get(Routes.userGuilds()) as APIGuild[] | undefined;

    if (!userGuilds) {
      return {
        status: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify("Could not get the user guilds"),
      };
    }

    const userId = await rest.get(Routes.user()) as APIUser | undefined;

    if (!userId) {
      return {
        status: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify("Could not get the user details"),
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

    return { userId: userId.id, guildId };
  } catch (error) {
    context.error(`Authorization error: ${error}`);
    return {
      status: 401,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify("Invalid token"),
    };
  }
}

export interface ValidationSuccess
{
  token: string
}

export type ValidationResult = ValidationSuccess | HttpResponseInit;

export function isValidationSuccess(successInfo: ValidationResult) : successInfo is ValidationSuccess {
  return "token" in successInfo;
}

export async function validateAuth(
  req: HttpRequest,
  context: InvocationContext,
): Promise<ValidationResult> {
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
    const rest = new REST().setToken(token);

    const userId = await rest.get(Routes.user()) as APIUser | undefined;

    if (!userId) {
      return {
        status: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify("Invalid Token"),
      };
    }

    return { token: token };
  } catch (error) {
    context.error(`Invalid token: ${error}`);
    return {
      status: 401,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify("Invalid token"),
    };
  }
}
