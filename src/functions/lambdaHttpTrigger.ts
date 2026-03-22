import {
  app,
  HttpRequest,
  type HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { verify } from "discord-verify";
import {
  type APIInteraction,
  InteractionResponseType,
  InteractionType,
} from "discord-api-types/v10";

import { Config } from "../util/config.js";
import { getClient } from "durable-functions";
import * as df from "durable-functions";

/**
 * Handles the Discord interaction webhook endpoint — verifies Ed25519 signatures
 * and routes valid interactions to the bot service for processing.
 *
 * @param request - The incoming HTTP request from Discord.
 * @param context - The Azure Functions invocation context.
 * @returns A promise that resolves to the HTTP response for the interaction.
 */
export async function interactions(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const durableClient = getClient(context);
  context.log(`Http function processed request for url "${request.url}"`);

  await Config.initialize(durableClient);
  // 1. Verify Request (using discord-verify)
  const signature: string | null = request.headers.get("x-signature-ed25519");
  const timestamp: string | null = request.headers.get("x-signature-timestamp");
  const rawBody: string = await request.text();

  // 2. Parse Interaction
  const interaction: APIInteraction = JSON.parse(rawBody) as APIInteraction;

  const isValid: boolean = await verify(
    rawBody,
    signature,
    timestamp,
    Config.publicKey,
    crypto.subtle,
  );

  if (!isValid) {
    return { status: 401, body: "Invalid request signature" };
  }

  // 3. Handle PING Interactions
  if (interaction.type === InteractionType.Ping) {
    return {
      status: 200,
      body: JSON.stringify({ type: InteractionResponseType.Pong }),
    };
  }

  // 4. Delegate to DiscordBotService
  const response =
    await Config.discordBotService.handleInteraction(interaction); // Updated to use interaction directly
  return {
    status: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(response),
  };
}

app.http("interactions", {
  methods: ["POST"],
  extraInputs: [df.input.durableClient()],
  authLevel: "anonymous",
  handler: interactions,
});
