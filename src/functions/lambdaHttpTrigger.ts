import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { verify } from "discord-verify";
import {
  APIInteraction,
  InteractionResponseType,
  InteractionType,
} from "discord-api-types/v10";

import { Config } from "../util/config.js";

export async function interactions(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);

  await Config.initialize();
  // 1. Verify Request (using discord-verify)
  const signature = request.headers.get("x-signature-ed25519");
  const timestamp = request.headers.get("x-signature-timestamp");
  const rawBody = await request.text();

  // 2. Parse Interaction
  const interaction = JSON.parse(rawBody) as APIInteraction;

  const isValid = await verify(
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
  authLevel: "anonymous",
  handler: interactions,
});
