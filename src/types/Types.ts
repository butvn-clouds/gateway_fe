// ======================== AUTH & ACCOUNT & VA ========================

export interface VirtualAccount {
  id: number;
  slashId: string;
  accountId: number | null;
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

export interface Account {
  id: number;
  name: string;
  apiKey?: string;
  slashAccountId?: string | null;
  virtualAccounts?: VirtualAccount[];
  label?: string;
}

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

// ======================== AUTH API ========================

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

// ======================== VIRTUAL ACCOUNT CRUD ========================

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

// ======================== CARD GROUP ========================

export interface CardGroup {
  id: number;
  slashId: string;
  accountId: number | null;
  virtualAccountId: number | null;
  virtualAccountName?: string | null;
  name: string;
  dailyLimitCents?: number | null;
  minTransactionCents?: number | null;
  maxTransactionCents?: number | null;
  startDate?: string | null; // yyyy-MM-dd
  closed: boolean;
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

export interface ApiCreateCardGroupParam {
  virtualAccountId: number;
  name: string;
  dailyLimitCents?: number | null;
  minTransactionCents?: number | null;
  maxTransactionCents?: number | null;
  startDate?: string | null;
  timezone?: string | null;
  preset?: string | null;
}

export interface ApiUpdateCardGroupParam {
  name?: string;
  dailyLimitCents?: number | null;
  minTransactionCents?: number | null;
  maxTransactionCents?: number | null;
  startDate?: string | null;
  timezone?: string | null;
  preset?: string | null;
}

export interface CardGroupCreateRequest {
  virtualAccountId: number;
  name: string;
  dailyLimitCents?: number | null;
  minTransactionCents?: number | null;
  maxTransactionCents?: number | null;
  startDate?: string | null;
  timezone?: string | null;
  preset?: string | null;
}

export interface CardGroupUpdateRequest {
  name?: string;
  dailyLimitCents?: number | null;
  minTransactionCents?: number | null;
  maxTransactionCents?: number | null;
  startDate?: string | null;
  timezone?: string | null;
  preset?: string | null;
}

export type CardGroupRestrictionType = "allowlist" | "denylist";

export interface CardGroupSpendingConstraintParam {
  dailyLimitCents?: number | null;
  minTransactionCents?: number | null;
  maxTransactionCents?: number | null;
  startDate?: string | null;
  timezone?: string | null;
  preset?: string | null;

  merchantIds?: string[] | null;
  merchantRestriction?: CardGroupRestrictionType | null;

  countries?: string[] | null;
  countryRestriction?: CardGroupRestrictionType | null;

  // giá trị là slashId của MerchantCategory: "merchant_category_xxx"
  merchantCategories?: string[] | null;
  merchantCategoryRestriction?: CardGroupRestrictionType | null;

  merchantCategoryCodes?: string[] | null;
  merchantCategoryCodeRestriction?: CardGroupRestrictionType | null;
}

export interface CardGroupUtilization {
  nextResetDate?: string | null;
  spendAmountCents?: number | null;
  availableBalanceCents?: number | null;
}

export interface CardGroupUtilizationPage {
  content: CardGroupUtilization[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface MerchantCategory {
  id: number;
  slashId: string;
  name: string;
  displayOrder?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface MerchantCategoryPage {
  content: MerchantCategory[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// Merchant (Slash)
export interface Merchant {
  id: string;
  name?: string | null;
  url?: string | null;
}

export interface MerchantSearchResponse {
  items: Merchant[];
  metadata: {
    nextCursor?: string | null;
    count?: number | null;
  };
}