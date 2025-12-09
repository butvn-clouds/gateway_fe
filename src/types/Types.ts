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

// ======================== CARD META / UTILIZATION / PRODUCTS / MODIFIERS ========================

export type CardRestrictionMode =
  | "allow"
  | "deny"
  | "default"
  | "allowlist"
  | "denylist";

export interface CardAmount {
  amountCents?: number | null;
  currency?: string | null;
}

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
  description?: string; // cho UI hiển thị {code} – {description}
}

// ======================== CARD – SPENDING CONSTRAINT ========================

export interface CardCountryRuleParam {
  countries?: string[] | null; // ISO2
  restriction?: CardRestrictionMode | null; // allowlist / denylist / ...
}

export interface CardMerchantCategoryCodeRuleParam {
  merchantCategoryCodes?: string[] | null; // MCC
  restriction?: CardRestrictionMode | null;
}

export interface CardMerchantCategoryRuleParam {
  merchantCategories?: string[] | null; // Slash merchant_category_xxx
  restriction?: CardRestrictionMode | null;
}

export interface CardMerchantRuleParam {
  merchants?: string[] | null; // merchant IDs / keys từ Slash
  restriction?: CardRestrictionMode | null;
}

export interface CardUtilizationLimitParam {
  timezone?: string | null; // "Asia/Ho_Chi_Minh"
  limitAmount?: CardAmount | null;
  preset?: string | null; // "daily" / "weekly" / ...
  startDate?: string | null; // "2025-10-01"
}

export interface CardTransactionSizeLimitParam {
  minimum?: CardAmount | null;
  maximum?: CardAmount | null;
}

export interface CardSpendingRuleParam {
  utilizationLimit?: CardUtilizationLimitParam | null;
  utilizationLimitV2?: CardUtilizationLimitParam[] | null;
  transactionSizeLimit?: CardTransactionSizeLimitParam | null;
}

/**
 * Match với Slash JSON:
 *
 * spendingConstraint: {
 *   countryRule: { countries, restriction },
 *   merchantCategoryCodeRule: { merchantCategoryCodes, restriction },
 *   merchantCategoryRule: { merchantCategories, restriction },
 *   merchantRule: { merchants, restriction },
 *   spendingRule: {
 *     utilizationLimit,
 *     utilizationLimitV2,
 *     transactionSizeLimit
 *   }
 * }
 *
 * Đồng thời có thêm các field flatten để FE xài cho tiện.
 */
export interface CardSpendingConstraintParam {
  // Nested rules (match Slash JSON)
  countryRule?: CardCountryRuleParam | null;
  merchantCategoryCodeRule?: CardMerchantCategoryCodeRuleParam | null;
  merchantCategoryRule?: CardMerchantCategoryRuleParam | null;
  merchantRule?: CardMerchantRuleParam | null;
  spendingRule?: CardSpendingRuleParam | null;

  // Transaction size / utilization (flatten cấp 1 nếu cần)
  utilizationLimit?: CardUtilizationLimitParam | null;
  transactionSizeLimit?: CardTransactionSizeLimitParam | null;

  // Country rule (flatten)
  countries?: string[] | null;
  countryRestriction?: CardRestrictionMode | null;

  // MCC codes rule (flatten)
  merchantCategoryCodes?: string[] | null;
  merchantCategoryCodeRestriction?: CardRestrictionMode | null;

  // Merchant categories rule (flatten) – giá trị là slashId "merchant_category_xxx"
  merchantCategories?: string[] | null;
  merchantCategoryRestriction?: CardRestrictionMode | null;

  // Merchants rule (flatten)
  merchants?: string[] | null;
  merchantRestriction?: CardRestrictionMode | null;
}

// ======================== CARD GROUP ========================

// ======================== CARD GROUP ========================

export type CardGroupRestrictionType = "allowlist" | "denylist";

/**
 * Card Group spendingConstraint – riêng cho Card Group
 * map 1-1 với com.drms.gateway.dto.CardGroups.CardGroupSpendingConstraintParam
 * và JSON Slash card-group.spendingConstraint
 */

export interface CardGroupCountryRuleParam {
  countries?: string[] | null; // ISO2
  restriction?: CardGroupRestrictionType | string | null;
}

export interface CardGroupMerchantCategoryCodeRuleParam {
  merchantCategoryCodes?: string[] | null; // MCC
  restriction?: CardGroupRestrictionType | string | null;
}

export interface CardGroupMerchantCategoryRuleParam {
  merchantCategories?: string[] | null; // merchant_category_xxx
  restriction?: CardGroupRestrictionType | string | null;
}

export interface CardGroupMerchantRuleParam {
  merchants?: string[] | null; // merchant IDs / keys từ Slash
  restriction?: CardGroupRestrictionType | string | null;
}

export interface CardGroupUtilizationLimitParam {
  timezone?: string | null; // "Asia/Ho_Chi_Minh"
  limitAmount?: CardAmount | null;
  preset?: string | null; // "daily" | "weekly" | ...
  startDate?: string | null; // yyyy-MM-dd
}

export interface CardGroupTransactionSizeLimitParam {
  minimum?: CardAmount | null;
  maximum?: CardAmount | null;
}

export interface CardGroupSpendingRuleParam {
  utilizationLimit?: CardGroupUtilizationLimitParam | null;
  utilizationLimitV2?: CardGroupUtilizationLimitParam[] | null;
  transactionSizeLimit?: CardGroupTransactionSizeLimitParam | null;
}

/**
 * spendingConstraint của Card Group
 */
export interface CardGroupSpendingConstraintParam {
  merchantCategoryRule?: CardGroupMerchantCategoryRuleParam | null;
  merchantRule?: CardGroupMerchantRuleParam | null;
  spendingRule?: CardGroupSpendingRuleParam | null;
  countryRule?: CardGroupCountryRuleParam | null;
  merchantCategoryCodeRule?: CardGroupMerchantCategoryCodeRuleParam | null;
}

export type CardGroupSpendingConstraint = CardGroupSpendingConstraintParam;

/* ------------------------------------------------------------------
 * RAW SLASH – CARD GROUP (map 1-1 với JSON Slash)
 * -----------------------------------------------------------------*/

export interface SlashCardGroup {
  id: string;
  name: string;
  virtualAccountId: string;
  spendingConstraint?: CardGroupSpendingConstraintParam | null;
}

/**
 * List card groups
 *
 * {
 *   "items": [ { ...SlashCardGroup } ],
 *   "metadata": { "nextCursor": "...", "count": 123 }
 * }
 */
export interface SlashCardGroupListResponse {
  items: SlashCardGroup[];
  metadata: {
    nextCursor?: string | null;
    count?: number | null;
  };
}

/**
 * Create / Get / Update card group
 */
export type SlashCreateCardGroupResponse = SlashCardGroup;
export type SlashGetCardGroupResponse = SlashCardGroup;
export type SlashUpdateCardGroupResponse = SlashCardGroup;

/**
 * Apply a partial update / Replace a card group's spending constraint
 *
 * Payload JSON:
 * {
 *   "merchantCategoryRule": { ... },
 *   "merchantRule": { ... },
 *   "spendingRule": { ... },
 *   "countryRule": { ... },
 *   "merchantCategoryCodeRule": { ... }
 * }
 */
export type SlashPatchCardGroupSpendingConstraintRequest =
  CardGroupSpendingConstraintParam;

export type SlashPutCardGroupSpendingConstraintRequest =
  CardGroupSpendingConstraintParam;

/**
 * Get card group utilization – map 1-1 JSON Slash:
 *
 * {
 *   "nextResetDate": "2023-11-07T05:31:56Z",
 *   "spend": { "amountCents": 123 },
 *   "availableBalance": { "amountCents": 123 }
 * }
 */
export interface SlashCardGroupUtilization {
  nextResetDate?: string | null;
  spend?: CardAmount | null;
  availableBalance?: CardAmount | null;
}

/* ------------------------------------------------------------------
 * GATEWAY / DB DTO – dùng cho API nội bộ /api/card-groups
 * -----------------------------------------------------------------*/

export interface CardsGroupsDTO {
  id: number;
  slashId: string;
  accountId: number;
  accountName: string;
  virtualAccountId: number;
  virtualAccountName: string;
  name: string;

  timezone?: string | null;
  dailyLimitCents?: number | null;
  minTransactionCents?: number | null;
  maxTransactionCents?: number | null;
  startDate?: string | null;

  countriesAllow: string[];
  mccCodesAllow: string[];
  merchantIds: string[];
  merchantCategories: string[];
  merchantNamesAllow: string[];

  countryRestriction: CardGroupRestrictionType | null;
  merchantCategoryCodeRestriction: CardGroupRestrictionType | null;
  merchantRestriction: CardGroupRestrictionType | null;
  merchantCategoryRestriction: CardGroupRestrictionType | null;

  /**
   * BE map từ utilizationLimitV2 (Slash) sang list CardGroupUtilizationLimitParam,
   * rồi serialize ra JSON trả cho FE.
   *
   * Response mẫu:
   * "utilizationLimitV2Json": [
   *   {
   *     "timezone": null,
   *     "limitAmount": { "amountCents": 1000000 },
   *     "preset": "daily",
   *     "startDate": null
   *   }
   * ]
   */
  utilizationLimitV2Json?: CardGroupUtilizationLimitParam[] | null;

  /**
   * Optional: raw spendingConstraint full JSON nếu BE expose thêm.
   */
  spendingConstraint?: CardGroupSpendingConstraintParam | null;

  closed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CardGroupPage {
  content: CardsGroupsDTO[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/* ------------------------------------------------------------------
 * PARAM FE <-> GATEWAY CHO CREATE / UPDATE CARD GROUP
 * -----------------------------------------------------------------*/

/**
 * FE gọi API create card group
 * BE map sang CardGroupCreateRequest rồi call Slash create card group.
 */
export interface ApiCreateCardGroupParam {
  // id DB của VA gốc – BE tự map sang slashVirtualAccountId
  virtualAccountId: number;
  name: string;

  // Các field flatten cho UI (BE có thể dùng để build spendingConstraint)
  timezone?: string | null;
  dailyLimitCents?: number | null;
  startDate?: string | null; // yyyy-MM-dd

  minTransactionCents?: number | null;
  maxTransactionCents?: number | null;

  countriesAllow?: string[] | null;
  mccCodesAllow?: string[] | null;

  merchantCategories?: string[] | null;
  merchantCategoryRestriction?: CardGroupRestrictionType | null;

  merchantIds?: string[] | null;
  merchantNamesAllow?: string[] | null;
  merchantRestriction?: CardGroupRestrictionType | null;

  // Raw spendingConstraint giống Slash (ưu tiên dùng nếu có)
  spendingConstraint?: CardGroupSpendingConstraintParam | null;

  closed?: boolean | null;
}

/**
 * FE gọi API update card group basic info (name, status, limits…)
 * BE map sang CardGroupUpdateRequest
 */
export interface ApiUpdateCardGroupParam {
  name?: string;

  timezone?: string | null;
  dailyLimitCents?: number | null;
  startDate?: string | null;

  minTransactionCents?: number | null;
  maxTransactionCents?: number | null;

  countriesAllow?: string[] | null;
  mccCodesAllow?: string[] | null;

  merchantCategories?: string[] | null;
  merchantCategoryRestriction?: CardGroupRestrictionType | null;

  merchantIds?: string[] | null;
  merchantNamesAllow?: string[] | null;
  merchantRestriction?: CardGroupRestrictionType | null;

  spendingConstraint?: CardGroupSpendingConstraintParam | null;

  closed?: boolean | null;
}

/**
 * “Raw request” map 1-1 sang Java:
 * - CardGroupCreateRequest
 * - CardGroupUpdateRequest
 */
export interface CardGroupCreateRequest {
  virtualAccountId: number;
  name: string;

  timezone?: string | null;
  dailyLimitCents?: number | null;
  startDate?: string | null;

  minTransactionCents?: number | null;
  maxTransactionCents?: number | null;

  countriesAllow?: string[] | null;
  mccCodesAllow?: string[] | null;

  merchantCategories?: string[] | null;
  merchantCategoryRestriction?: CardGroupRestrictionType | null;

  merchantIds?: string[] | null;
  merchantNamesAllow?: string[] | null;
  merchantRestriction?: CardGroupRestrictionType | null;

  spendingConstraint?: CardGroupSpendingConstraintParam | null;

  closed?: boolean | null;
}

export interface CardGroupUpdateRequest {
  name?: string;

  timezone?: string | null;
  dailyLimitCents?: number | null;
  startDate?: string | null;

  minTransactionCents?: number | null;
  maxTransactionCents?: number | null;

  countriesAllow?: string[] | null;
  mccCodesAllow?: string[] | null;

  merchantCategories?: string[] | null;
  merchantCategoryRestriction?: CardGroupRestrictionType | null;

  merchantIds?: string[] | null;
  merchantNamesAllow?: string[] | null;
  merchantRestriction?: CardGroupRestrictionType | null;

  spendingConstraint?: CardGroupSpendingConstraintParam | null;

  closed?: boolean | null;
}

/**
 * Body FE gửi khi update spending-constraint cho card group (Gateway):
 * Gateway map sang SlashPatchCardGroupSpendingConstraintRequest / SlashPut... tương ứng.
 */
export type CardGroupSpendingConstraintRequestParam =
  CardGroupSpendingConstraintParam;

/**
 * DTO Gateway flatten cho utilization.
 * Nguồn dữ liệu từ SlashCardGroupUtilization hoặc DB cache.
 */
export interface CardGroupUtilization {
  groupId: number;
  slashId: string;

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

// ======================== CARD – DTO CHÍNH (match CardDTO từ DB) ========================

export interface Card {
  id: number;
  slashId: string;

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
  status?: string | null;

  isPhysical?: boolean | null;
  isSingleUse?: boolean | null;

  expiryMonth?: string | null;
  expiryYear?: string | null;

  dailyLimitCents?: number | null;
  minTransactionCents?: number | null;
  maxTransactionCents?: number | null;

  // các field extracted từ spendingConstraintJson + userDataJson
  countriesAllow?: string[] | null; // ISO2
  mccCodesAllow?: string[] | null; // MCC
  merchantIds?: string[] | null; // merchants[]
  merchantCategories?: string[] | null; // merchantCategories[]
  merchantNamesAllow?: string[] | null; // từ userData.merchantNamesAllow

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

export interface SlashCardDetail {
  id: string;
  accountId?: string | null;
  virtualAccountId?: string | null;
  last4?: string | null;
  name?: string | null;
  expiryMonth?: string | null;
  expiryYear?: string | null;
  status?: string | null;
  isPhysical?: boolean | null;
  isSingleUse?: boolean | null;
  pan?: string | null; // chỉ từ Vault, không lưu DB
  cvv?: string | null; // chỉ từ Vault, không lưu DB
  cardGroupId?: string | null;
  createdAt?: string | null; // ISO
  spendingConstraint?: CardSpendingConstraintParam | null;
  userData?: any;
  cardProductId?: string | null;
}

export interface ApiCreateCardParam {
  accountId: number; // dùng để BE lấy apiKey
  virtualAccountId: number;
  cardGroupId?: number | null;

  name: string;
  cardProductId?: string | null;

  // type trong Slash: "virtual" | "physical"
  type?: "virtual" | "physical" | string;

  spendingConstraint?: CardSpendingConstraintParam | null;
  userData?: Record<string, any> | null;
}

/**
 * FE gửi body này vào PATCH /api/cards/{id}
 * BE map sang CardUpdateRequest rồi gọi Slash update-card.
 */
export interface ApiUpdateCardParam {
  name?: string;
  cardGroupId?: number | null;

  // status: active / paused / inactive / closed
  status?: string | null;

  spendingConstraint?: CardSpendingConstraintParam | null;
  userData?: Record<string, any> | null;
}

export interface CardUtilization {
  cardId: number;
  slashId: string;
  limitAmountCents: number | null;
  availableBalanceCents: number | null;
  spendAmountCents: number | null;
  nextResetDate?: string | null; // ISO
}

export interface CardProduct {
  id: string;
  prefix?: string | null;
  status?: string | null; // "active", ...
}

export interface CardProductListResponse {
  items: CardProduct[];
  metadata: {
    nextCursor?: string | null;
    count?: number | null;
  };
}

export interface CardModifier {
  name: string;
  value: boolean | string | number | null;
}

export interface CardModifiersResponse {
  modifiers: CardModifier[];
}

// ======================== DTO META COUNTRY / MCC ========================

export interface CountryOptionDTO {
  id: number;
  code: string;
  name: string;
}

export interface MccCodeOptionDTO {
  id: number;
  code: string;
  name: string;
}

// ======================== HIDDEN ITEMS (VA & CARD GROUP) ========================

export type HiddenItemType = "VIRTUAL_ACCOUNT" | "CARD_GROUP";

export interface HiddenItem {
  id: number;
  itemType: HiddenItemType;
  itemId: number;
  createdAt: string; // ISO
}

/**
 * Body dùng cho PATCH:
 * - PATCH /api/hidden/virtual-accounts/{id}
 * - PATCH /api/hidden/card-groups/{id}
 */
export interface ApiUpdateVisibilityParam {
  hidden: boolean;
}

/**
 * Nếu sau này BE trả về list hidden cho user hiện tại (optional):
 * - virtualAccountIds: list VA id bị ẩn
 * - cardGroupIds: list CardGroup id bị ẩn
 */
export interface HiddenState {
  virtualAccountIds: number[];
  cardGroupIds: number[];
}
