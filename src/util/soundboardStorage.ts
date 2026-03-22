import {
  BlobSASPermissions,
  BlobServiceClient,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";
import { throwError } from "./errorHelpers.js";
import { fileTypeFromBuffer } from "file-type";

const CONTAINER_NAME = "SoundboardAudio";
const MAX_AUDIO_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const VALID_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
];

/**
 * Manages audio file storage in Azure Blob Storage for the soundboard feature.
 *
 * Handles uploading, downloading, listing, and deleting sound files, as well
 * as generating time-limited presigned URLs for secure access.
 */
export class SoundboardStorage {
  private readonly blobClient: BlobServiceClient;
  private readonly storageAccountKey: string;
  private readonly storageAccountName: string;

  /**
   * Creates a new SoundboardStorage instance.
   *
   * @param connectionString - Azure Storage connection string. Required if `blobServiceClient` is not provided.
   * @param storageAccountKey - Azure Storage account key for SAS token generation.
   *   Defaults to the `AZURE_STORAGE_ACCOUNT_KEY` environment variable.
   * @param storageAccountName - Azure Storage account name for SAS token generation.
   *   Defaults to the `AZURE_STORAGE_ACCOUNT_NAME` environment variable.
   * @param blobServiceClient - Optional pre-constructed BlobServiceClient (used for testing).
   */
  constructor(
    connectionString?: string  ,
    storageAccountKey: string = process.env
      .AZURE_STORAGE_ACCOUNT_KEY ?? throwError("invalid storage account key"),
    storageAccountName: string = process.env
      .AZURE_STORAGE_ACCOUNT_NAME ?? throwError("invalid storage account name"),
    blobServiceClient?: BlobServiceClient,
  ) {
    this.storageAccountKey = storageAccountKey;
    this.storageAccountName = storageAccountName;
    if (blobServiceClient) {
      this.blobClient = blobServiceClient;
    } else {
      if (!connectionString) {
        throw new Error("invalid connection string");
      }
      this.blobClient =
        BlobServiceClient.fromConnectionString(connectionString);
    }
  }

  /**
   * Downloads an audio file from a URL, validates its type and size,
   * and stores it in blob storage.
   *
   * @param audioUrl - The URL of the audio file to download.
   * @param guildId - The ID of the guild that owns this sound.
   * @param soundId - A unique identifier for the sound within the guild.
   * @returns The blob name (path) where the audio was stored.
   */
  async downloadAndStoreSound(
    audioUrl: string,
    guildId: string,
    soundId: string,
  ): Promise<string> {
    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch audio: ${response.status} ${response.statusText}`,
      );
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    if (buffer.length > MAX_AUDIO_SIZE_BYTES) {
      throw new Error("Audio file exceeds 10MB size limit.");
    }

    const fileTypeResult = await fileTypeFromBuffer(buffer);
    if (!fileTypeResult || !VALID_AUDIO_TYPES.includes(fileTypeResult.mime)) {
      throw new Error(
        `Invalid audio file type. Supported: ${VALID_AUDIO_TYPES.join(", ")}`,
      );
    }

    const blobName = `${guildId}/${soundId}.${fileTypeResult.ext}`;
    const containerClient =
      this.blobClient.getContainerClient(CONTAINER_NAME);
    await containerClient.createIfNotExists();
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: fileTypeResult.mime },
    });

    return blobName;
  }

  /**
   * Returns a time-limited presigned URL for downloading a sound.
   *
   * @param blobName - The blob storage name of the sound file.
   * @returns A presigned URL valid for 24 hours with read-only access.
   */
  getSoundPresignedUrl(blobName: string): string {
    const containerClient =
      this.blobClient.getContainerClient(CONTAINER_NAME);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const sasOptions = {
      containerName: CONTAINER_NAME,
      blobName,
      permissions: BlobSASPermissions.parse("r"),
      startsOn: new Date(),
      expiresOn: new Date(Date.now() + 86400 * 1000),
    };

    const sharedKeyCredential = new StorageSharedKeyCredential(
      this.storageAccountName,
      this.storageAccountKey,
    );

    const sasToken = generateBlobSASQueryParameters(
      sasOptions,
      sharedKeyCredential,
    ).toString();

    return `${blockBlobClient.url}?${sasToken}`;
  }

  /**
   * Downloads a sound file's raw buffer from blob storage.
   *
   * @param blobName - The blob storage name of the sound file.
   * @returns The audio file contents as a Buffer.
   */
  async downloadSound(blobName: string): Promise<Buffer> {
    const containerClient =
      this.blobClient.getContainerClient(CONTAINER_NAME);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    const downloadResponse = await blockBlobClient.download(0);

    if (!downloadResponse.readableStreamBody) {
      throw new Error("No stream body in download response");
    }

    const chunks: Buffer[] = [];
    for await (const chunk of downloadResponse.readableStreamBody) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  /**
   * Deletes a sound file from blob storage.
   *
   * @param blobName - The blob storage name of the sound file to delete.
   * @returns A promise that resolves when the deletion completes.
   */
  async deleteSound(blobName: string): Promise<void> {
    const containerClient =
      this.blobClient.getContainerClient(CONTAINER_NAME);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.deleteIfExists();
  }

  /**
   * Lists all sound blob names for a guild.
   *
   * @param guildId - The ID of the guild whose sounds to list.
   * @returns An array of blob names prefixed with `{guildId}/`.
   */
  async listSounds(guildId: string): Promise<string[]> {
    const containerClient =
      this.blobClient.getContainerClient(CONTAINER_NAME);
    const blobs: string[] = [];

    for await (const blob of containerClient.listBlobsFlat({
      prefix: `${guildId}/`,
    })) {
      blobs.push(blob.name);
    }

    return blobs;
  }
}
