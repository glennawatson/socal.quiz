import type { QuestionBank, QuestionBankRequestBody, UpsertResult } from "@shared/index";
import { apiFetch } from "./client";

export interface Guild {
  id: string;
  name: string;
  icon: string | null;
}

/**
 * Fetches the list of guilds the authenticated user belongs to.
 *
 * @returns A promise resolving to an array of guilds.
 */
export async function getGuilds(): Promise<Guild[]> {
  return apiFetch<Guild[]>("/api/getGuilds");
}

/**
 * Fetches the question bank names for a given guild.
 *
 * @param guildId - The guild to fetch bank names for.
 * @returns A promise resolving to an array of bank name strings.
 */
export async function getQuestionBankNames(guildId: string): Promise<string[]> {
  return apiFetch<string[]>(
    `/api/getQuestionBankNames?guildId=${encodeURIComponent(guildId)}`,
  );
}

/**
 * Fetches a single question bank by guild and bank name.
 *
 * @param guildId - The guild that owns the question bank.
 * @param bankName - The name of the question bank to fetch.
 * @returns A promise resolving to the question bank.
 */
export async function getQuestionBank(
  guildId: string,
  bankName: string,
): Promise<QuestionBank> {
  return apiFetch<QuestionBank>(
    `/api/getQuestionBank?guildId=${encodeURIComponent(guildId)}&bankname=${encodeURIComponent(bankName)}`,
  );
}

/**
 * Creates or updates a question bank for a given guild.
 *
 * @param guildId - The guild to upsert the question bank in.
 * @param body - The question bank payload to upsert.
 * @returns A promise resolving to the upsert results.
 */
export async function upsertQuestionBank(
  guildId: string,
  body: QuestionBankRequestBody,
): Promise<UpsertResult[]> {
  return apiFetch<UpsertResult[]>(
    `/api/upsertQuestionBank?guildId=${encodeURIComponent(guildId)}`,
    {
      method: "PUT",
      body: JSON.stringify(body),
    },
  );
}

/**
 * Deletes a question bank from a guild.
 *
 * @param guildId - The guild that owns the question bank.
 * @param bankName - The name of the question bank to delete.
 * @returns A promise that resolves when the bank is deleted.
 */
export async function deleteQuestionBank(
  guildId: string,
  bankName: string,
): Promise<undefined> {
  return apiFetch<undefined>(
    `/api/deleteQuestionBank?guildId=${encodeURIComponent(guildId)}&bankname=${encodeURIComponent(bankName)}`,
    { method: "DELETE" },
  );
}
