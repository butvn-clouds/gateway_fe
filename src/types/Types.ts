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

// ======================== ACCOUNT PAGE ========================

export interface AccountPage {
  content: Account[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// ======================== VIRTUAL ACCOUNT PAGE + CRUD ========================

export interface VirtualAccountPage {
  content: VirtualAccount[];

  totalPages: number;
  totalElements: number;
  size: number;
  number: number; // page index (0-based)

  first?: boolean;
  last?: boolean;
  numberOfElements?: number;
  empty?: boolean;
}

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

// ======================== MERCHANT CATEGORY / MERCHANT ========================

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
  // BE trả về:
  // {
  //   "items": [...],
  //   "metadata": { "nextCursor": "...", "count": ... }
  // }
  items: Merchant[];
  metadata: {
    nextCursor?: string | null;
    count?: number | null;
  };
}

// ======================== CARD ========================

export interface Card {
  id: number;
  slashId: string;

  // debug / filter theo Slash
  slashAccountId?: string | null;
  slashVirtualAccountId?: string | null;
  slashCardGroupId?: string | null;
  cardProductId?: string | null;

  accountId: number | null;
  accountName?: string | null;

  virtualAccountId: number | null;
  virtualAccountName?: string | null;

  cardGroupId: number | null;
  cardGroupName?: string | null;

  name: string;
  last4?: string | null;
  status?: string | null; // "active" | "inactive" | "closed" | ...

  isPhysical?: boolean | null;
  isSingleUse?: boolean | null;
  pan?: string | null;
  cvv?: string | null;
  isPhysicalCard?: boolean | null;
  singleUse?: boolean | null;
  expiryMonth?: string | null; // "01".."12"
  expiryYear?: string | null; // "2028"...

  // summary limit lấy từ spendingConstraint
  dailyLimitCents?: number | null;
  minTransactionCents?: number | null;
  maxTransactionCents?: number | null;

  // từ spendingConstraintJson (countryRule / mccRule / merchantRule ...)
  countriesAllow?: string[] | null; // ISO2
  mccCodesAllow?: string[] | null; // MCC
  merchantIds?: string[] | null; // merchant id (Slash)
  merchantCategories?: string[] | null; // merchant_category_xxx
  merchantNamesAllow?: string[] | null; // optional – nếu FE muốn map thêm

  createdAt?: string | null; // ISO
  updatedAt?: string | null; // ISO
}

export interface CardPage {
  content: Card[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// ======================== CARD SPENDING CONSTRAINT ========================

export type CardRestrictionMode =
  | "allow"
  | "deny"
  | "default"
  | "allowlist"
  | "denylist";

export interface CardAmount {
  amountCents?: number | null;
  currencyCode?: string | null; // ví dụ "USD"
}

export interface CardUtilizationLimit {
  rollingWindow?: string | null; // "daily", "weekly", ...
  limitAmount?: CardAmount | null;
}

export interface CardTransactionSizeLimit {
  minimum?: CardAmount | null;
  maximum?: CardAmount | null;
}

export interface CardCountryRuleParam {
  mode?: CardRestrictionMode | null;
  countries?: string[] | null; // ISO2
}

export interface CardMerchantCategoryCodeRuleParam {
  mode?: CardRestrictionMode | null;
  merchantCategoryCodes?: string[] | null; // MCC
}

export interface CardMerchantCategoryRuleParam {
  mode?: CardRestrictionMode | null;
  merchantCategories?: string[] | null; // "merchant_category_xxx"
}

export interface CardMerchantRuleParam {
  mode?: CardRestrictionMode | null;
  merchants?: string[] | null; // merchant ids
}

export interface CardSpendingRuleParam {
  mode?: CardRestrictionMode | null;

  utilizationLimit?: CardUtilizationLimit | null;
  utilizationLimitV2?: CardUtilizationLimit[] | null;

  transactionSizeLimit?: CardTransactionSizeLimit | null;
}

// mirror CardSpendingConstraintDTO bên BE
export interface CardSpendingConstraintParam {
  countryRule?: CardCountryRuleParam | null;
  merchantCategoryCodeRule?: CardMerchantCategoryCodeRuleParam | null;
  merchantCategoryRule?: CardMerchantCategoryRuleParam | null;
  merchantRule?: CardMerchantRuleParam | null;
  spendingRule?: CardSpendingRuleParam | null;
}

// ======================== CARD CREATE / UPDATE PARAM ========================

// FE gửi local id (BE tự lookup ra slashId từ VA/CardGroup)
export interface ApiCreateCardParam {
  // local account id (để BE tìm Account & apiKey)
  accountId: number;

  // local DB ids
  virtualAccountId: number;
  cardGroupId?: number | null;

  name: string;

  cardProductId?: string | null;
  isPhysical?: boolean | null;
  isSingleUse?: boolean | null;

  spendingConstraint?: CardSpendingConstraintParam | null;

  // tuỳ em, BE map vào user_data_json
  userData?: Record<string, any> | null;
}

export interface ApiUpdateCardParam {
  name?: string;
  cardProductId?: string | null;
  isPhysical?: boolean | null;
  isSingleUse?: boolean | null;

  // nếu cần chuyển card sang VA / CardGroup khác (local DB id)
  virtualAccountId?: number | null;
  cardGroupId?: number | null;

  spendingConstraint?: CardSpendingConstraintParam | null;

  userData?: Record<string, any> | null;
}

// ======================== CARD META / OPTIONS ========================

export interface CardCountryOption {
  code: string; // ISO2
  name: string;
  region?: string | null; // Asia, EU, NA...
}

export interface MccCodeOption {
  code: string; // MCC code
  name: string;
}

// ======================== CARD UTILIZATION ========================

export interface CardUtilization {
  cardId: number;
  slashId: string;

  limitAmountCents: number | null;
  availableBalanceCents: number | null;
  spendAmountCents: number | null;

  nextResetDate?: string | null; // ISO
}
