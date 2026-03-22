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
import { randomUUID } from "node:crypto";

/** Shape of the JSON body expected by the upload-sound endpoint. */
interface UploadSoundRequest {
  audioUrl: string;
  name?: string | undefined;
}

/**
 * Uploads a soundboard audio file for the authenticated guild.
 * Downloads the audio from the provided URL, validates it, and stores it in blob storage.
 *
 * @param req - The incoming HTTP request containing the audio URL.
 * @param context - The Azure Functions invocation context.
 * @returns A promise that resolves to the HTTP response containing the sound ID or an error.
 */
export async function uploadSoundHandler(
  req: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const authResult = await validateAuthAndGuildOwnership(req, context);
  if (isErrorResponse(authResult)) return authResult;
  const { guildId } = authResult;

  await Config.initialize();

  try {
    let requestBody: UploadSoundRequest;
    try {
      requestBody = JSON.parse(await req.text()) as UploadSoundRequest;
    } catch {
      return {
        status: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify("Invalid JSON body"),
      };
    }

    if (!requestBody.audioUrl) {
      return {
        status: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify("Required field: audioUrl"),
      };
    }

    const soundId: string = requestBody.name ?? randomUUID();
    const blobName: string = await Config.soundboardStorage.downloadAndStoreSound(
      requestBody.audioUrl,
      guildId,
      soundId,
    );

    return {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ soundId, blobName }),
    };
  } catch (error) {
    context.error(`Could not upload sound: ${String(error)}`);
    return {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(`Error uploading sound: ${(error as Error).message}`),
    };
  }
}

/**
 * Lists all soundboard sounds for the authenticated guild.
 * Returns an array of sound metadata from blob storage.
 *
 * @param req - The incoming HTTP request.
 * @param context - The Azure Functions invocation context.
 * @returns A promise that resolves to the HTTP response containing the sound list or an error.
 */
export async function listSoundsHandler(
  req: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const authResult = await validateAuthAndGuildOwnership(req, context);
  if (isErrorResponse(authResult)) return authResult;
  const { guildId } = authResult;

  await Config.initialize();

  try {
    const sounds = await Config.soundboardStorage.listSounds(guildId);
    return {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sounds),
    };
  } catch (error) {
    context.error(`Could not list sounds: ${String(error)}`);
    return {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify("Error listing sounds"),
    };
  }
}

/**
 * Deletes a soundboard sound by blob name.
 * Requires the "blobName" query parameter identifying the sound to remove.
 *
 * @param req - The incoming HTTP request with the blobName query parameter.
 * @param context - The Azure Functions invocation context.
 * @returns A promise that resolves to the HTTP response indicating success or failure.
 */
export async function deleteSoundHandler(
  req: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const authResult = await validateAuthAndGuildOwnership(req, context);
  if (isErrorResponse(authResult)) return authResult;

  await Config.initialize();

  const blobName: string | null = req.query.get("blobName");
  if (!blobName) {
    return {
      status: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify("Required field: blobName"),
    };
  }

  try {
    await Config.soundboardStorage.deleteSound(blobName);
    return {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify("Sound deleted successfully"),
    };
  } catch (error) {
    context.error(`Could not delete sound: ${String(error)}`);
    return {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify("Error deleting sound"),
    };
  }
}

app.http("uploadSound", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: uploadSoundHandler,
});

app.http("listSounds", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: listSoundsHandler,
});

app.http("deleteSound", {
  methods: ["DELETE"],
  authLevel: "anonymous",
  handler: deleteSoundHandler,
});
