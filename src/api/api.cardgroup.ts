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
  /**
   * GET /api/card-groups
   * Query:
   *  - accountId (bắt buộc)
   *  - page, size
   *  - virtualAccountId? (optional filter theo VA)
   *  - search? (optional)
   */
  async getByAccountPaged(
    accountId: number,
    page: number,
    size: number,
    virtualAccountId?: number,
    search?: string
  ): Promise<CardGroupPage> {
    const params: any = { accountId, page, size };
    if (virtualAccountId !== undefined) {
      params.virtualAccountId = virtualAccountId;
    }
    if (search) {
      params.search = search;
    }

    const { data } = await api.get<CardGroupPage>("/api/card-groups", { params });
    return data;
  },

  /**
   * POST /api/card-groups/sync/account/{accountId}
   * Trigger BE sync toàn bộ Card Group (và các phần liên quan) cho 1 account.
   */
  async syncAccount(
    accountId: number
  ): Promise<{ message: string; count: number }> {
    const { data } = await api.post<{ message: string; count: number }>(
      `/api/card-groups/sync/account/${accountId}`,
      null
    );
    return data;
  },

  /**
   * (Nếu BE có thêm endpoint sync theo virtual account)
   * POST /api/card-groups/sync/virtual-account/{virtualAccountId}
   */
  async syncByVirtualAccount(
    virtualAccountId: number
  ): Promise<{ message: string; count: number }> {
    const { data } = await api.post<{ message: string; count: number }>(
      `/api/card-groups/sync/virtual-account/${virtualAccountId}`,
      null
    );
    return data;
  },

  /**
   * POST /api/card-groups?accountId=...
   * Body: ApiCreateCardGroupParam
   */
  async createCardGroup(
    accountId: number,
    body: ApiCreateCardGroupParam
  ) {
    const { data } = await api.post(
      `/api/card-groups`,
      body,
      { params: { accountId } }
    );
    return data;
  },

  /**
   * PUT /api/card-groups/{id}
   * Body: ApiUpdateCardGroupParam
   */
  async updateCardGroup(
    id: number,
    body: ApiUpdateCardGroupParam
  ) {
    const { data } = await api.put(`/api/card-groups/${id}`, body);
    return data;
  },

  /**
   * DELETE /api/card-groups/{id}
   */
  async deleteCardGroup(id: number) {
    const { data } = await api.delete(`/api/card-groups/${id}`);
    return data;
  },

  /**
   * PATCH /api/card-groups/{id}/spending-constraint
   * Body: CardGroupSpendingConstraintParam
   * -> BE sẽ map sang Slash PATCH /card-group/{slashId}/spending-constraint
   */
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

  /**
   * PUT /api/card-groups/{id}/spending-constraint
   * Body: CardGroupSpendingConstraintParam
   * -> BE sẽ map sang Slash PUT /card-group/{slashId}/spending-constraint
   */
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

  /**
   * GET /api/card-groups/{id}/utilization
   * -> BE lấy từ Slash GET /card-group/{slashId}/utilization hoặc từ cache
   */
  async getUtilization(id: number): Promise<CardGroupUtilization> {
    const { data } = await api.get<CardGroupUtilization>(
      `/api/card-groups/${id}/utilization`
    );
    return data;
  },

  /**
   * PATCH /api/hidden/card-groups/{id}
   * Body: { hidden: boolean }
   */
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
