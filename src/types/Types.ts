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

  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
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
  code: string;
  name: string;
  region?: string;
}
export interface MccCodeOption {
  id: number;
  code: string;
  name: string;
  description?: string;
}
export interface CardCountryRuleParam {
  countries?: string[] | null;
  restriction?: CardRestrictionMode | null;
}

export interface CardMerchantCategoryCodeRuleParam {
  merchantCategoryCodes?: string[] | null;
  restriction?: CardRestrictionMode | null;
}
export interface CardMerchantCategoryRuleParam {
  merchantCategories?: string[] | null;
  restriction?: CardRestrictionMode | null;
}
export interface CardMerchantRuleParam {
  merchants?: string[] | null;
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

export interface CardSpendingConstraintParam {
  countryRule?: CardCountryRuleParam | null;
  merchantCategoryCodeRule?: CardMerchantCategoryCodeRuleParam | null;
  merchantCategoryRule?: CardMerchantCategoryRuleParam | null;
  merchantRule?: CardMerchantRuleParam | null;
  spendingRule?: CardSpendingRuleParam | null;
  utilizationLimit?: CardUtilizationLimitParam | null;
  transactionSizeLimit?: CardTransactionSizeLimitParam | null;
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
  startDate?: string | null;
  closed: boolean;
  createdAt: string;
  updatedAt: string;
  spendingConstraint?: CardSpendingConstraintParam | null;
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

  /** timezone string, ví dụ "UTC", "Asia/Ho_Chi_Minh" */
  timezone?: string | null;

  /** preset reset limit: vd "daily", "weekly"... */
  preset?: string | null;
}

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

export interface CardGroupSpendingConstraintRequest {
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
  merchantCategories?: string[] | null;
  merchantCategoryRestriction?: CardGroupRestrictionType | null;
  merchantCategoryCodes?: string[] | null;
  merchantCategoryCodeRestriction?: CardGroupRestrictionType | null;
}

export type CardGroupSpendingConstraintParam =
  CardGroupSpendingConstraintRequest;

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

export interface Merchant {
  id: string;
  name?: string | null;
  url?: string | null;
}

export interface MerchantSearchResponse {
  content: Merchant[];
  items: Merchant[];
  metadata: {
    nextCursor?: string | null;
    count?: number | null;
  };
}

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
  pan?: string | null;
  cvv?: string | null;
  cardGroupId?: string | null;
  createdAt?: string | null; // ISO
  spendingConstraint?: CardSpendingConstraintParam | null;
  userData?: any;
  cardProductId?: string | null;
}

export interface ApiCreateCardParam {
  accountId: number;
  virtualAccountId: number;
  cardGroupId?: number | null;
  name: string;
  cardProductId?: string | null;
  type?: "virtual" | "physical" | string;
  spendingConstraint?: CardSpendingConstraintParam | null;
  userData?: Record<string, any> | null;
}
export interface ApiUpdateCardParam {
  name?: string;
  cardGroupId?: number | null;
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
  status?: string | null;
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

export interface TransactionLocation {
  city?: string | null;
  state?: string | null;
  country?: string | null;
  zip?: string | null;
}

export interface TransactionMerchantData {
  description?: string | null;
  categoryCode?: string | null;
  location?: TransactionLocation | null;
}

export interface TransactionOriginalCurrency {
  code?: string | null;
  amountCents?: number | null;
  conversionRate?: number | null;
}

export interface TransactionWireInfo {
  typeCode?: string | null;
  subtypeCode?: string | null;
  omad?: string | null;
  imad?: string | null;
  senderReference?: string | null;
  businessFunctionCode?: string | null;
  counterpartyBank?: string | null;
}

export interface TransactionAchInfo {
  receiverId?: string | null;
  companyId?: string | null;
  companyDiscretionaryData?: string | null;
  traceNumber?: string | null;
  entryClassCode?: string | null;
  paymentRelatedInfo?: string | null;
  counterpartyBank?: string | null;
  companyEntryDescription?: string | null;
}

export interface TransactionRtpInfo {
  counterpartyBank?: string | null;
  endToEndId?: string | null;
  routingNumber?: string | null;
  originatorName?: string | null;
  description?: string | null;
}

export interface TransactionRelatedTransaction {
  id?: string | null;
  amount?: number | null;
}

export interface TransactionFeeInfo {
  relatedTransaction?: TransactionRelatedTransaction | null;
}

export interface TransactionCryptoInfo {
  txHash?: string | null;
  senderAddress?: string | null;
}

export interface Transaction {
  id: string;
  date?: string | null;
  description?: string | null;
  amountCents?: number | null;
  status?: "pending" | "posted" | "failed" | string;
  detailedStatus?:
    | "pending"
    | "canceled"
    | "failed"
    | "settled"
    | "declined"
    | "refund"
    | "reversed"
    | "returned"
    | "dispute"
    | string;
  accountId?: string | null;
  accountSubtype?: string | null;
  memo?: string | null;
  merchantDescription?: string | null;
  merchantData?: TransactionMerchantData | null;
  virtualAccountId?: string | null;
  cardId?: string | null;
  originalCurrency?: TransactionOriginalCurrency | null;
  orderId?: string | null;
  referenceNumber?: string | null;
  authorizedAt?: string | null;
  declineReason?: string | null;
  approvalReason?: string | null;
  providerAuthorizationId?: string | null;
  wireInfo?: TransactionWireInfo | null;
  achInfo?: TransactionAchInfo | null;
  rtpInfo?: TransactionRtpInfo | null;
  feeInfo?: TransactionFeeInfo | null;
  cryptoInfo?: TransactionCryptoInfo | null;
}

export interface TransactionListResponse {
  items: Transaction[];
  nextCursor?: string | null;
  count?: number | null;
}

// Query params FE -> BE (/api/transactions)
export interface TransactionListParams {
  accountId: number;
  cursor?: string;
  virtualAccountId?: string;   // Slash VA id
  fromDate?: string;
  toDate?: string;
  fromAuthorizedAt?: string;
  toAuthorizedAt?: string;
  status?: string;
  detailedStatus?: string;
  cardId?: string;
  providerAuthorizationId?: string;
}
