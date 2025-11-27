// src/api/api.card.ts
import api from "../config/api.config";
import {
  ApiCreateCardParam,
  ApiUpdateCardParam,
  Card,
  CardPage,
  CardCountryOption,
  MccCodeOption,
  CardSpendingConstraintParam,
  CardUtilization,
} from "../types/Types";

export interface GetPagedCardsParams {
  accountId: number;
  virtualAccountId?: number | null;
  cardGroupId?: number | null;
  page: number;
  size: number;
  search?: string;
  status?: string;
  sort?: string;
  dir?: "asc" | "desc";
}

export const cardApi = {
  // ================== LIST / SEARCH (local DB) ==================
  async getPagedCards(params: GetPagedCardsParams): Promise<CardPage> {
    const query: any = {
      accountId: params.accountId,
      page: params.page,
      size: params.size,
    };

    if (params.virtualAccountId != null) {
      query.virtualAccountId = params.virtualAccountId;
    }
    if (params.cardGroupId != null) {
      query.cardGroupId = params.cardGroupId;
    }
    if (params.search && params.search.trim()) {
      query.search = params.search.trim();
    }
    if (params.status && params.status.trim()) {
      query.status = params.status.trim();
    }
    if (params.sort && params.sort.trim()) {
      query.sort = params.sort.trim();
    }
    if (params.dir && params.dir.trim()) {
      query.dir = params.dir.trim();
    }

    const { data } = await api.get<CardPage>("/api/cards", { params: query });
    return data;
  },

  // ================== SYNC TỪ SLASH ==================
  async syncFromSlash(
    accountId: number
  ): Promise<{ message: string; count: number }> {
    const { data } = await api.post<{ message: string; count: number }>(
      "/api/cards/sync",
      null,
      { params: { accountId } }
    );
    return data;
  },

  // ================== CRUD CARD ==================
  async create(params: ApiCreateCardParam): Promise<Card> {
    const { data } = await api.post<Card>("/api/cards", params);
    return data;
  },

  async update(id: number, params: ApiUpdateCardParam): Promise<Card> {
    const { data } = await api.patch<Card>(`/api/cards/${id}`, params);
    return data;
  },

  // ================== SPENDING CONSTRAINT ==================
  async replaceSpendingConstraint(
    id: number,
    constraint: CardSpendingConstraintParam
  ): Promise<Card> {
    const { data } = await api.put<Card>(
      `/api/cards/${id}/spending-constraint`,
      constraint
    );
    return data;
  },

  // ================== UTILIZATION / VAULT ==================
  async getUtilization(id: number): Promise<CardUtilization> {
    const { data } = await api.get<CardUtilization>(
      `/api/cards/${id}/utilization`
    );
    return data;
  }

  // nếu cần show PAN + CVV (ở BE trả raw JsonNode), type để any cho flexible
  ,
  async getVaultCard(id: number): Promise<any> {
    const { data } = await api.get<any>(`/api/cards/${id}/vault`);
    return data;
  },

  // ================== META (COUNTRIES / MCC CODES) ==================
  // Giả sử BE:
  //   GET /api/meta/countries   -> CardCountryOption[]
  //   GET /api/meta/mcc-codes  -> MccCodeOption[]
  // (trước đang bị gọi nhầm, anh sửa lại đúng)

  async getCountryOptions(): Promise<CardCountryOption[]> {
    const { data } = await api.get<CardCountryOption[]>("/api/meta/merchant-categories");
    return data;
  },

  async getMccCodeOptions(): Promise<MccCodeOption[]> {
    const { data } = await api.get<MccCodeOption[]>(
      "/api/meta/countries"
    );
    return data;
  },
};
