import { api } from "../../../services/api";
import type { UserSummary } from "../types";

export const mentionService = {
  searchCandidates(query: string): Promise<UserSummary[]> {
    const params = new URLSearchParams({ query });
    return api<UserSummary[]>(`/api/user-directory/mentions?${params.toString()}`);
  },
};
