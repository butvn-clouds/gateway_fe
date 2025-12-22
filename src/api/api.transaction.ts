import api from "../config/api.config";
import { TransactionPageDTO } from "../types/Types";

export interface GetTransactionsParams {
  accountId: number;                
  virtualAccountId?: number | null;
  cursor?: string;
  limit?: number;

  filterLegalEntityId?: string;
  filterAccountId?: string; 
  filterFromDate?: number;  
  filterToDate?: number;
  filterFromAuthorizedAt?: number;
  filterToAuthorizedAt?: number;
  filterStatus?: string;
  filterDetailedStatus?: string;
  filterCardId?: string;
  filterProviderAuthorizationId?: string;
}

function setIf(q: Record<string, any>, key: string, val: any) {
  if (val === undefined || val === null) return;
  if (typeof val === "string" && val.trim() === "") return;
  q[key] = val;
}

export const transactionApi = {
  async list(params: GetTransactionsParams): Promise<TransactionPageDTO> {
    const q: Record<string, any> = {};

    q.accountId = params.accountId;

    if (params.virtualAccountId != null) {
      q.virtualAccountId = params.virtualAccountId;
    }

    setIf(q, "cursor", params.cursor);
    // setIf(q, "limit", params.limit);

    setIf(q, "filter:legalEntityId", params.filterLegalEntityId);
    setIf(q, "filter:accountId", params.filterAccountId);

    setIf(q, "filter:from_date", params.filterFromDate);
    setIf(q, "filter:to_date", params.filterToDate);

    setIf(q, "filter:from_authorized_at", params.filterFromAuthorizedAt);
    setIf(q, "filter:to_authorized_at", params.filterToAuthorizedAt);

    setIf(q, "filter:status", params.filterStatus);
    setIf(q, "filter:detailed_status", params.filterDetailedStatus);

    setIf(q, "filter:cardId", params.filterCardId);
    setIf(q, "filter:providerAuthorizationId", params.filterProviderAuthorizationId);

    const res = await api.get<TransactionPageDTO>("/api/transactions", { params: q });
    return res.data;
  }
};
