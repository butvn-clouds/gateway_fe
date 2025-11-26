// src/api/api.cardMeta.ts
import api from "../config/api.config";
import { CardCountryOption, MccCodeOption } from "../types/Types";

export const cardMetaApi = {
  async getCountries(): Promise<CardCountryOption[]> {
    const res = await api.get<CardCountryOption[]>(`/api/card-options/countries`);
    return res.data;
  },

  async getMccCodes(): Promise<MccCodeOption[]> {
    const res = await api.get<MccCodeOption[]>(`/api/card-options/mcc-codes`);
    return res.data;
  },
};
