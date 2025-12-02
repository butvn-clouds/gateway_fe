import api from "../config/api.config";
import {
  MerchantCategory,
  MerchantCategoryPage,
  MerchantSearchResponse,
} from "../types/Types";

export const merchantApi = {
  async getPagedCategories(
    page: number,
    size: number,
    search?: string
  ): Promise<MerchantCategoryPage> {
    const params: any = { page, size };
    if (search && search.trim()) params.search = search.trim();

    const { data } = await api.get<MerchantCategoryPage>(
      "/api/merchant-categories",
      { params }
    );
    return data;
  },

  async getAllCategories(): Promise<MerchantCategory[]> {
    const { data } = await api.get<MerchantCategoryPage>(
      "/api/merchant-categories",
      {
        params: { page: 0, size: 1000 },
      }
    );
    return data.content || [];
  },

  async syncCategoriesFromSlash(
    accountId: number
  ): Promise<{ message: string; synced: number }> {
    const { data } = await api.post<{ message: string; synced: number }>(
      "/api/merchant-categories/sync",
      null,
      { params: { accountId } }
    );
    return data;
  },

  async searchMerchants(
    accountId: number,
    search: string,
    cursor?: string
  ): Promise<MerchantSearchResponse> {
    const params: any = { accountId };
    if (search && search.trim()) params.search = search.trim();
    if (cursor) params.cursor = cursor;

    const { data } = await api.get<MerchantSearchResponse>("/api/merchants", {
      params,
    });
    console.log("searchMerchants /api/merchants =", data);
    return data;
  },
};
