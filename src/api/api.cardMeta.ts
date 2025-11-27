import api from "../config/api.config";
import { CardCountryOption, MccCodeOption } from "../types/Types";

export const cardMetaApi = {
  async getCountries(): Promise<CardCountryOption[]> {
    const { data } = await api.get<CardCountryOption[]>(
      "/api/meta/merchant-categories"
    );
    return data;
  },

  async getMccCodes(): Promise<MccCodeOption[]> {
    const { data } = await api.get<MccCodeOption[]>("/api/meta/countries");
    return data;
  },
};
