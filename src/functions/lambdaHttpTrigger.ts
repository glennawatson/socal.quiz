import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { verify } from "discord-verify";
import { DiscordBotService } from "../handlers/discordBotService";
import {
  APIInteraction,
  InteractionResponseType,
  InteractionType,
} from "discord-api-types/v10";
import { throwError } from "../util/errorHelpers";
import { QuestionStorage } from "../util/questionStorage";
import { GuildStorage } from "../util/guildStorage"; // Assuming your existing service

// Environment variables
const token =
  process.env.DISCORD_BOT_TOKEN ?? throwError("Must have a valid token");
const clientId =
  process.env.DISCORD_CLIENT_ID ??
  throwError("Must have a valid discord client id");
const publicKey =
  process.env.DISCORD_PUBLIC_KEY ??
  throwError("Must have a valid discord public id");

const questionStorage: QuestionStorage = new QuestionStorage();
const guildStorage: GuildStorage = new GuildStorage();

// Initialize the Discord bot service
const discordBotService = new DiscordBotService(
  token,
  clientId,
  guildStorage,
  questionStorage,
);

export async function interactions(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);

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
    publicKey,
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
  const response = await discordBotService.handleInteraction(interaction); // Updated to use interaction directly
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
