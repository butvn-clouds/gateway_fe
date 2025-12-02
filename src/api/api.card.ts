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
  SlashCardDetail,
  CardModifiersResponse,
  CardProductListResponse,
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

/**
 * Dùng cho /api/cards-visible (đã lọc ẩn theo VA / Card Group)
 * Về cơ bản giống GetPagedCardsParams, nên reuse luôn type cũ.
 */
export type GetPagedVisibleCardsParams = GetPagedCardsParams;

export const cardApi = {
  // ==================== LIST GỐC (KHÔNG ÁP DỤNG ẨN) ====================

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

  // ==================== LIST ĐÃ LỌC ẨN (VISIBLE) ====================

  /**
   * Lấy danh sách card đã áp dụng rule ẩn theo VA / CardGroup của user hiện tại.
   * BE: GET /api/cards-visible
   */
  async getPagedCardsVisible(
    params: GetPagedVisibleCardsParams
  ): Promise<CardPage> {
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
    } else {
      query.sort = "createdAt";
    }
    if (params.dir && params.dir.trim()) {
      query.dir = params.dir.trim();
    } else {
      query.dir = "desc";
    }

    const { data } = await api.get<CardPage>("/api/cards-visible", {
      params: query,
    });
    return data;
  },

  // ==================== SYNC / CRUD ====================

  async syncFromSlash(
    accountId: number
  ): Promise<{ message: string; count: number }> {
    const { data } = await api.post<{ message: string; count: number }>(
      `/api/cards/sync/${accountId}`,
      null
    );
    return data;
  },

  async create(params: ApiCreateCardParam): Promise<Card> {
    const payload: ApiCreateCardParam = {
      ...params,
      type: params.type ?? "virtual",
    };

    const { data } = await api.post<Card>("/api/cards", payload);
    return data;
  },

  async update(id: number, params: ApiUpdateCardParam): Promise<Card> {
    const { data } = await api.put<Card>(`/api/cards/${id}`, params);
    return data;
  },

  async getById(id: number): Promise<Card> {
    const { data } = await api.get<Card>(`/api/cards/${id}`);
    return data;
  },

  // ==================== DETAIL / VAULT (GỐC) ====================

  async getSlashDetail(
    id: number,
    opts?: { includePan?: boolean; includeCvv?: boolean }
  ): Promise<SlashCardDetail> {
    const params: any = {};
    if (opts?.includePan !== undefined) {
      params.includePan = opts.includePan;
    }
    if (opts?.includeCvv !== undefined) {
      params.includeCvv = opts.includeCvv;
    }

    const hasParams = Object.keys(params).length > 0;

    const { data } = await api.get<SlashCardDetail>(
      `/api/cards/${id}/detail`,
      hasParams ? { params } : undefined
    );
    return data;
  },

  async getSlashDetailWithSensitive(
    id: number,
    includePan: boolean,
    includeCvv: boolean
  ): Promise<SlashCardDetail> {
    const { data } = await api.get<SlashCardDetail>(
      `/api/cards/${id}/detail`,
      {
        params: { includePan, includeCvv },
      }
    );
    return data;
  },

  // ==================== DETAIL / VAULT (ĐÃ LỌC ẨN) ====================

  /**
   * Lấy detail từ endpoint đã check ẩn:
   * BE: GET /api/cards-visible/{id}/vault
   */
  async getSlashDetailVisible(
    id: number,
    opts?: { includePan?: boolean; includeCvv?: boolean }
  ): Promise<SlashCardDetail> {
    const params: any = {};
    if (opts?.includePan !== undefined) {
      params.includePan = opts.includePan;
    }
    if (opts?.includeCvv !== undefined) {
      params.includeCvv = opts.includeCvv;
    }

    const hasParams = Object.keys(params).length > 0;

    const { data } = await api.get<SlashCardDetail>(
      `/api/cards-visible/${id}/vault`,
      hasParams ? { params } : undefined
    );
    return data;
  },

  // ==================== UTILIZATION (GỐC) ====================

  async getUtilization(id: number): Promise<CardUtilization> {
    const { data } = await api.get<CardUtilization>(
      `/api/cards/${id}/utilization`
    );
    return data;
  },

  // ==================== UTILIZATION (ĐÃ LỌC ẨN) ====================

  /**
   * Lấy utilization từ endpoint đã check ẩn:
   * BE: GET /api/cards-visible/{id}/utilization
   */
  async getUtilizationVisible(id: number): Promise<CardUtilization> {
    const { data } = await api.get<CardUtilization>(
      `/api/cards-visible/${id}/utilization`
    );
    return data;
  },

  // ==================== SPENDING CONSTRAINT ====================

  async patchSpendingConstraint(
    id: number,
    constraint: CardSpendingConstraintParam
  ): Promise<Card> {
    const { data } = await api.put<Card>(
      `/api/cards/${id}/spending-constraint`,
      constraint
    );
    return data;
  },

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

  // ==================== MODIFIERS ====================

  async getModifiers(id: number): Promise<CardModifiersResponse> {
    const { data } = await api.get<CardModifiersResponse>(
      `/api/cards/${id}/modifiers`
    );
    return data;
  },

  async setModifier(
    id: number,
    name: string,
    value: boolean | string | number
  ): Promise<{ success: boolean }> {
    const { data } = await api.post<{ success: boolean }>(
      `/api/cards/${id}/modifiers/${encodeURIComponent(name)}`,
      { value }
    );
    return data;
  },

  // ==================== META ====================

  async getCountryOptions(): Promise<CardCountryOption[]> {
    const { data } = await api.get<CardCountryOption[]>("/api/meta/countries");
    return data;
  },

  async getMccCodeOptions(): Promise<MccCodeOption[]> {
    const { data } = await api.get<MccCodeOption[]>("/api/meta/mcc-codes");
    return data;
  },

  async getCardProducts(): Promise<CardProductListResponse> {
    const { data } = await api.get<CardProductListResponse>(
      "/api/cards/products"
    );
    return data;
  },
};
