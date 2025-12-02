import api from "../config/api.config";
import { CardCountryOption, MccCodeOption } from "../types/Types";

export const cardMetaApi = {
  async getCountries(): Promise<CardCountryOption[]> {
    const { data } = await api.get<CardCountryOption[]>(
      "/api/meta/countries"
    );
    return data;
  },

  getMccCodes: async (): Promise<MccCodeOption[]> => {
    const res = await api.get<MccCodeOption[]>("/api/meta/mcc-codes");
    return res.data;
  },
};
