import api from "../config/api.config";
import {
  ApiCreateCardParam,
  ApiUpdateCardParam,
  Card,
  CardPage,
  CardCountryOption,
  MccCodeOption,
  CardUtilization,
} from "../types/Types";

export interface GetPagedCardsParams {
  accountId: number;
  virtualAccountId?: number | null;
  // cardGroupId giờ BE chưa filter theo local id, có thể map sau
  cardGroupId?: number | null;
  page: number;
  size: number;
  search?: string;
  status?: string;
  sort?: string;
  dir?: "asc" | "desc";
}

export const cardApi = {
  /**
   * GET /api/accounts/{accountId}/cards
   * BE: CardController.listCards(accountId, virtualAccountId, page, size, ...)
   */
  async getPagedCards(params: GetPagedCardsParams): Promise<CardPage> {
    const query: any = {
      page: params.page,
      size: params.size,
    };

    if (params.virtualAccountId != null) {
      query.virtualAccountId = params.virtualAccountId;
    }
    // nếu sau này BE support search/status/sort thì gửi, BE ko dùng thì cũng không sao
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

    const { data } = await api.get<CardPage>(
      `/api/accounts/${params.accountId}/cards`,
      { params: query }
    );
    return data;
  },

  /**
   * POST /api/accounts/{accountId}/cards/sync/{slashCardId}
   * match CardController.syncCardFromSlash
   */
  syncFromSlash(accountId: number) {
    return api.get(`/api/accounts/${accountId}/cards/sync`);
  },

  syncOneFromSlash(accountId: number, slashCardId: string) {
    return api.get(
      `/api/accounts/${accountId}/cards/sync/${encodeURIComponent(slashCardId)}`
    );
  },
  /**
   * POST /api/accounts/{accountId}/cards
   * Body map thẳng sang CardCreateRequest (flatten fields)
   */
  async create(params: ApiCreateCardParam): Promise<Card> {
    const { accountId, ...body } = params;

    // Nếu BE còn field extra (accountId trong body) thì có thể giữ lại:
    // const payload = { ...body, accountId };
    const payload = body;

    const { data } = await api.post<Card>(
      `/api/accounts/${accountId}/cards`,
      payload
    );
    return data;
  },

  /**
   * PUT /api/accounts/{accountId}/cards/{cardId}
   * match CardController.updateCard
   */
  async update(
    accountId: number,
    cardId: number,
    params: ApiUpdateCardParam
  ): Promise<Card> {
    const { data } = await api.put<Card>(
      `/api/accounts/${accountId}/cards/${cardId}`,
      params
    );
    return data;
  },

  /**
   * GET /api/accounts/{accountId}/cards/{cardId}
   * match CardController.getCard
   */
  async getById(accountId: number, cardId: number): Promise<Card> {
    const { data } = await api.get<Card>(
      `/api/accounts/${accountId}/cards/${cardId}`
    );
    return data;
  },

  /**
   * GET /api/accounts/{accountId}/cards/{cardId}/detail
   * match CardController.getCardDetailFromSlash
   * includePan/includeCvv để BE truyền xuống Slash vault
   */
  async getVaultCard(
    accountId: number,
    cardId: number,
    includePan: boolean = true,
    includeCvv: boolean = true
  ): Promise<any> {
    const { data } = await api.get<any>(
      `/api/accounts/${accountId}/cards/${cardId}/detail`,
      {
        params: {
          includePan,
          includeCvv,
        },
      }
    );
    return data;
  },

  /**
   * GET /api/accounts/{accountId}/cards/{cardId}/utilization
   * Cần mapping 1 endpoint trên BE gọi SlashClient.getCardUtilization
   */
  async getUtilization(
    accountId: number,
    cardId: number
  ): Promise<CardUtilization> {
    const { data } = await api.get<CardUtilization>(
      `/api/accounts/${accountId}/cards/${cardId}/utilization`
    );
    return data;
  },

  /**
   * Meta country / MCC giữ nguyên
   */
  async getCountryOptions(): Promise<CardCountryOption[]> {
    const { data } = await api.get<CardCountryOption[]>("/api/meta/countries");
    return data;
  },

  async getMccCodeOptions(): Promise<MccCodeOption[]> {
    const { data } = await api.get<MccCodeOption[]>("/api/meta/mcc-codes");
    return data;
  },
};
