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
  virtualAccountId?: number,
  search?: string
) {
  const params: any = { accountId, page, size };
  if (virtualAccountId !== undefined) {
    params.virtualAccountId = virtualAccountId;
  }
  if (search) params.search = search;
  return api.get("/api/card-groups", { params }).then(res => res.data);
},

  async syncAccount(
   accountId: number
     ): Promise<{ message: string; count: number }> {
       const { data } = await api.post<{ message: string; count: number }>(
         `/api/card-groups/sync/${accountId}`,
         null
       );
       return data;
     },
   

  async createCardGroup(accountId: number, body: ApiCreateCardGroupParam) {
    const { data } = await api.post(`/api/card-groups`, body, {
      params: { accountId },
    });
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
