import api from "../config/api.config";
import {
  TransactionListResponse
} from "../types/Types";

export interface TransactionSearchParam {
  accountId: number;
  virtualAccountId?: string | null;
  cursor?: string | null;

  fromDate?: string | null;
  toDate?: string | null;

  fromAuthorizedAt?: string | null;
  toAuthorizedAt?: string | null;

  status?: string | null;
  detailedStatus?: string | null;
  cardId?: string | null;
  providerAuthorizationId?: string | null;

  search?: string | null; // keyword filter
}

export const transactionApi = {
  search: async (params: TransactionSearchParam): Promise<TransactionListResponse> => {
    const res = await api.post("/api/transactions/search", params);
    return res.data;
  },

  list: async (params: TransactionSearchParam): Promise<TransactionListResponse> => {
    const res = await api.post("/api/transactions/list", params);
    return res.data;
  },
};
