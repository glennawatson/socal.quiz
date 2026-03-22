import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import type { GuildQuizConfig, QuestionBank, QuestionBankRequestBody, UpsertResult } from "@shared/index";
import {
  deleteQuestionBank,
  getGuilds,
  getQuestionBank,
  getQuestionBankNames,
  upsertQuestionBank,
} from "./questionService";
import type { Guild } from "./questionService";
import { getGuildConfig, upsertGuildConfig } from "./configService";

/**
 * Fetches the list of guilds the authenticated user belongs to.
 *
 * @returns A TanStack Query result containing the guilds array.
 */
export function useGuilds(): UseQueryResult<Guild[]> {
  return useQuery({
    queryKey: ["guilds"],
    queryFn: getGuilds,
  });
}

/**
 * Fetches question bank names for a given guild.
 *
 * @param guildId - The guild to fetch bank names for.
 * @returns A TanStack Query result containing the bank name strings.
 */
export function useQuestionBankNames(guildId: string): UseQueryResult<string[]> {
  return useQuery({
    queryKey: ["questionBankNames", guildId],
    queryFn: () => getQuestionBankNames(guildId),
    enabled: !!guildId,
  });
}

/**
 * Fetches a single question bank by guild and bank name.
 *
 * @param guildId - The guild that owns the question bank.
 * @param bankName - The name of the question bank to fetch.
 * @returns A TanStack Query result containing the question bank.
 */
export function useQuestionBank(guildId: string, bankName: string): UseQueryResult<QuestionBank> {
  return useQuery({
    queryKey: ["questionBank", guildId, bankName],
    queryFn: () => getQuestionBank(guildId, bankName),
    enabled: !!guildId && !!bankName,
  });
}

/**
 * Provides a mutation to create or update a question bank.
 *
 * @param guildId - The guild to upsert the question bank in.
 * @returns A TanStack mutation result for upserting question banks.
 */
export function useUpsertQuestionBank(guildId: string): UseMutationResult<UpsertResult[], Error, QuestionBankRequestBody> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: QuestionBankRequestBody) =>
      upsertQuestionBank(guildId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["questionBankNames", guildId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["questionBank", guildId],
      });
    },
  });
}

/**
 * Provides a mutation to delete a question bank.
 *
 * @param guildId - The guild that owns the question bank.
 * @returns A TanStack mutation result for deleting question banks.
 */
export function useDeleteQuestionBank(guildId: string): UseMutationResult<undefined, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bankName: string) => deleteQuestionBank(guildId, bankName),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["questionBankNames", guildId],
      });
    },
  });
}

/**
 * Fetches the guild quiz configuration for a given scope.
 *
 * @param guildId - The guild to fetch the config for.
 * @param scope - The config scope (defaults to "default").
 * @returns A TanStack Query result containing the guild config.
 */
export function useGuildConfig(guildId: string, scope = "default"): UseQueryResult<GuildQuizConfig | null> {
  return useQuery({
    queryKey: ["guildConfig", guildId, scope],
    queryFn: () => getGuildConfig(guildId, scope),
    enabled: !!guildId,
  });
}

/**
 * Provides a mutation to create or update guild quiz configuration.
 *
 * @param guildId - The guild to upsert the config for.
 * @returns A TanStack mutation result for upserting guild config.
 */
export function useUpsertGuildConfig(guildId: string): UseMutationResult<undefined, Error, GuildQuizConfig> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config: GuildQuizConfig) =>
      upsertGuildConfig(guildId, config),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["guildConfig", guildId],
      });
    },
  });
}
