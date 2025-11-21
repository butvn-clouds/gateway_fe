// src/api/api.virtualaccout.ts
import api from "../config/api.config";
import {
  VirtualAccount,
  VirtualAccountPage,
  ApiCreateVirtualAccountParam,
  ApiUpdateVirtualAccountParam,
} from "../types/Types";

export const virtualAccountApi = {
  async getMyVirtualAccounts(): Promise<VirtualAccount[]> {
    const res = await api.get<VirtualAccount[]>("/api/virtual-accounts/me");
    return res.data;
  },

  async getByAccountPaged(
    accountId: number,
    page: number = 0,
    size: number = 10
  ): Promise<VirtualAccountPage> {
    const safePage =
      typeof page === "number" && Number.isFinite(page) && page >= 0 ? page : 0;

    const safeSize =
      typeof size === "number" && Number.isFinite(size) && size > 0 ? size : 10;

    const res = await api.get<VirtualAccountPage>(
      `/api/virtual-accounts/account/${accountId}`,
      {
        params: {
          page: safePage,
          size: safeSize,
        },
      }
    );
    return res.data;
  },

  async syncAccount(accountId: number): Promise<VirtualAccount[]> {
    const res = await api.post<VirtualAccount[]>(
      `/api/virtual-accounts/sync/${accountId}`
    );
    return res.data;
  },

  async createVirtualAccount(
    accountId: number,
    body: ApiCreateVirtualAccountParam
  ): Promise<VirtualAccount> {
    const res = await api.post<VirtualAccount>(
      `/api/virtual-accounts/account/${accountId}`,
      body
    );
    return res.data;
  },

  async updateVirtualAccount(
    id: number,
    body: ApiUpdateVirtualAccountParam
  ): Promise<VirtualAccount> {
    const res = await api.put<VirtualAccount>(
      `/api/virtual-accounts/${id}`,
      body
    );
    return res.data;
  },

  async deleteVirtualAccount(id: number): Promise<void> {
    await api.delete(`/api/virtual-accounts/${id}`);
  },
};
