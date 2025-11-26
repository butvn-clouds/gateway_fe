// src/api/api.card.ts
import api from "../config/api.config";
import {
  ApiCreateCardParam,
  ApiUpdateCardParam,
  Card,
  CardPage,
} from "../types/Types";

export const cardApi = {
  async getByAccountPaged(
    accountId: number,
    page: number = 0,
    size: number = 10,
    virtualAccountId?: number | null,
    cardGroupId?: number | null,
    search?: string,
    status?: string
  ): Promise<CardPage> {
    const safePage =
      typeof page === "number" && Number.isFinite(page) && page >= 0
        ? page
        : 0;

    const safeSize =
      typeof size === "number" && Number.isFinite(size) && size > 0
        ? size
        : 10;

    const params: Record<string, any> = {
      page: safePage,
      size: safeSize,
    };

    if (virtualAccountId != null) {
      params.virtualAccountId = virtualAccountId;
    }
    if (cardGroupId != null) {
      params.cardGroupId = cardGroupId;
    }
    if (search && search.trim()) {
      params.search = search.trim();
    }
    if (status && status.trim()) {
      params.status = status.trim();
    }

    const res = await api.get<CardPage>(`/api/cards/account/${accountId}`, {
      params,
    });
    return res.data;
  },

  async syncAccount(
    accountId: number,
    virtualAccountId?: number | null
  ): Promise<Card[]> {
    const params =
      virtualAccountId != null ? { virtualAccountId } : undefined;

    const res = await api.post<Card[]>(`/api/cards/sync/${accountId}`, null, {
      params,
    });
    return res.data;
  },

  async createCard(body: ApiCreateCardParam): Promise<Card> {
    const res = await api.post<Card>(`/api/cards`, body);
    return res.data;
  },

  async updateCard(id: number, body: ApiUpdateCardParam): Promise<Card> {
    const res = await api.put<Card>(`/api/cards/${id}`, body);
    return res.data;
  },

  async deleteCard(id: number): Promise<void> {
    await api.delete(`/api/cards/${id}`);
  },
};
