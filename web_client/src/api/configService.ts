import type { GuildQuizConfig } from "@shared/index";
import { apiFetch } from "./client";

/**
 * Fetches the guild quiz config for a given scope.
 *
 * @param guildId - The guild to fetch config for.
 * @param scope - The config scope ("default" or a bank name).
 * @returns The guild config, or null if none exists.
 */
export async function getGuildConfig(
  guildId: string,
  scope = "default",
): Promise<GuildQuizConfig | null> {
  return apiFetch<GuildQuizConfig | null>(
    `/api/getGuildConfig?guildId=${encodeURIComponent(guildId)}&scope=${encodeURIComponent(scope)}`,
  );
}

/**
 * Creates or updates the guild quiz config.
 *
 * @param guildId - The guild to update config for.
 * @param config - The config payload to upsert.
 * @returns A promise that resolves when the config is saved.
 */
export async function upsertGuildConfig(
  guildId: string,
  config: GuildQuizConfig,
): Promise<undefined> {
  return apiFetch<undefined>(
    `/api/upsertGuildConfig?guildId=${encodeURIComponent(guildId)}`,
    {
      method: "PUT",
      body: JSON.stringify(config),
    },
  );
}
