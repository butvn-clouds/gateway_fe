// src/types/Types.ts

/* ====================================================================== */
/*                           VIRTUAL ACCOUNT                              */
/* ====================================================================== */

export interface VirtualAccount {
  id: number;
  slashId: string;

  /** id account local – BE map từ va.getAccount().getId() */
  accountId: number | null;
  /** tên account local – BE map từ va.getAccount().getName() */
  accountName?: string | null;

  name?: string | null;
  routingNumber?: string | null;
  accountNumber?: string | null;
  accountType?: string | null;

  slashAccountId?: string | null;
  closedAt?: string | null;

  balanceCents?: number | null;
  spendCents?: number | null;

  commissionType?: string | null;
  commissionAmountCents?: number | null;
  commissionFrequency?: string | null;
  commissionStartDateIso?: string | null;
}

/* ====================================================================== */
/*                                ACCOUNT                                 */
/* ====================================================================== */

export interface Account {
  id: number;
  name: string;
  apiKey?: string;

  slashAccountId?: string | null;

  virtualAccounts?: VirtualAccount[];
  label?: string;
}

/* ====================================================================== */
/*                                  AUTH                                  */
/* ====================================================================== */

export type AuthRole = "ROLE_USER" | "ROLE_ADMIN";

export interface SlashAccountLabel {
  id: number;
  accountId: number;
  virtualAccountId: number | null;
  label: string;
}

export interface Auth {
  activeAccount: any;
  id: number;
  username: string;
  name?: string;
  role: AuthRole;

  accountIds: number[];
  virtualAccountIds: number[];

  accounts: Account[];
  virtualAccounts: VirtualAccount[];

  createdAt: string;
  updatedAt: string;

  accountLabel?: string;
  virtualAccountLabel?: string;

  slashAccounts?: SlashAccountLabel[];
}

export interface AuthContextTypes {
  user: Auth | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  loading: boolean;
}

export interface ApiLoginParam {
  username: string;
  password: string;
}

export interface ApiLoginResponse {
  user: Auth;
  message: string;
  token: string;
}

export interface ApiCreateUserParam {
  username: string;
  password: string;
  name?: string;
  role: AuthRole;
  accountIds: number[];
  virtualAccountIds?: number[];
}

export interface ApiUpdateUserParam {
  username?: string;
  name?: string;
  role?: AuthRole;
  accountIds?: number[];
  virtualAccountIds?: number[];
}

export interface ApiUserPage {
  content: Auth[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/* ====================================================================== */
/*                            ACCOUNT / VA PAGE                           */
/* ====================================================================== */

export interface AccountPage {
  content: Account[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface VirtualAccountPage {
  content: VirtualAccount[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/* ====================================================================== */
/*                     VA CREATE / UPDATE REQUESTS                        */
/* ====================================================================== */

export interface ApiCreateVirtualAccountParam {
  name: string;
  commissionType?: string | null;
  commissionAmountCents?: number | null;
  commissionFrequency?: string | null;
  commissionStartDateIso?: string | null;
  initialFundingAmountCents?: number | null;
}

export interface ApiUpdateVirtualAccountParam {
  name?: string;
  commissionType?: string | null;
  commissionAmountCents?: number | null;
  commissionFrequency?: string | null;
  commissionStartDateIso?: string | null;
}

export interface VirtualAccountCreateRequest {
  name: string;
  commissionType?: string | null;
  commissionAmountCents?: number | null;
  commissionFrequency?: string | null;
  commissionStartDateIso?: string | null;
  initialFundingAmountCents?: number | null;
}

export interface VirtualAccountUpdateRequest {
  name?: string;
  commissionType?: string | null;
  commissionAmountCents?: number | null;
  commissionFrequency?: string | null;
  commissionStartDateIso?: string | null;
}

/* ====================================================================== */
/*                           CARD GROUP INTERFACES                        */
/* ====================================================================== */

export interface CardGroup {
  id: number;
  slashId: string;

  /** map từ CardsGroupsDTO.accountId */
  accountId: number | null;
  /** map từ CardsGroupsDTO.virtualAccountId */
  virtualAccountId: number | null;

  /**
   * optional – BE có thể map thêm từ cg.getVirtualAccount().getName()
   * (hiện DTO chưa có field này thì sẽ undefined, không lỗi)
   */
  virtualAccountName?: string | null;

  /** CardsGroupsDTO.name */
  name: string;

  /** limit từ spendingConstraint / CardGroup.dailyLimitCents */
  dailyLimitCents?: number | null;
  minTransactionCents?: number | null;
  maxTransactionCents?: number | null;

  /** LocalDate từ BE, JSON field "startDate": "yyyy-MM-dd" */
  startDate?: string | null;

  closed: boolean;

  /** LocalDateTime ISO string, vd: "2025-11-24T13:45:00" */
  createdAt: string;
  updatedAt: string;
}

export interface CardGroupPage {
  content: CardGroup[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/**
 * body FE gửi lên POST /api/card-groups?accountId={accountId}
 * -> map 1–1 với CardGroupCreateRequest bên BE
 */
export interface ApiCreateCardGroupParam {
  /** id VA (local) – BE map sang VirtualAccount entity */
  virtualAccountId: number;
  name: string;

  dailyLimitCents?: number | null;
  minTransactionCents?: number | null;
  maxTransactionCents?: number | null;

  /** yyyy-MM-dd, map thẳng sang LocalDate startDate bên BE */
  startDate?: string | null;

  /** timezone string, ví dụ "UTC", "Asia/Ho_Chi_Minh" */
  timezone?: string | null;

  /** preset reset limit: vd "daily", "weekly"... */
  preset?: string | null;
}

/**
 * body FE gửi lên PUT /api/card-groups/{id}
 * -> map 1–1 với CardGroupUpdateRequest bên BE
 */
export interface ApiUpdateCardGroupParam {
  name?: string;

  dailyLimitCents?: number | null;
  minTransactionCents?: number | null;
  maxTransactionCents?: number | null;

  /** yyyy-MM-dd */
  startDate?: string | null;
  timezone?: string | null;
  preset?: string | null;
}

/** request mapping 1–1 với CardGroupCreateRequest bên BE */
export interface CardGroupCreateRequest {
  virtualAccountId: number;
  name: string;
  dailyLimitCents?: number | null;
  minTransactionCents?: number | null;
  maxTransactionCents?: number | null;
  /** yyyy-MM-dd */
  startDate?: string | null;
  timezone?: string | null;
  preset?: string | null;
}

/** request mapping 1–1 với CardGroupUpdateRequest bên BE */
export interface CardGroupUpdateRequest {
  name?: string;
  dailyLimitCents?: number | null;
  minTransactionCents?: number | null;
  maxTransactionCents?: number | null;
  /** yyyy-MM-dd */
  startDate?: string | null;
  timezone?: string | null;
  preset?: string | null;
}

/* ====================================================================== */
/*                     CARD GROUP SPENDING CONSTRAINT                     */
/* ====================================================================== */

export type CardGroupRestrictionType = "allowlist" | "denylist";

/** body gửi PATCH/PUT /api/card-groups/{id}/spending-constraint
 *  -> map 1–1 với CardGroupSpendingConstraintRequest bên BE
 */
export interface CardGroupSpendingConstraintParam {
  dailyLimitCents?: number | null;
  minTransactionCents?: number | null;
  maxTransactionCents?: number | null;

  /** yyyy-MM-dd – map sang LocalDate startDate bên CardGroupSpendingConstraintRequest */
  startDate?: string | null;
  timezone?: string | null;
  preset?: string | null;

  merchantIds?: string[] | null;
  merchantRestriction?: CardGroupRestrictionType | null;

  countries?: string[] | null;
  countryRestriction?: CardGroupRestrictionType | null;

  merchantCategories?: string[] | null;
  merchantCategoryRestriction?: CardGroupRestrictionType | null;

  merchantCategoryCodes?: string[] | null;
  merchantCategoryCodeRestriction?: CardGroupRestrictionType | null;
}

/* ====================================================================== */
/*                       CARD GROUP UTILIZATION DTO                       */
/* ====================================================================== */

export interface CardGroupUtilization {
  /**
   * BE CardGroupUtilizationDTO.nextResetDate: string
   * Thường dạng "yyyy-MM-dd" (hoặc ISO date string)
   */
  nextResetDate?: string | null;
  spendAmountCents?: number | null;
  availableBalanceCents?: number | null;
}

/* nếu sau này ông muốn list history utilization thì xài, còn hiện tại API đang trả single */
export interface CardGroupUtilizationPage {
  content: CardGroupUtilization[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
