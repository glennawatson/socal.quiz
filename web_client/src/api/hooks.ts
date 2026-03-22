import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QuestionBankRequestBody } from "@shared/index";
import {
  deleteQuestionBank,
  getGuilds,
  getQuestionBank,
  getQuestionBankNames,
  upsertQuestionBank,
} from "./questionService";

export function useGuilds() {
  return useQuery({
    queryKey: ["guilds"],
    queryFn: getGuilds,
  });
}

export function useQuestionBankNames(guildId: string) {
  return useQuery({
    queryKey: ["questionBankNames", guildId],
    queryFn: () => getQuestionBankNames(guildId),
    enabled: !!guildId,
  });
}

export function useQuestionBank(guildId: string, bankName: string) {
  return useQuery({
    queryKey: ["questionBank", guildId, bankName],
    queryFn: () => getQuestionBank(guildId, bankName),
    enabled: !!guildId && !!bankName,
  });
}

export function useUpsertQuestionBank(guildId: string) {
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

export function useDeleteQuestionBank(guildId: string) {
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
