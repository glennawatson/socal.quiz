import {
  app,
  type HttpRequest,
  type HttpResponseInit,
  type InvocationContext,
} from "@azure/functions";
import { Config } from "../util/config.js";
import {
  isErrorResponse,
  validateAuthAndGuildOwnership,
} from "../util/authHelper.js";
import type { GuildQuizConfig } from "../quizConfig.interfaces.js";

/**
 * Retrieves the guild quiz configuration for the authenticated guild.
 * Accepts an optional "scope" query parameter (defaults to "default").
 *
 * @param req - The incoming HTTP request.
 * @param context - The Azure Functions invocation context.
 * @returns A promise that resolves to the HTTP response containing the guild config or an error.
 */
export async function getGuildConfigHandler(
  req: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const authResult = await validateAuthAndGuildOwnership(req, context);
  if (isErrorResponse(authResult)) return authResult;
  const { guildId } = authResult;

  await Config.initialize();

  const scope: string = req.query.get("scope") ?? "default";

  try {
    const config = await Config.guildQuizConfigStorage.getConfig(
      guildId,
      scope,
    );

    return {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config ?? null),
    };
  } catch (error) {
    context.error(`Could not retrieve guild config: ${String(error)}`);
    return {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify("Error retrieving guild config"),
    };
  }
}

/**
 * Creates or updates the guild quiz configuration for the authenticated guild.
 * Parses a GuildQuizConfig JSON body and validates the required "scope" field.
 *
 * @param req - The incoming HTTP request containing the config JSON body.
 * @param context - The Azure Functions invocation context.
 * @returns A promise that resolves to the HTTP response indicating success or failure.
 */
export async function upsertGuildConfigHandler(
  req: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const authResult = await validateAuthAndGuildOwnership(req, context);
  if (isErrorResponse(authResult)) return authResult;
  const { guildId } = authResult;

  await Config.initialize();

  try {
    let requestBody: GuildQuizConfig;
    try {
      requestBody = JSON.parse(await req.text()) as GuildQuizConfig;
    } catch {
      return {
        status: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify("Invalid JSON body"),
      };
    }

    if (!requestBody.scope) {
      return {
        status: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify("Required field: scope"),
      };
    }

    requestBody.guildId = guildId;

    await Config.guildQuizConfigStorage.upsertConfig(requestBody);

    return {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify("Config updated successfully"),
    };
  } catch (error) {
    context.error(`Could not update guild config: ${String(error)}`);
    return {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify("Error updating guild config"),
    };
  }
}

app.http("getGuildConfig", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: getGuildConfigHandler,
});

app.http("upsertGuildConfig", {
  methods: ["PUT"],
  authLevel: "anonymous",
  handler: upsertGuildConfigHandler,
});
