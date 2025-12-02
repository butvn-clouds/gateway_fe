import api from "../config/api.config";
import {
  ApiCreateCardGroupParam,
  ApiUpdateCardGroupParam,
  ApiUpdateVisibilityParam,
  CardGroupPage,
  CardGroupSpendingConstraintParam,
  CardGroupUtilization,
} from "../types/Types";

export const cardGroupApi = {
  async getByAccountPaged(
    accountId: number,
    page: number,
    size: number,
    virtualAccountId?: number | null,
    search?: string
  ): Promise<CardGroupPage> {
    const params: any = {
      accountId,
      page,
      size,
    };

    if (virtualAccountId != null) params.virtualAccountId = virtualAccountId;
    if (search && search.trim()) params.search = search.trim();

    const { data } = await api.get<CardGroupPage>("/api/card-groups", {
      params,
    });
    return data;
  },

  async syncAccount(
    accountId: number,
    virtualAccountId?: number | null,
    cursor?: string | null,
    filterName?: string | null
  ) {
    const payload = {
      accountId,
      virtualAccountId: virtualAccountId ?? null,
      cursor: cursor ?? null,
      filterName: filterName && filterName.trim() ? filterName.trim() : null,
    };

    const { data } = await api.post("/api/card-groups/sync", payload);
    return data;
  },

  async createCardGroup(accountId: number, body: ApiCreateCardGroupParam) {
    const { data } = await api.post(
      `/api/card-groups`,
      body,
      {
        params: { accountId },
      }
    );
    return data;
  },

  async updateCardGroup(id: number, body: ApiUpdateCardGroupParam) {
    const { data } = await api.put(`/api/card-groups/${id}`, body);
    return data;
  },

  async deleteCardGroup(id: number) {
    const { data } = await api.delete(`/api/card-groups/${id}`);
    return data;
  },

  async patchSpendingConstraint(
    id: number,
    body: CardGroupSpendingConstraintParam
  ) {
    const { data } = await api.patch(
      `/api/card-groups/${id}/spending-constraint`,
      body
    );
    return data;
  },

  async putSpendingConstraint(
    id: number,
    body: CardGroupSpendingConstraintParam
  ) {
    const { data } = await api.put(
      `/api/card-groups/${id}/spending-constraint`,
      body
    );
    return data;
  },

  async getUtilization(id: number): Promise<CardGroupUtilization> {
    const { data } = await api.get<CardGroupUtilization>(
      `/api/card-groups/${id}/utilization`
    );
    return data;
  },
  
  async setHiddenCardGroup(id: number, hidden: boolean): Promise<void> {
    const body: ApiUpdateVisibilityParam = { hidden };
    await api.patch(`/api/hidden/card-groups/${id}`, body);
  },

  async hideCardGroup(id: number): Promise<void> {
    const body: ApiUpdateVisibilityParam = { hidden: true };
    await api.patch(`/api/hidden/card-groups/${id}`, body);
  },

  async unhideCardGroup(id: number): Promise<void> {
    const body: ApiUpdateVisibilityParam = { hidden: false };
    await api.patch(`/api/hidden/card-groups/${id}`, body);
  },
};
