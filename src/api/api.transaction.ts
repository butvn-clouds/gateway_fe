import api from "../config/api.config";
import {
  TransactionListParams,
  TransactionListResponse,
} from "../types/Types";


export const transactionApi = {
  async list(params: TransactionListParams): Promise<TransactionListResponse> {
    const {
      accountId,
      cursor,
      virtualAccountId,
      fromDate,
      toDate,
      fromAuthorizedAt,
      toAuthorizedAt,
      status,
      detailedStatus,
      cardId,
      providerAuthorizationId,
    } = params;

    const res = await api.get<TransactionListResponse>(
      `/api/transactions`,
      {
        params: {
          accountId,
          cursor,
          virtualAccountId,
          fromDate,
          toDate,
          fromAuthorizedAt,
          toAuthorizedAt,
          status,
          detailedStatus,
          cardId,
          providerAuthorizationId,
        },
        withCredentials: true,
      }
    );
    return res.data;
  },
};
