import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { Config } from "./config.js";
import { APIGuild, APIUser } from "discord-api-types/v10";

await Config.initialize();

export type AuthResult = { userId: string; guildId: string } | HttpResponseInit;

export function isErrorResponse(result: AuthResult): result is HttpResponseInit {
  return 'status' in result;
}

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

    if (!userGuild || !userGuild.owner) {
      console.error("not a user guild owner");

      return {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify('You do not own this guild'),
      };
    }

    return { userId: user.id, guildId };
  } catch (error) {
    context.error(`Authorization error: ${error}`);
    return {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify('Invalid token'),
    };
  }
}

export interface ValidationSuccess {
  token: string;
}

export type ValidationResult = ValidationSuccess | HttpResponseInit;

export function isValidationSuccess(successInfo: ValidationResult): successInfo is ValidationSuccess {
  return 'token' in successInfo;
}

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
    context.error(`Invalid token: ${error}`);
    return {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify('Invalid token'),
    };
  }
}
