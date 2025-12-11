import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContextProvider";
import {
  Account,
  ApiCreateCardParam,
  ApiUpdateCardParam,
  Card,
  CardCountryOption,
  CardGroup,
  CardPage,
  MccCodeOption,
  Merchant,
  MerchantCategory,
  MerchantSearchResponse,
  VirtualAccount,
  CardSpendingConstraintParam,
} from "../../types/Types";
import { cardApi } from "../../api/api.card";
import { cardMetaApi } from "../../api/api.cardMeta";
import { merchantApi } from "../../api/api.merchant";
import { cardGroupApi } from "../../api/api.cardgroup";
import { virtualAccountApi } from "../../api/api.virtualaccout";

interface Props {
  pageSize?: number;
}
type CardDetailState = Card & {
  pan?: string | null;
  cvv?: string | null;
  expiryMonth?: string | null;
  expiryYear?: string | null;
  isPhysical?: boolean | null;
  isSingleUse?: boolean | null;
};

export const CardManager: React.FC<Props> = ({ pageSize = 20 }) => {
  const { user, loading: authLoading } = useAuth();
  const accounts: Account[] = useMemo(() => user?.accounts ?? [], [user]);
  const [syncing, setSyncing] = useState(false);

  const activeAccountId: number | null = useMemo(() => {
    if (!accounts || accounts.length === 0) return null;
    if ((user as any)?.activeAccount && (user as any).activeAccount.id) {
      return (user as any).activeAccount.id;
    }
    return accounts[0].id;
  }, [accounts, user]);

  const activeAccount = useMemo(
    () => accounts.find((a) => a.id === activeAccountId) || null,
    [accounts, activeAccountId]
  );

  const [vaOptions, setVaOptions] = useState<VirtualAccount[]>([]);
  const [vaLoading, setVaLoading] = useState(false);

  const [cardGroups, setCardGroups] = useState<CardGroup[]>([]);
  const [cardGroupLoading, setCardGroupLoading] = useState(false);

  const [metaLoading, setMetaLoading] = useState(false);
  const [countries, setCountries] = useState<CardCountryOption[]>([]);
  const [mccCodes, setMccCodes] = useState<MccCodeOption[]>([]);
  const [merchantCategories, setMerchantCategories] = useState<
    MerchantCategory[]
  >([]);

  const countryLabelMap = useMemo(() => {
    const m = new Map<string, string>();
    countries.forEach((c) => {
      const label =
        c.region && c.region.trim().length > 0
          ? `${c.code} – ${c.name} (${c.region})`
          : `${c.code} – ${c.name}`;
      m.set(c.code, label);
    });
    return m;
  }, [countries]);

  const mccLabelMap = useMemo(() => {
    const m = new Map<string, string>();
    mccCodes.forEach((mc) => {
      m.set(mc.code, `${mc.code} – ${mc.name}`);
    });
    return m;
  }, [mccCodes]);

  const merchantCategoryLabelMap = useMemo(() => {
    const m = new Map<string, string>();
    merchantCategories.forEach((cat) => {
      if ((cat as any).slashId) {
        m.set((cat as any).slashId, cat.name);
      }
    });
    return m;
  }, [merchantCategories]);

  const [selectedVaId, setSelectedVaId] = useState<number | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    setSelectedVaId(null);
    setSelectedGroupId(null);
  }, [activeAccountId]);

  useEffect(() => {
    const loadVas = async () => {
      if (!activeAccountId) {
        setVaOptions([]);
        return;
      }
      try {
        setVaLoading(true);
        const res = await virtualAccountApi.getByAccountPaged(
          activeAccountId,
          0,
          500,
          undefined
        );
        setVaOptions(res.content || []);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load Virtual Accounts");
      } finally {
        setVaLoading(false);
      }
    };
    loadVas();
  }, [activeAccountId]);

  useEffect(() => {
    const loadGroups = async () => {
      if (!activeAccountId) {
        setCardGroups([]);
        return;
      }
      try {
        setCardGroupLoading(true);
        const res = await cardGroupApi.getByAccountPaged(
          activeAccountId,
          0,
          500,
          selectedVaId ?? undefined,
          undefined
        );
        setCardGroups(res.content || []);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load card groups");
      } finally {
        setCardGroupLoading(false);
      }
    };
    loadGroups();
  }, [activeAccountId, selectedVaId]);

  useEffect(() => {
    const loadMeta = async () => {
      try {
        setMetaLoading(true);
        const [c, m, catRes] = await Promise.all([
          cardMetaApi.getCountries(),
          cardMetaApi.getMccCodes(),
          merchantApi.getAllCategories(),
        ]);

        setCountries(c.sort((a, b) => a.code.localeCompare(b.code, "en-US")));
        setMccCodes(m.sort((a, b) => a.code.localeCompare(b.code, "en-US")));
        setMerchantCategories(catRes);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load metadata");
      } finally {
        setMetaLoading(false);
      }
    };
    loadMeta();
  }, []);

  const [cardPage, setCardPage] = useState<CardPage | null>(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [page, setPage] = useState(0);

  const loadCards = async (pageIndex = 0) => {
    if (!activeAccountId) return;
    try {
      setCardLoading(true);
      const data = await cardApi.getPagedCards({
        accountId: activeAccountId,
        virtualAccountId: selectedVaId ?? undefined,
        cardGroupId: selectedGroupId ?? undefined,
        page: pageIndex,
        size: pageSize,
        search: search || undefined,
        status: statusFilter || undefined,
      });

      setCardPage({
        ...data,
        content: data.content || [],
      });
      setPage(data.page);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load cards");
    } finally {
      setCardLoading(false);
    }
  };

  useEffect(() => {
    if (!activeAccountId) return;
    loadCards(0);
  }, [
    activeAccountId,
    selectedVaId,
    selectedGroupId,
    search,
    statusFilter,
    pageSize,
  ]);

  const handleChangePage = (newPage: number) => {
    if (!cardPage) return;
    if (newPage < 0 || newPage >= cardPage.totalPages) return;
    loadCards(newPage);
  };

  const handleSync = async () => {
    if (!activeAccountId) return;
    setSyncing(true);

    try {
      const res = await cardApi.syncFromSlash(activeAccountId);
      toast.success(`Synced ${res.count} cards from Slash`);
      await loadCards(page);
    } catch (err: any) {
      console.error("sync error:", err?.response?.data || err);
      toast.error(err?.response?.data?.message || "Sync from Slash failed");
      
    } finally {
      setSyncing(false);
    }
  };

  const [merchantSearchResult, setMerchantSearchResult] = useState<Merchant[]>(
    []
  );
  const [merchantSearchQuery, setMerchantSearchQuery] = useState("");
  const [merchantSearchCursor, setMerchantSearchCursor] = useState<
    string | undefined
  >();
  const [merchantSearching, setMerchantSearching] = useState(false);

  const performMerchantSearch = async (cursor?: string) => {
    if (!activeAccountId) {
      toast.error("No account selected");
      return;
    }
    const q = merchantSearchQuery.trim();
    if (!q && !cursor) return;

    try {
      setMerchantSearching(true);
      const res: MerchantSearchResponse = await merchantApi.searchMerchants(
        activeAccountId,
        q,
        cursor
      );
      if (cursor) {
        setMerchantSearchResult((prev) => [...prev, ...res.items]);
      } else {
        setMerchantSearchResult(res.items);
      }
      setMerchantSearchCursor(res.metadata?.nextCursor || undefined);
    } catch (err) {
      console.error(err);
      toast.error("Merchant search failed");
    } finally {
      setMerchantSearching(false);
    }
  };

  useEffect(() => {
    const q = merchantSearchQuery.trim();
    if (q.length < 3) {
      setMerchantSearchResult([]);
      setMerchantSearchCursor(undefined);
      return;
    }
    const timer = setTimeout(() => {
      performMerchantSearch(undefined);
    }, 400);
    return () => clearTimeout(timer);
  }, [merchantSearchQuery, activeAccountId]);

  const loadMoreMerchants = () => {
    if (!merchantSearchCursor) return;
    performMerchantSearch(merchantSearchCursor);
  };

  const collectMerchantNames = (ids: string[]): string[] => {
    const map = new Map<string, string>();
    merchantSearchResult.forEach((m) => {
      if (m.id) map.set(m.id, m.name || m.id);
    });
    return ids.map((id) => map.get(id) || id);
  };

  const toggleStringInArray = (list: string[], value: string): string[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const [showCreate, setShowCreate] = useState(false);
  const [createVaId, setCreateVaId] = useState<number | null>(null);
  const [createGroupId, setCreateGroupId] = useState<number | null>(null);
  const [createName, setCreateName] = useState("");
  const [createDailyLimit, setCreateDailyLimit] = useState<number | null>(null);
  const [createMinTx, setCreateMinTx] = useState<number | null>(null);
  const [createMaxTx, setCreateMaxTx] = useState<number | null>(null);
  const [createCountriesAllow, setCreateCountriesAllow] = useState<string[]>(
    []
  );
  const [createMccCodesAllow, setCreateMccCodesAllow] = useState<string[]>([]);
  const [createMerchantIds, setCreateMerchantIds] = useState<string[]>([]);
  const [createMerchantCategories, setCreateMerchantCategories] = useState<
    string[]
  >([]);
  const [createMerchantNames, setCreateMerchantNames] = useState<string[]>([]);

  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [editDailyLimit, setEditDailyLimit] = useState<number | null>(null);
  const [editMinTx, setEditMinTx] = useState<number | null>(null);
  const [editMaxTx, setEditMaxTx] = useState<number | null>(null);
  const [editCountriesAllow, setEditCountriesAllow] = useState<string[]>([]);
  const [editMccCodesAllow, setEditMccCodesAllow] = useState<string[]>([]);
  const [editMerchantIds, setEditMerchantIds] = useState<string[]>([]);
  const [editMerchantCategories, setEditMerchantCategories] = useState<
    string[]
  >([]);
  const [editMerchantNames, setEditMerchantNames] = useState<string[]>([]);
  const [editStatus, setEditStatus] = useState<string>("");

  const [detailCard, setDetailCard] = useState<CardDetailState | null>(null);
  const [showCvv, setShowCvv] = useState(false);
  const [cvvCheckMode, setCvvCheckMode] = useState(false);
  const [cvvCheckFirst3, setCvvCheckFirst3] = useState("");
  const [cvvCheckLast3, setCvvCheckLast3] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);

  const openCreateModal = () => {
    if (!activeAccountId) {
      toast.error("No active account");
      return;
    }
    if (vaOptions.length === 0) {
      toast.error("This account has no virtual accounts");
      return;
    }

    const defaultVaId =
      selectedVaId && vaOptions.some((v) => v.id === selectedVaId)
        ? selectedVaId
        : vaOptions[0].id;

    const groupsForVa =
      cardGroups.filter((g) => g.virtualAccountId === defaultVaId) ||
      cardGroups;

    const defaultGroupId =
      selectedGroupId && groupsForVa.some((g) => g.id === selectedGroupId)
        ? selectedGroupId
        : groupsForVa.length > 0
        ? groupsForVa[0].id
        : null;

    setCreateVaId(defaultVaId);
    setCreateGroupId(defaultGroupId);
    setCreateName("");
    setCreateDailyLimit(null);
    setCreateMinTx(null);
    setCreateMaxTx(null);
    setCreateCountriesAllow([]);
    setCreateMccCodesAllow([]);
    setCreateMerchantIds([]);
    setCreateMerchantCategories([]);
    setCreateMerchantNames([]);
    setMerchantSearchQuery("");
    setMerchantSearchResult([]);
    setMerchantSearchCursor(undefined);

    setShowCreate(true);
  };

  const buildConstraintPayload = (
    dailyLimitUsd: number | null,
    minTxUsd: number | null,
    maxTxUsd: number | null,
    countriesAllow: string[],
    mccCodesAllow: string[],
    merchantIds: string[],
    merchantCategorySlashIds: string[]
  ): CardSpendingConstraintParam | null => {
    const constraint: CardSpendingConstraintParam = {
      merchantCategoryCodeRule: {
        merchantCategoryCodes: [],
        restriction: undefined
      },
      spendingRule: undefined,
      merchantRule: {
        merchants: [],
        restriction: undefined
      },
      merchantCategoryRule: {
        merchantCategories: [],
        restriction: undefined
      },
      countryRule: {
        countries: [],
        restriction: undefined
      }
    };
    let hasAny = false;
    
    const isoCountries = (countriesAllow || [])
      .map((c) => c.trim().toUpperCase())
      .filter((c) => /^[A-Z]{2}$/.test(c));

    if (isoCountries.length > 0) {
      constraint.countryRule = {
        countries: isoCountries,
        restriction: "allowlist",
      };
      hasAny = true;
    }

    if (mccCodesAllow && mccCodesAllow.length > 0) {
      constraint.merchantCategoryCodeRule = {
        merchantCategoryCodes: mccCodesAllow,
        restriction: "allowlist",
      };
      hasAny = true;
    }

    if (merchantIds && merchantIds.length > 0) {
      constraint.merchantRule = {
        merchants: merchantIds,
        restriction: "allowlist",
      };
      hasAny = true;
    }

    if (merchantCategorySlashIds && merchantCategorySlashIds.length > 0) {
      constraint.merchantCategoryRule = {
        merchantCategories: merchantCategorySlashIds,
        restriction: "allowlist",
      };
      hasAny = true;
    }

    const hasUtilization =
      dailyLimitUsd != null &&
      !Number.isNaN(dailyLimitUsd) &&
      dailyLimitUsd > 0;
    const hasTxMin =
      minTxUsd != null && !Number.isNaN(minTxUsd) && minTxUsd > 0;
    const hasTxMax =
      maxTxUsd != null && !Number.isNaN(maxTxUsd) && maxTxUsd > 0;

    if (hasUtilization || hasTxMin || hasTxMax) {
      const spendingRule: CardSpendingConstraintParam["spendingRule"] = {};

      if (hasUtilization) {
        const cents = Math.round(dailyLimitUsd! * 100);
        spendingRule.utilizationLimit = {
          timezone: "Asia/Ho_Chi_Minh",
          limitAmount: { amountCents: cents },
          preset: "daily",
          startDate: new Date().toISOString().slice(0, 10),
        };
      }

      if (hasTxMin || hasTxMax) {
        spendingRule.transactionSizeLimit = {
          minimum: hasTxMin
            ? { amountCents: Math.round(minTxUsd! * 100) }
            : undefined,
          maximum: hasTxMax
            ? { amountCents: Math.round(maxTxUsd! * 100) }
            : undefined,
        };
      }

      constraint.spendingRule = spendingRule;
      hasAny = true;
    }

    return hasAny ? constraint : null;
  };

  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAccountId || !createVaId) {
      toast.error("Missing account or virtual account");
      return;
    }

    if (
      createMinTx != null &&
      createMaxTx != null &&
      createMinTx >= createMaxTx
    ) {
      toast.error("Minimum transaction must be less than maximum");
      return;
    }

    const merchantNames =
      createMerchantNames.length > 0
        ? createMerchantNames
        : collectMerchantNames(createMerchantIds);

    const spendingConstraint = buildConstraintPayload(
      createDailyLimit,
      createMinTx,
      createMaxTx,
      createCountriesAllow,
      createMccCodesAllow,
      createMerchantIds,
      createMerchantCategories
    );

    const payload: ApiCreateCardParam = {
      accountId: activeAccountId,
      virtualAccountId: createVaId,
      cardGroupId: createGroupId ?? undefined,
      name: createName,
      spendingConstraint: spendingConstraint || undefined,
      userData:
        merchantNames.length > 0
          ? { merchantNamesAllow: merchantNames }
          : undefined,
    };

    try {
      await cardApi.create(payload);
      toast.success("Card created successfully");
      setShowCreate(false);
      await loadCards(page);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to create card");
    }
  };
  const openEditModal = (card: Card) => {
    setEditingCard(card);

    setEditDailyLimit(
      (card as any).dailyLimitCents != null
        ? (card as any).dailyLimitCents / 100
        : null
    );
    setEditMinTx(
      (card as any).minTransactionCents != null
        ? (card as any).minTransactionCents / 100
        : null
    );
    setEditMaxTx(
      (card as any).maxTransactionCents != null
        ? (card as any).maxTransactionCents / 100
        : null
    );
    setEditCountriesAllow(
      ((card as any).countriesAllow ?? []).map((c: any) => String(c))
    );
    setEditMccCodesAllow(
      ((card as any).mccCodesAllow ?? []).map((m: any) => String(m))
    );
    setEditMerchantIds(
      ((card as any).merchantIds ?? []).map((id: any) => String(id))
    );
    setEditMerchantCategories(
      ((card as any).merchantCategories ?? []).map((id: any) => String(id))
    );
    setEditMerchantNames((card as any).merchantNamesAllow ?? []);
    setEditStatus(card.status ?? "");

    setMerchantSearchQuery("");
    setMerchantSearchResult([]);
    setMerchantSearchCursor(undefined);
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCard) return;

    if (editMinTx != null && editMaxTx != null && editMinTx >= editMaxTx) {
      toast.error("Minimum transaction must be less than maximum");
      return;
    }

    const merchantNames =
      editMerchantNames.length > 0
        ? editMerchantNames
        : collectMerchantNames(editMerchantIds);

    const spendingConstraint = buildConstraintPayload(
      editDailyLimit,
      editMinTx,
      editMaxTx,
      editCountriesAllow,
      editMccCodesAllow,
      editMerchantIds,
      editMerchantCategories
    );

    const payload: ApiUpdateCardParam & { status?: string } = {
      name: editingCard.name,
      spendingConstraint: spendingConstraint || undefined,
      userData:
        merchantNames.length > 0
          ? { merchantNamesAllow: merchantNames }
          : undefined,
    };

    if (editStatus && editStatus.trim()) {
      payload.status = editStatus;
    }

    try {
      await cardApi.update(editingCard.id, payload);
      toast.success("Card updated successfully");
      setEditingCard(null);
      await loadCards(page);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to update card");
    }
  };

  const formatAmount = (cents?: number | null): string => {
  if (cents == null) return "-";

  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

  const renderCodeList = (
    codes: string[] | undefined | null,
    map: Map<string, string>
  ): string => {
    if (!codes || codes.length === 0) return "__";
    return codes.map((c) => map.get(c) || c).join(", ");
  };

  const formatPanForDisplay = (
    pan?: string | null,
    fallbackLast4?: string | null
  ): string => {
    if (pan && pan.length >= 12) {
      return pan
        .replace(/\s+/g, "")
        .replace(/(.{4})/g, "$1 ")
        .trim();
    }
    if (fallbackLast4) {
      const masked = `************${fallbackLast4}`;
      return masked.replace(/(.{4})/g, "$1 ").trim();
    }
    return "**** **** **** ****";
  };

  const handleConfirmShowCvv = () => {
    if (!detailCard || !detailCard.pan) {
      toast.error("Card number is not available");
      return;
    }

    const digits = detailCard.pan.replace(/\D/g, "");
    if (digits.length < 6) {
      toast.error("Card number is invalid");
      return;
    }

    const first3 = digits.slice(0, 3);
    const last3 = digits.slice(-3);

    if (cvvCheckFirst3 === first3 && cvvCheckLast3 === last3) {
      setShowCvv(true);
      setCvvCheckMode(false);
      setCvvCheckFirst3("");
      setCvvCheckLast3("");
    } else {
      toast.error("Card digits do not match");
    }
  };

  const handleOpenDetail = async (card: Card) => {
    setShowCvv(false);
    setCvvCheckMode(false);
    setCvvCheckFirst3("");
    setCvvCheckLast3("");

    setDetailCard(card as CardDetailState);
    setDetailLoading(true);

    try {
      const detail = await cardApi.getSlashDetailWithSensitive(
        card.id,
        true,
        true
      );

      const d: any = detail;

      const updated: CardDetailState = {
        ...(card as any),
        pan: d.pan ?? d.card_number ?? (card as any).pan ?? null,
        cvv: d.cvv ?? (card as any).cvv ?? null,
        last4: d.last4 ?? (card as any).last4 ?? null,
        expiryMonth:
          d.expiryMonth ??
          d.expiry_month ??
          d.exp_month ??
          (card as any).expiryMonth ??
          null,
        expiryYear:
          d.expiryYear ??
          d.expiry_year ??
          d.exp_year ??
          (card as any).expiryYear ??
          null,
        isPhysical:
          d.isPhysical ??
          d.physical ??
          (card as any).isPhysical ??
          (card as any).physical ??
          null,
        isSingleUse:
          d.isSingleUse ??
          d.singleUse ??
          (card as any).isSingleUse ??
          (card as any).singleUse ??
          null,
        status: d.status ?? card.status ?? null,
        createdAt: d.createdAt ?? card.createdAt ?? null,
      };

      setDetailCard(updated);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load card details");
    } finally {
      setDetailLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        Loading authentication...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white shadow-sm border border-slate-200/70 px-4 py-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-[0.16em] text-indigo-500">
              Cards management
            </div>
            <div className="text-xl font-semibold text-slate-900">
              {activeAccount ? activeAccount.name : "No active account"}
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-slate-700">
              <span className="inline-flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                Virtual accounts: {vaLoading ? "..." : vaOptions.length || "0"}
              </span>
              <span className="inline-flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                Card groups:{" "}
                {cardGroupLoading ? "..." : cardGroups.length || "0"}
              </span>
            </div>
          </div>  

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing || !activeAccountId }
              className="rounded-full bg-indigo-600 text-white px-5 py-1.5 text-sm font-medium shadow-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {syncing ? "Refreshing..." : "🔄 Refresh "}
            </button>

            <button
              className="rounded-full bg-slate-900 text-white px-5 py-1.5 text-sm font-medium shadow-md hover:bg-slate-800 disabled:opacity-50 transition-colors"
              onClick={openCreateModal}
              disabled={vaOptions.length === 0}
            >
              + Create card
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-700 text-xs uppercase tracking-wide">
                Group
              </span>
              <select
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                value={selectedGroupId ?? ""}
                onChange={(e) =>
                  setSelectedGroupId(
                    e.target.value ? Number(e.target.value) : null
                  )
                }
              >
                <option value="">All groups</option>
                {cardGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-700 text-xs uppercase tracking-wide">
                Virtual account
              </span>
              <select
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                value={selectedVaId ?? ""}
                onChange={(e) =>
                  setSelectedVaId(
                    e.target.value ? Number(e.target.value) : null
                  )
                }
              >
                <option value="">All virtual accounts</option>
                {vaOptions.map((va) => (
                  <option key={va.id} value={va.id}>
                    {va.name || va.id}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-700 text-xs uppercase tracking-wide">
                Status
              </span>
              <select
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
            </div>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                className="rounded-xl w-[290px] p-5 border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="Search by name or last 4..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* CARD TABLE */}
      <div className="border border-slate-200/70 rounded-2xl overflow-hidden bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/90 text-slate-600 border-b border-slate-200/80">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide">
                Card
              </th>
              <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide">
                Group
              </th>
              <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide">
                Virtual account
              </th>
              <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide">
                Daily limit
              </th>
              <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide">
                Status
              </th>
              <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide">
                Created
              </th>
              <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide">
                Expiry
              </th>
              <th className="px-4 py-3 text-right font-semibold text-xs uppercase tracking-wide">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {cardLoading || !cardPage ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-slate-500 text-sm"
                >
                  {cardLoading ? (
                    <div className="flex flex-col items-center gap-2">
                      <span className="inline-block h-5 w-5 border-[3px] border-slate-400 border-t-transparent rounded-full animate-spin" />
                      <span>Loading cards...</span>
                    </div>
                  ) : (
                    "No data"
                  )}
                </td>
              </tr>
            ) : !cardPage.content || cardPage.content.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-slate-500 text-sm"
                >
                  No cards found
                </td>
              </tr>
            ) : (
              cardPage.content.map((card, idx) => (
                <tr
                  key={card.id}
                  className={`border-t border-slate-100/80 transition hover:bg-indigo-50/40 ${
                    idx % 2 === 1 ? "bg-slate-50/40" : "bg-white"
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-indigo-600 font-medium hover:text-indigo-700 hover:underline disabled:opacity-60 transition"
                        onClick={() => handleOpenDetail(card)}
                        disabled={detailLoading && detailCard?.id === card.id}
                      >
                        <span className="truncate max-w-[220px]">
                          {card.name}
                        </span>
                        {detailLoading && detailCard?.id === card.id && (
                          <span className="inline-block h-3 w-3 border-[2px] border-indigo-400 border-t-transparent rounded-full animate-spin" />
                        )}
                      </button>
                      {(card as any).last4 && (
                        <span className="inline-flex items-center text-[11px] bg-emerald-50 text-emerald-700 rounded-full px-2 py-[1px] w-fit">
                          **** {(card as any).last4}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {(card as any).cardGroupName || "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {card.virtualAccountName || card.virtualAccountId || "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <span
                      className={`inline-flex items-center px-2 py-[2px] rounded-full text-[11px] font-medium ${
                        (card as any).dailyLimitCents != null &&
                        (card as any).dailyLimitCents > 0
                          ? "bg-amber-50 text-amber-700"
                          : "bg-slate-50 text-slate-600"
                      }`}
                    >
                      {(card as any).dailyLimitCents != null &&
                      (card as any).dailyLimitCents > 0
                        ? "Limited"
                        : "No limit"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-[2px] rounded-full text-[11px] font-medium ${
                        card.status === "active"
                          ? "bg-emerald-50 text-emerald-700"
                          : card.status === "closed"
                          ? "bg-rose-50 text-rose-700"
                          : "bg-slate-50 text-slate-600"
                      }`}
                    >
                      {card.status || "Unknown"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700 text-sm">
                    {card.createdAt
                      ? new Date(card.createdAt).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-700 text-sm">
                    {(card as any).expiryMonth && (card as any).expiryYear
                      ? `${(card as any).expiryMonth}/${
                          (card as any).expiryYear
                        }`
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      className="inline-flex items-center gap-1 border border-slate-200 rounded-full px-3 py-1 text-[11px] font-medium bg-white hover:bg-slate-50 hover:border-slate-300 transition"
                      onClick={() => openEditModal(card)}
                    >
                      ✏️ Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {cardPage && cardPage.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-600 mt-1">
          <span className="text-xs md:text-sm">
            Total cards:{" "}
            <span className="font-semibold">{cardPage.totalElements}</span>{" "}
            &mdash; Page{" "}
            <span className="font-semibold">{cardPage.page + 1}</span> /{" "}
            {cardPage.totalPages}
          </span>
          <div className="space-x-2">
            <button
              className="border px-3 py-1 rounded-full bg-white hover:bg-slate-50 disabled:opacity-40 text-xs md:text-sm transition"
              disabled={cardPage.page === 0}
              onClick={() => handleChangePage(cardPage.page - 1)}
            >
              Prev
            </button>
            <button
              className="border px-3 py-1 rounded-full bg-white hover:bg-slate-50 disabled:opacity-40 text-xs md:text-sm transition"
              disabled={cardPage.page + 1 >= cardPage.totalPages}
              onClick={() => handleChangePage(cardPage.page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full p-6 max-h-[90vh] overflow-y-auto space-y-4 border border-slate-200">
            <div className="flex justify-between items-center mb-2">
              <div>
                <h2 className="font-semibold text-lg text-slate-900">
                  Create new card
                </h2>
                <p className="text-xs text-slate-500">
                  Configure limits and rules for the new card.
                </p>
              </div>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600 text-xl"
                onClick={() => setShowCreate(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitCreate} className="space-y-5">
              {/* VA + Group */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/70">
                  <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wide">
                    Virtual account
                  </label>
                  <select
                    className="border border-slate-200 rounded-lg px-3 py-2 w-full bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                    value={createVaId ?? ""}
                    onChange={(e) =>
                      setCreateVaId(
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                    required
                  >
                    <option value="">Select virtual account...</option>
                    {vaOptions.map((va) => (
                      <option key={va.id} value={va.id}>
                        {va.name || va.id}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/70">
                  <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wide">
                    Card group (optional)
                  </label>
                  <select
                    className="border border-slate-200 rounded-lg px-3 py-2 w-full bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                    value={createGroupId ?? ""}
                    onChange={(e) =>
                      setCreateGroupId(
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                  >
                    <option value="">No group</option>
                    {cardGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-2 bg-slate-50/80 rounded-xl p-3 border border-slate-200/70">
                  <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wide">
                    Card name
                  </label>
                  <input
                    className="border border-slate-200 rounded-lg px-3 py-2 w-full bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-3">
                  <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/70">
                    <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wide">
                      Daily limit (USD)
                    </label>
                    <input
                      type="number"
                      min={0}
                      className="border border-slate-200 rounded-lg px-3 py-2 w-full bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                      placeholder="Empty = no limit"
                      value={createDailyLimit ?? ""}
                      onChange={(e) =>
                        setCreateDailyLimit(
                          e.target.value === "" ? null : Number(e.target.value)
                        )
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-3">
                  <div className="font-semibold mb-1 text-slate-700 text-xs uppercase tracking-wide">
                    Countries allow
                  </div>
                  <div className="border border-slate-200 rounded-lg p-2 max-h-56 overflow-y-auto space-y-1 bg-white/80">
                    {metaLoading ? (
                      <div className="text-xs text-slate-500">Loading...</div>
                    ) : (
                      countries.map((c) => (
                        <label
                          key={c.code}
                          className="flex items-center gap-2 text-slate-700"
                        >
                          <input
                            type="checkbox"
                            className="rounded border-slate-300"
                            checked={createCountriesAllow.includes(c.code)}
                            onChange={() =>
                              setCreateCountriesAllow((prev) =>
                                toggleStringInArray(prev, c.code)
                              )
                            }
                          />
                          <span className="text-xs">
                            {c.code} – {c.name}
                            {c.region ? ` (${c.region})` : ""}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-3">
                  <div className="font-semibold mb-1 text-slate-700 text-xs uppercase tracking-wide">
                    MCC codes allow
                  </div>
                  <div className="border border-slate-200 rounded-lg p-2 max-h-56 overflow-y-auto space-y-1 bg-white/80">
                    {metaLoading ? (
                      <div className="text-xs text-slate-500">Loading...</div>
                    ) : (
                      mccCodes.map((m) => (
                        <label
                          key={m.code}
                          className="flex items-center gap-2 text-slate-700"
                        >
                          <input
                            type="checkbox"
                            className="rounded border-slate-300"
                            checked={createMccCodesAllow.includes(m.code)}
                            onChange={() =>
                              setCreateMccCodesAllow((prev) =>
                                toggleStringInArray(prev, m.code)
                              )
                            }
                          />
                          <span className="text-xs">
                            {m.code} – {m.name}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-3">
                  <div className="font-semibold mb-1 text-slate-700 text-xs uppercase tracking-wide">
                    Merchant categories allow
                  </div>
                  <div className="border border-slate-200 rounded-lg p-2 max-h-56 overflow-y-auto space-y-1 bg-white/80">
                    {merchantCategories.map((cat) => (
                      <label
                        key={cat.id}
                        className="flex items-center gap-2 text-slate-700"
                      >
                        <input
                          type="checkbox"
                          className="rounded border-slate-300"
                          checked={createMerchantCategories.includes(
                            (cat as any).slashId
                          )}
                          onChange={() =>
                            setCreateMerchantCategories((prev) =>
                              toggleStringInArray(prev, (cat as any).slashId)
                            )
                          }
                        />
                        <span className="text-xs">{cat.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm rounded-xl border border-slate-200/70 bg-slate-50/60 p-3">
                <div className="font-semibold text-slate-700 text-xs uppercase tracking-wide">
                  Merchants allow
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    className="border border-slate-200 rounded-lg px-3 py-2 flex-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="Type at least 3 characters to search merchant..."
                    value={merchantSearchQuery}
                    onChange={(e) => setMerchantSearchQuery(e.target.value)}
                  />
                  {merchantSearchCursor && (
                    <button
                      type="button"
                      className="border border-slate-200 rounded-lg px-3 py-1 text-sm bg-white hover:bg-slate-50"
                      onClick={loadMoreMerchants}
                    >
                      Load more
                    </button>
                  )}
                </div>

                {createMerchantIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {createMerchantIds.map((id, index) => {
                      const label =
                        createMerchantNames[index] ||
                        merchantSearchResult.find((m) => m.id === id)?.name ||
                        id;
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full text-xs"
                        >
                          {label}
                          <button
                            type="button"
                            className="ml-1 text-[10px]"
                            onClick={() => {
                              setCreateMerchantIds((prev) =>
                                prev.filter((x) => x !== id)
                              );
                              setCreateMerchantNames((prev) =>
                                prev.filter((_, i) => i !== index)
                              );
                            }}
                          >
                            ✕
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                <div className="border border-slate-200 rounded-lg p-2 max-h-56 overflow-y-auto space-y-1 mt-1 bg-white/80">
                  {merchantSearching && (
                    <div className="text-xs text-slate-500">Searching...</div>
                  )}
                  {!merchantSearching && merchantSearchResult.length === 0 && (
                    <div className="text-xs text-slate-500">
                      Type at least 3 characters to search.
                    </div>
                  )}
                  {merchantSearchResult.map((m) => (
                    <label
                      key={m.id}
                      className="flex items-center gap-2 text-slate-700"
                    >
                      <input
                        type="checkbox"
                        className="rounded border-slate-300"
                        checked={createMerchantIds.includes(m.id)}
                        onChange={() => {
                          setCreateMerchantIds((prev) =>
                            toggleStringInArray(prev, m.id)
                          );
                          const name = m.name || m.id;
                          setCreateMerchantNames((prev) => {
                            const existsIndex = prev.indexOf(name);
                            const currentlySelected =
                              createMerchantIds.includes(m.id);
                            if (!currentlySelected && existsIndex === -1) {
                              return [...prev, name];
                            }
                            if (currentlySelected && existsIndex !== -1) {
                              const copy = [...prev];
                              copy.splice(existsIndex, 1);
                              return copy;
                            }
                            return prev;
                          });
                        }}
                      />
                      <span className="text-xs">
                        {m.name || m.id}{" "}
                        {(m as any).merchantCategoryName
                          ? `– ${(m as any).merchantCategoryName}`
                          : ""}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="border border-slate-200 rounded-full px-4 py-1.5 bg-white hover:bg-slate-50 text-sm"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 text-white rounded-full px-5 py-1.5 text-sm font-medium shadow-md hover:bg-indigo-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingCard && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full p-6 max-h-[90vh] overflow-y-auto space-y-4 border border-slate-200">
            <div className="flex justify-between items-center mb-2">
              <div>
                <h2 className="font-semibold text-lg text-slate-900">
                  Edit card #{editingCard.id}
                </h2>
                <p className="text-xs text-slate-500">
                  Update limits and merchant rules for this card.
                </p>
              </div>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600 text-xl"
                onClick={() => setEditingCard(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="space-y-5">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-2 bg-slate-50/80 rounded-xl p-3 border border-slate-200/70">
                  <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wide">
                    Card name
                  </label>
                  <input
                    className="border border-slate-200 rounded-lg px-3 py-2 w-full bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                    value={editingCard.name}
                    onChange={(e) =>
                      setEditingCard({ ...editingCard, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-3">
                  <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/70">
                    <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wide">
                      Status
                    </label>
                    <select
                      className="border border-slate-200 rounded-lg px-3 py-2 w-full bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                    >
                      <option value="">Keep current</option>
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                    </select>
                  </div>
                  <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/70">
                    <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wide">
                      Daily limit (USD)
                    </label>
                    <input
                      type="number"
                      min={0}
                      className="border border-slate-200 rounded-lg px-3 py-2 w-full bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                      value={editDailyLimit ?? ""}
                      onChange={(e) =>
                        setEditDailyLimit(
                          e.target.value === "" ? null : Number(e.target.value)
                        )
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-3">
                  <div className="font-semibold mb-1 text-slate-700 text-xs uppercase tracking-wide">
                    Countries allow
                  </div>
                  <div className="border border-slate-200 rounded-lg p-2 max-h-56 overflow-y-auto space-y-1 bg-white/80">
                    {countries.map((c) => (
                      <label
                        key={c.id}
                        className="flex items-center gap-2 text-slate-700"
                      >
                        <input
                          type="checkbox"
                          className="rounded border-slate-300"
                          checked={editCountriesAllow.includes(c.code)}
                          onChange={() =>
                            setEditCountriesAllow((prev) =>
                              toggleStringInArray(prev, c.code)
                            )
                          }
                        />
                        <span className="text-xs">
                          {c.code} – {c.name}
                          {c.region ? ` (${c.region})` : ""}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-3">
                  <div className="font-semibold mb-1 text-slate-700 text-xs uppercase tracking-wide">
                    MCC codes allow
                  </div>
                  <div className="border border-slate-200 rounded-lg p-2 max-h-56 overflow-y-auto space-y-1 bg-white/80">
                    {mccCodes.map((m) => (
                      <label
                        key={m.id}
                        className="flex items-center gap-2 text-slate-700"
                      >
                        <input
                          type="checkbox"
                          className="rounded border-slate-300"
                          checked={editMccCodesAllow.includes(m.code)}
                          onChange={() =>
                            setEditMccCodesAllow((prev) =>
                              toggleStringInArray(prev, m.code)
                            )
                          }
                        />
                        <span className="text-xs">
                          {m.code} – {m.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-3">
                  <div className="font-semibold mb-1 text-slate-700 text-xs uppercase tracking-wide">
                    Merchant categories allow
                  </div>
                  <div className="border border-slate-200 rounded-lg p-2 max-h-56 overflow-y-auto space-y-1 bg-white/80">
                    {merchantCategories.map((cat) => (
                      <label
                        key={cat.id}
                        className="flex items-center gap-2 text-slate-700"
                      >
                        <input
                          type="checkbox"
                          className="rounded border-slate-300"
                          checked={editMerchantCategories.includes(
                            (cat as any).slashId
                          )}
                          onChange={() =>
                            setEditMerchantCategories((prev) =>
                              toggleStringInArray(prev, (cat as any).slashId)
                            )
                          }
                        />
                        <span className="text-xs">{cat.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm rounded-xl border border-slate-200/70 bg-slate-50/60 p-3">
                <div className="font-semibold text-slate-700 text-xs uppercase tracking-wide">
                  Merchants allow
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    className="border border-slate-200 rounded-lg px-3 py-2 flex-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="Type at least 3 characters to search merchant..."
                    value={merchantSearchQuery}
                    onChange={(e) => setMerchantSearchQuery(e.target.value)}
                  />
                  {merchantSearchCursor && (
                    <button
                      type="button"
                      className="border border-slate-200 rounded-lg px-3 py-1 text-sm bg-white hover:bg-slate-50"
                      onClick={loadMoreMerchants}
                    >
                      Load more
                    </button>
                  )}
                </div>

                {editMerchantIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {editMerchantIds.map((id, index) => {
                      const label =
                        editMerchantNames[index] ||
                        merchantSearchResult.find((m) => m.id === id)?.name ||
                        id;
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full text-xs"
                        >
                          {label}
                          <button
                            type="button"
                            className="ml-1 text-[10px]"
                            onClick={() => {
                              setEditMerchantIds((prev) =>
                                prev.filter((x) => x !== id)
                              );
                              setEditMerchantNames((prev) =>
                                prev.filter((_, i) => i !== index)
                              );
                            }}
                          >
                            ✕
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                <div className="border border-slate-200 rounded-lg p-2 max-h-56 overflow-y-auto space-y-1 mt-1 bg-white/80">
                  {merchantSearching && (
                    <div className="text-xs text-slate-500">Searching...</div>
                  )}
                  {!merchantSearching && merchantSearchResult.length === 0 && (
                    <div className="text-xs text-slate-500">
                      Type at least 3 characters to search.
                    </div>
                  )}
                  {merchantSearchResult.map((m) => (
                    <label
                      key={m.id}
                      className="flex items-center gap-2 text-slate-700"
                    >
                      <input
                        type="checkbox"
                        className="rounded border-slate-300"
                        checked={editMerchantIds.includes(m.id)}
                        onChange={() => {
                          setEditMerchantIds((prev) =>
                            toggleStringInArray(prev, m.id)
                          );
                          const name = m.name || m.id;
                          setEditMerchantNames((prev) => {
                            const existsIndex = prev.indexOf(name);
                            const currentlySelected = editMerchantIds.includes(
                              m.id
                            );
                            if (!currentlySelected && existsIndex === -1) {
                              return [...prev, name];
                            }
                            if (currentlySelected && existsIndex !== -1) {
                              const copy = [...prev];
                              copy.splice(existsIndex, 1);
                              return copy;
                            }
                            return prev;
                          });
                        }}
                      />
                      <span className="text-xs">
                        {m.name || m.id}{" "}
                        {(m as any).merchantCategoryName
                          ? `– ${(m as any).merchantCategoryName}`
                          : ""}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="border border-slate-200 rounded-full px-4 py-1.5 bg-white hover:bg-slate-50 text-sm"
                  onClick={() => setEditingCard(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 text-white rounded-full px-5 py-1.5 text-sm font-medium shadow-md hover:bg-indigo-700"
                >
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailCard && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-slate-50 rounded-2xl shadow-2xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Card details
                  </h2>
                  {detailLoading && (
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <span className="inline-block h-3 w-3 border-[2px] border-slate-400 border-t-transparent rounded-full animate-spin" />
                      Loading secure data...
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="text-rose-500 text-xl leading-none"
                onClick={() => setDetailCard(null)}
              >
                ✕
              </button>
            </div>

            <div className="space-y-1 text-sm text-slate-800 mb-4">
              <p>
                <span className="font-semibold">Status: </span>
                {detailCard.status}
              </p>
              <p>
                <span className="font-semibold">Virtual account: </span>
                {detailCard.virtualAccountName || detailCard.virtualAccountId}
              </p>
              <p>
                <span className="font-semibold">Group: </span>
                {detailCard.cardGroupName || "-"}
              </p>
              {detailCard.isPhysical !== undefined &&
                detailCard.isPhysical !== null && (
                  <p>
                    <span className="font-semibold">Physical card: </span>
                    {detailCard.isPhysical ? "Yes" : "No"}
                  </p>
                )}
              {detailCard.isSingleUse !== undefined &&
                detailCard.isSingleUse !== null && (
                  <p>
                    <span className="font-semibold">Single use: </span>
                    {detailCard.isSingleUse ? "Yes" : "No"}
                  </p>
                )}

              <div className="flex flex-col gap-1 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">CVV:</span>
                  {detailCard.cvv && !showCvv && (
                    <button
                      type="button"
                      className="text-xs text-indigo-600 underline"
                      onClick={() => {
                        setCvvCheckMode(true);
                        setCvvCheckFirst3("");
                        setCvvCheckLast3("");
                      }}
                    >
                      Show CVV
                    </button>
                  )}
                  {detailCard.cvv && showCvv && (
                    <button
                      type="button"
                      className="text-xs text-indigo-600 underline"
                      onClick={() => {
                        setShowCvv(false);
                        setCvvCheckMode(false);
                      }}
                    >
                      Hide CVV
                    </button>
                  )}
                </div>

                {cvvCheckMode && !showCvv && (
                  <div className="flex flex-wrap items-center gap-2 pl-6">
                    <span className="text-xs text-slate-600">
                      Enter first 3 and last 3 digits of this card:
                    </span>
                    <input
                      type="password"
                      maxLength={3}
                      className="border border-slate-300 rounded px-2 py-1 w-14 text-center text-xs bg-white"
                      value={cvvCheckFirst3}
                      onChange={(e) =>
                        setCvvCheckFirst3(
                          e.target.value.replace(/\D/g, "").slice(0, 3)
                        )
                      }
                      placeholder="123"
                    />
                    <span className="text-xs text-slate-500">...</span>
                    <input
                      type="password"
                      maxLength={3}
                      className="border border-slate-300 rounded px-2 py-1 w-14 text-center text-xs bg-white"
                      value={cvvCheckLast3}
                      onChange={(e) =>
                        setCvvCheckLast3(
                          e.target.value.replace(/\D/g, "").slice(0, 3)
                        )
                      }
                      placeholder="456"
                    />
                    <button
                      type="button"
                      className="text-xs px-3 py-1 rounded-full bg-indigo-600 text-white hover:bg-indigo-700"
                      onClick={handleConfirmShowCvv}
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      className="text-xs px-2 py-1 rounded-full border border-slate-300 bg-white hover:bg-slate-50"
                      onClick={() => {
                        setCvvCheckMode(false);
                        setCvvCheckFirst3("");
                        setCvvCheckLast3("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {detailCard.last4 && (
                <p>
                  <span className="font-semibold">Last 4 digits: </span>
                  {detailCard.last4}
                </p>
              )}

              <p>
                <span className="font-semibold">Created at: </span>
                {detailCard.createdAt
                  ? new Date(detailCard.createdAt).toLocaleString()
                  : "-"}
              </p>
            </div>

            <div className="grid md:grid-cols-2 h-[190px] gap-4 mb-5">
              <div className="relative rounded-2xl overflow-hidden shadow-lg bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white px-5 py-4">
                <div className="flex justify-between items-start mb-6">
                  <div></div>
                  <div className="text-lg font-bold tracking-widest">VISA</div>
                </div>

                <div className="text-lg font-bold pt-5 tracking-[0.25em] font-mono mb-4">
                  {detailLoading && !detailCard.pan
                    ? "**** **** **** ****"
                    : formatPanForDisplay(
                        detailCard.pan,
                        detailCard.last4 || null
                      )}
                </div>

                <div className="flex items-end justify-between text-xs">
                  <div>
                    <div className="uppercase text-[10px] text-slate-300 mb-1">
                      Card Name
                    </div>
                    <div className="font-semibold truncate max-w-[150px]">
                      {detailCard.name || "Card holder"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="uppercase text-[10px] text-slate-300 mb-1">
                      Expires
                    </div>
                    <div className="font-semibold">
                      {detailCard.expiryMonth && detailCard.expiryYear
                        ? `${detailCard.expiryMonth}/${detailCard.expiryYear}`
                        : "--/----"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative rounded-2xl overflow-hidden shadow-lg bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white px-5 py-4">
                <div className="h-8 bg-black/60 -mx-5 mb-4" />

                <div className="text-xs mb-1 flex items-center justify-between px-1">
                  <span className="font-semibold tracking-wide uppercase">
                    CVV
                  </span>
                </div>

                <div className="bg-slate-100 text-slate-900 rounded-lg px-3 py-2 font-mono text-sm tracking-[0.3em]">
                  {detailLoading && !detailCard.cvv
                    ? "***"
                    : detailCard.cvv
                    ? showCvv
                      ? detailCard.cvv
                      : "***"
                    : "***"}
                </div>

                <div className="absolute bottom-3 right-4 text-lg font-bold tracking-widest opacity-80">
                  VISA
                </div>
              </div>
            </div>

            <hr className="my-4 border-slate-200" />

            <div className="space-y-2 text-sm text-slate-800">
              <p>
                <span className="font-semibold">Daily limit (USD): </span>
                {detailCard.dailyLimitCents != null &&
                detailCard.dailyLimitCents > 0
                  ? formatAmount(detailCard.dailyLimitCents)
                  : "No limit"}
              </p>
              <p>
                <span className="font-semibold">Countries allow (ISO2): </span>
                {renderCodeList(detailCard.countriesAllow, countryLabelMap)}
              </p>
              <p>
                <span className="font-semibold">Merchant names allow: </span>
                {detailCard.merchantNamesAllow &&
                detailCard.merchantNamesAllow.length > 0
                  ? detailCard.merchantNamesAllow.join(", ")
                  : "__"}
              </p>
              <p>
                <span className="font-semibold">
                  Merchant categories allow:
                </span>{" "}
                {renderCodeList(
                  detailCard.merchantCategories,
                  merchantCategoryLabelMap
                )}
              </p>
              <p>
                <span className="font-semibold">MCC codes allow: </span>
                {renderCodeList(detailCard.mccCodesAllow, mccLabelMap)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
