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
  items: Merchant[];
  metadata: {
    nextCursor?: string | null;
    count?: number | null;
  };
}

// ======================== CARD – DTO (match CardDTO bên BE) ========================

export type CardRestrictionMode =
  | "allow"
  | "deny"
  | "default"
  | "allowlist"
  | "denylist";

// ----- Spending constraint DTO (server response) -----

export interface CardCountryRuleDTO {
  countries?: string[] | null;              // ISO2
  restriction?: string | null;              // allowlist / denylist
}

export interface CardMerchantCategoryCodeRuleDTO {
  merchantCategoryCodes?: string[] | null;  // MCC
  restriction?: string | null;              // allowlist / denylist
}

export interface CardMerchantCategoryRuleDTO {
  merchantCategoryIds?: number[] | null;    // local DB id
  restriction?: string | null;              // allowlist / denylist
}

export interface CardMerchantRuleDTO {
  merchants?: string[] | null;              // merchant keys từ Slash
  restriction?: string | null;              // allowlist / denylist
}

export interface CardUtilizationLimitDTO {
  amountCents?: number | null;
  preset?: string | null;        // daily / weekly / ...
  startDate?: string | null;     // yyyy-MM-dd
  timezone?: string | null;      // Asia/Ho_Chi_Minh
}

export interface CardTransactionSizeLimitDTO {
  minAmountCents?: number | null;
  maxAmountCents?: number | null;
}

export interface CardSpendingRuleDTO {
  utilizationLimit?: CardUtilizationLimitDTO | null;
  utilizationLimitV2?: CardUtilizationLimitDTO[] | null;
  transactionSizeLimit?: CardTransactionSizeLimitDTO | null;
}

export interface CardSpendingConstraintDTO {
  countryRule?: CardCountryRuleDTO | null;
  merchantCategoryCodeRule?: CardMerchantCategoryCodeRuleDTO | null;
  merchantCategoryRule?: CardMerchantCategoryRuleDTO | null;
  merchantRule?: CardMerchantRuleDTO | null;
  spendingRule?: CardSpendingRuleDTO | null;
}

// ----- Card DTO chính -----

export interface Card {
  merchantCategories(merchantCategories: any, merchantCategoryLabelMap: Map<string, string>): import("react").ReactNode;
  merchantNamesAllow: any;
  id: number;
  slashId: string;

  accountId: number | null;
  accountName?: string | null;

  virtualAccountId: number | null;
  virtualAccountName?: string | null;

  slashAccountId?: string | null;
  slashVirtualAccountId?: string | null;

  // cardGroupId bên BE hiện đang để String (id Slash group),
  // nếu sau này map local id thì mình thêm field khác.
  cardGroupId?: string | null;
  cardProductId?: string | null;

  name: string;
  last4?: string | null;
  status?: string | null;

  physical?: boolean | null;
  singleUse?: boolean | null;

  expiryMonth?: string | null;
  expiryYear?: string | null;

  createdAt?: string | null; // ISO
  // nếu BE có updatedAt thì add thêm ở đây
  // updatedAt?: string | null;

  // nguyên khối spendingConstraint đúng kiểu BE trả về
  spendingConstraint?: CardSpendingConstraintDTO | null;

  // Các field dưới đây FE có thể tự compute (không nhất thiết server trả):
  // countriesAllow?: string[] | null;
  // mccCodesAllow?: string[] | null;
  // merchantKeys?: string[] | null;
  // merchantCategoryIds?: number[] | null;
}

export interface CardPage {
  content: Card[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// ======================== CARD – PARAM GỬI LÊN BE ========================
// Match đúng CardCreateRequest / CardUpdateRequest bên Java

export interface ApiCreateCardParam {
  // BE dùng path /api/accounts/{accountId}, nên accountId có thể lấy từ URL.
  // Em vẫn giữ ở đây để FE tiện xài cho context.
  accountId: number;

  virtualAccountId: number;

  name: string;
  cardProductId?: string | null;
  physical?: boolean | null;
  singleUse?: boolean | null;

  // countryRule
  countryAllow?: string[] | null;                // ISO2
  countryRestriction?: CardRestrictionMode | null;

  // mccRule
  mccAllow?: string[] | null;                    // MCC
  mccRestriction?: CardRestrictionMode | null;

  // merchantCategoryRule (DB id)
  merchantCategoryIds?: number[] | null;
  merchantCategoryRestriction?: CardRestrictionMode | null;

  // merchantRule (Slash)
  merchantKeys?: string[] | null;                // merchant ids từ Slash
  merchantRestriction?: CardRestrictionMode | null;

  // spendingRule – utilization limit
  utilizationLimitAmountCents?: number | null;
  utilizationPreset?: string | null;
  utilizationStartDate?: string | null;          // yyyy-MM-dd
  utilizationTimezone?: string | null;           // Asia/Ho_Chi_Minh

  // spendingRule – transaction size limit
  txMinAmountCents?: number | null;
  txMaxAmountCents?: number | null;

  // optional custom data, nếu BE có userDataJson thì add thêm field userData ở request BE
  userData?: Record<string, any> | null;
}

export interface ApiUpdateCardParam {
  name?: string;

  // status: active | paused | inactive | closed
  status?: string | null;

  physical?: boolean | null;
  singleUse?: boolean | null;

  // countryRule
  countryAllow?: string[] | null;
  countryRestriction?: CardRestrictionMode | null;

  // mccRule
  mccAllow?: string[] | null;
  mccRestriction?: CardRestrictionMode | null;

  // merchantCategoryRule
  merchantCategoryIds?: number[] | null;
  merchantCategoryRestriction?: CardRestrictionMode | null;

  // merchantRule
  merchantKeys?: string[] | null;
  merchantRestriction?: CardRestrictionMode | null;

  // spendingRule – utilization limit
  utilizationLimitAmountCents?: number | null;
  utilizationPreset?: string | null;
  utilizationStartDate?: string | null;
  utilizationTimezone?: string | null;

  // spendingRule – transaction size limit
  txMinAmountCents?: number | null;
  txMaxAmountCents?: number | null;

  userData?: Record<string, any> | null;
}

// ======================== CARD META ========================

export interface CardCountryOption {
  id: number;
  code: string; // ISO2
  name: string;
  region?: string; // Asia, EU, NA…
}

export interface MccCodeOption {
  id: number;
  code: string; // "5812", "5411"...
  name: string;
}

export interface CardUtilization {
  cardId: number;
  slashId: string;
  limitAmountCents: number | null;
  availableBalanceCents: number | null;
  spendAmountCents: number | null;
  nextResetDate?: string | null; // ISO
}
