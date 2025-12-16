import api from "../config/api.config";
import { TransactionPageDTO } from "../types/Types";

export interface GetTransactionsParams {
  accountId: number;                // internal
  virtualAccountId?: number | null; // internal

  cursor?: string;
  limit?: number;

  // optional filters (đúng tên key Slash, BE pass-through)
  filterLegalEntityId?: string;
  filterAccountId?: string; // nếu mày muốn gửi (nhưng thường BE sẽ tự ép theo account)
  filterFromDate?: number;  // epoch? (Slash dùng millis/seconds tuỳ spec)
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

    // required
    q.accountId = params.accountId;

    // internal VA id (BE sẽ map -> slashId)
    if (params.virtualAccountId != null) {
      q.virtualAccountId = params.virtualAccountId;
    }

    setIf(q, "cursor", params.cursor);
    // setIf(q, "limit", params.limit);

    // IMPORTANT: query param có dấu ":" phải để nguyên key string
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
