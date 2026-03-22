import type { QuestionBank, QuestionBankRequestBody, UpsertResult } from "@shared/index";
import { apiFetch } from "./client";

export interface Guild {
  id: string;
  name: string;
  icon: string | null;
}

export async function getGuilds(): Promise<Guild[]> {
  return apiFetch<Guild[]>("/api/getGuilds");
}

export async function getQuestionBankNames(guildId: string): Promise<string[]> {
  return apiFetch<string[]>(
    `/api/getQuestionBankNames?guildId=${encodeURIComponent(guildId)}`,
  );
}

export async function getQuestionBank(
  guildId: string,
  bankName: string,
): Promise<QuestionBank> {
  return apiFetch<QuestionBank>(
    `/api/getQuestionBank?guildId=${encodeURIComponent(guildId)}&bankname=${encodeURIComponent(bankName)}`,
  );
}

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

export async function deleteQuestionBank(
  guildId: string,
  bankName: string,
): Promise<void> {
  return apiFetch<void>(
    `/api/deleteQuestionBank?guildId=${encodeURIComponent(guildId)}&bankname=${encodeURIComponent(bankName)}`,
    { method: "DELETE" },
  );
}
