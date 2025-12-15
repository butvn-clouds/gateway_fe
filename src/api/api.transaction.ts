import api from "../config/api.config";

export type TxSearchRequest = {
  cursor?: string | null;
  limit?: number;
  virtualAccountId?: string | null;
  cardId?: string | null;
  status?: string | null;
};

export type TxSearchResponse = {
  items: Record<string, any>[];
  metadata: { nextCursor?: string | null; count?: number };
  fromCache?: boolean;
  cacheAgeSeconds?: number;
};

export const transactionApi = {
  search: async (payload: TxSearchRequest) => {
    const res = await api.post<TxSearchResponse>("/api/transactions/search", payload);
    return res.data;
  },
  sync: async (payload: TxSearchRequest) => {
    const res = await api.post<TxSearchResponse>("/api/transactions/sync", payload);
    return res.data;
  },
};
