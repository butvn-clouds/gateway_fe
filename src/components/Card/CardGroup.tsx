// src/components/card-group/CardGroupManager.tsx
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContextProvider";
import {
  Account,
  CardGroup,
  VirtualAccount,
  CountryOptionDTO,
  MccCodeOption,
  Merchant,
  MerchantCategory,
  MerchantSearchResponse,
  CardGroupSpendingConstraintParam,
  CardSpendingConstraintParam,
} from "../../types/Types";
import { cardGroupApi } from "../../api/api.cardgroup";
import { virtualAccountApi } from "../../api/api.virtualaccout";
import { cardMetaApi } from "../../api/api.cardMeta";
import { merchantApi } from "../../api/api.merchant";

interface Props {
  pageSize?: number;
}

type ModalTab = "MAIN" | "LIMITS";
type UtilizationPreset = "daily" | "weekly" | "monthly";

const toggleStringInArray = (list: string[], value: string): string[] =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

export const CardGroupManager: React.FC<Props> = ({ pageSize = 50 }) => {
  const { user, loading } = useAuth();

  const [selectedVaId, setSelectedVaId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [data, setData] = useState<CardGroup[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createTab, setCreateTab] = useState<ModalTab>("MAIN");

  const [createName, setCreateName] = useState("");
  const [createVaId, setCreateVaId] = useState<number | null>(null);
  const [createStartDate, setCreateStartDate] = useState<string>("");

  const [createTxnLimitOn, setCreateTxnLimitOn] = useState(false);
  const [createUtilLimitOn, setCreateUtilLimitOn] = useState(false);
  const [createUtilPreset, setCreateUtilPreset] =
    useState<UtilizationPreset>("daily");

  const [createDailyLimitUsd, setCreateDailyLimitUsd] = useState<number>(0);
  const [createMinTxnUsd, setCreateMinTxnUsd] = useState<number>(0);
  const [createMaxTxnUsd, setCreateMaxTxnUsd] = useState<number>(0);

  const [createDailyLimitUsdInput, setCreateDailyLimitUsdInput] =
    useState<string>("");
  const [createMinTxnUsdInput, setCreateMinTxnUsdInput] = useState<string>("");
  const [createMaxTxnUsdInput, setCreateMaxTxnUsdInput] = useState<string>("");

  const [createCountriesAllow, setCreateCountriesAllow] = useState<string[]>(
    []
  );
  const [createMccCodesAllow, setCreateMccCodesAllow] = useState<string[]>([]);
  const [createMerchantCategories, setCreateMerchantCategories] = useState<
    string[]
  >([]);
  const [createMerchantIds, setCreateMerchantIds] = useState<string[]>([]);
  const [showEdit, setShowEdit] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CardGroup | null>(null);
  const [editTab, setEditTab] = useState<ModalTab>("MAIN");
  const [editName, setEditName] = useState("");
  const [editStartDate, setEditStartDate] = useState<string>("");
  const [editTxnLimitOn, setEditTxnLimitOn] = useState(false);
  const [editUtilLimitOn, setEditUtilLimitOn] = useState(false);
  const [editUtilPreset, setEditUtilPreset] =
    useState<UtilizationPreset>("daily");

  const [editDailyLimitUsd, setEditDailyLimitUsd] = useState<number>(0);
  const [editMinTxnUsd, setEditMinTxnUsd] = useState<number>(0);
  const [editMaxTxnUsd, setEditMaxTxnUsd] = useState<number>(0);
  const [editMinTxnUsdInput, setEditMinTxnUsdInput] = useState<string>("");
  const [editMaxTxnUsdInput, setEditMaxTxnUsdInput] = useState<string>("");
  const [editCountriesAllow, setEditCountriesAllow] = useState<string[]>([]);
  const [editMccCodesAllow, setEditMccCodesAllow] = useState<string[]>([]);
  const [editMerchantCategories, setEditMerchantCategories] = useState<
    string[]
  >([]);
  const [editMerchantIds, setEditMerchantIds] = useState<string[]>([]);

  const [accountVirtualAccounts, setAccountVirtualAccounts] = useState<
    VirtualAccount[]
  >([]);
  const [loadingVa, setLoadingVa] = useState(false);

  const [metaLoading, setMetaLoading] = useState(false);
  const [countries, setCountries] = useState<CountryOptionDTO[]>([]);
  const [mccCodes, setMccCodes] = useState<MccCodeOption[]>([]);
  const [merchantCategories, setMerchantCategories] = useState<
    MerchantCategory[]
  >([]);

  const [merchantSearchResult, setMerchantSearchResult] = useState<Merchant[]>(
    []
  );
  const [merchantSearchQuery, setMerchantSearchQuery] = useState("");
  const [merchantSearchCursor, setMerchantSearchCursor] = useState<
    string | undefined
  >();
  const [merchantSearching, setMerchantSearching] = useState(false);
  const accounts: Account[] = useMemo(() => user?.accounts ?? [], [user]);
  const activeAccountId: number | null = useMemo(() => {
    if (!user) return null;
    if (user.activeAccount) return user.activeAccount.id;
    if (accounts.length > 0) return accounts[0].id;
    return null;
  }, [user, accounts]);

  const activeAccount: Account | null = useMemo(() => {
    if (!activeAccountId) return null;
    return accounts.find((acc) => acc.id === activeAccountId) || null;
  }, [accounts, activeAccountId]);

  const formatUsd = (cents?: number | null) => {
    if (cents == null) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  const usdToCents = (usd: number) => {
    if (!Number.isFinite(usd)) return 0;
    return Math.round(usd * 100);
  };

  const centsToUsd = (cents?: number | null) => {
    if (cents == null) return 0;
    return Number((cents / 100).toFixed(2));
  };

  const findVaName = (id: number | null, cg?: CardGroup): string => {
    if (!user) return "-";

    if (cg && (cg as any).virtualAccountName) {
      return (cg as any).virtualAccountName;
    }

    if (!id) return "-";

    const va =
      accountVirtualAccounts.find((v) => v.id === id) ||
      (user.virtualAccounts ?? []).find((v) => v.id === id);

    return va?.name || va?.accountNumber || `VA #${id}`;
  };

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

  const countryLabelMap = useMemo(() => {
    const m = new Map<string, string>();
    countries.forEach((c) => {
      const label =
        (c as any).region && (c as any).region.trim().length > 0
          ? `${c.code} – ${c.name} (${(c as any).region})`
          : `${c.code} – ${c.name}`;
      m.set(c.code.toUpperCase(), label);
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

  const addMerchantToCreate = (m: Merchant) => {
    if (!m.id) return;
    setCreateMerchantIds((prev) =>
      prev.includes(m.id) ? prev : [...prev, m.id]
    );
  };

  const addMerchantToEdit = (m: Merchant) => {
    if (!m.id) return;
    setEditMerchantIds((prev) =>
      prev.includes(m.id) ? prev : [...prev, m.id]
    );
  };

  useEffect(() => {
    const fetchVAs = async () => {
      if (!activeAccountId) {
        setAccountVirtualAccounts([]);
        setSelectedVaId(null);
        return;
      }
      setLoadingVa(true);
      try {
        const res = await virtualAccountApi.getByAccountPaged(
          activeAccountId,
          0,
          1000,
          undefined
        );
        setAccountVirtualAccounts(res.content || []);

        if (res.content && res.content.length === 1) {
          setSelectedVaId(res.content[0].id);
          setCreateVaId(res.content[0].id);
        } else {
          setSelectedVaId(null);
          setCreateVaId(null);
        }
      } catch (err: any) {
        console.error(err);
        setAccountVirtualAccounts([]);
        toast.error(
          err?.response?.data?.message || "Unable to load virtual accounts"
        );
      } finally {
        setLoadingVa(false);
      }
    };

    fetchVAs();
  }, [activeAccountId]);

  useEffect(() => {
    setPage(0);
    if (accountVirtualAccounts.length === 1) {
      setCreateVaId(accountVirtualAccounts[0].id);
    } else if (
      createVaId &&
      !accountVirtualAccounts.some((v) => v.id === createVaId)
    ) {
      setCreateVaId(null);
    }
  }, [activeAccountId, accountVirtualAccounts]);

  const loadData = async (
    accountId: number,
    pageIndex: number,
    vaId?: number | null,
    keyword?: string
  ) => {
    setFetching(true);
    try {
      const res = await cardGroupApi.getByAccountPaged(
        accountId,
        pageIndex,
        pageSize,
        vaId ?? undefined,
        keyword
      );

      setData(res.content);

      const currentPage =
        typeof (res as any).page === "number"
          ? (res as any).page
          : typeof (res as any).number === "number"
          ? (res as any).number
          : 0;
      const tp =
        typeof res.totalPages === "number" && Number.isFinite(res.totalPages)
          ? res.totalPages
          : typeof (res as any).total_pages === "number"
          ? (res as any).total_pages
          : 0;
      setPage(currentPage >= 0 ? currentPage : 0);
      setTotalPages(tp);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Unable to load card groups");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (activeAccountId != null) {
      loadData(activeAccountId, page, selectedVaId, search);
    } else {
      setData([]);
    }
  }, [activeAccountId, selectedVaId, page]);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeAccountId != null) {
      setPage(0);
      await loadData(activeAccountId, 0, selectedVaId, search);
    }
  };

  const handleSync = async () => {
    if (activeAccountId == null) return;
    setSyncing(true);
    try {
      await cardGroupApi.syncAccount(
        activeAccountId,
        selectedVaId ?? undefined,
        undefined,
        search || undefined
      );
      setPage(0);
      await loadData(activeAccountId, 0, selectedVaId, search);
      toast.success("Sync card groups successful");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Sync card groups failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this card group (local)?")) return;
    try {
      await cardGroupApi.deleteCardGroup(id);
      toast.success("Delete card group successful");
      if (activeAccountId != null) {
        await loadData(activeAccountId, page, selectedVaId, search);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || "Unable to delete card group"
      );
    }
  };

  const extractRuleSelectionsFromConstraint = (
    sc?: CardSpendingConstraintParam | null
  ) => {
    const countries =
      sc?.countryRule?.restriction === "allowlist" && sc.countryRule.countries
        ? sc.countryRule.countries.map((c) => String(c).toUpperCase())
        : [];

    const mccCodes =
      sc?.merchantCategoryCodeRule?.restriction === "allowlist" &&
      sc.merchantCategoryCodeRule.merchantCategoryCodes
        ? sc.merchantCategoryCodeRule.merchantCategoryCodes.map((c) =>
            String(c)
          )
        : [];

    const merchants =
      sc?.merchantRule?.restriction === "allowlist" && sc.merchantRule.merchants
        ? sc.merchantRule.merchants.map((id) => String(id))
        : [];

    const categories =
      sc?.merchantCategoryRule?.restriction === "allowlist" &&
      sc.merchantCategoryRule.merchantCategories
        ? sc.merchantCategoryRule.merchantCategories.map((id) => String(id))
        : [];

    return {
      countries,
      mccCodes,
      merchants,
      categories,
    };
  };

  const buildConstraintRulesPayload = (
    countriesAllow: string[],
    mccCodesAllow: string[],
    merchantCategoriesAllow: string[],
    merchantIdsAllow: string[]
  ): CardGroupSpendingConstraintParam | null => {
    const hasCountries = countriesAllow && countriesAllow.length > 0;
    const hasMcc = mccCodesAllow && mccCodesAllow.length > 0;
    const hasCat =
      merchantCategoriesAllow && merchantCategoriesAllow.length > 0;
    const hasMerchants = merchantIdsAllow && merchantIdsAllow.length > 0;

    if (!hasCountries && !hasMcc && !hasCat && !hasMerchants) return null;

    const payload: CardGroupSpendingConstraintParam = {};

    if (hasCountries) {
      payload.countries = countriesAllow.map((c) => c.toUpperCase());
      payload.countryRestriction = "allowlist";
    }

    if (hasMcc) {
      payload.merchantCategoryCodes = mccCodesAllow;
      payload.merchantCategoryCodeRestriction = "allowlist";
    }

    if (hasCat) {
      payload.merchantCategories = merchantCategoriesAllow;
      payload.merchantCategoryRestriction = "allowlist";
    }

    if (hasMerchants) {
      payload.merchantIds = merchantIdsAllow;
      payload.merchantRestriction = "allowlist";
    }

    return payload;
  };

  const openCreateModal = () => {
    setCreateTab("MAIN");
    setCreateName("");
    setCreateStartDate("");

    setCreateTxnLimitOn(false);
    setCreateUtilLimitOn(false);
    setCreateUtilPreset("daily");

    setCreateDailyLimitUsd(0);
    setCreateMinTxnUsd(0);
    setCreateMaxTxnUsd(0);

    setCreateDailyLimitUsdInput("");
    setCreateMinTxnUsdInput("");
    setCreateMaxTxnUsdInput("");

    setCreateCountriesAllow([]);
    setCreateMccCodesAllow([]);
    setCreateMerchantCategories([]);
    setCreateMerchantIds([]);

    setMerchantSearchQuery("");
    setMerchantSearchResult([]);
    setMerchantSearchCursor(undefined);

    if (accountVirtualAccounts.length === 1) {
      setCreateVaId(accountVirtualAccounts[0].id);
    } else {
      setCreateVaId(null);
    }

    setShowCreate(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAccountId) {
      toast.error("No account selected");
      return;
    }
    if (!createName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    if (!createVaId) {
      toast.error("Please select a virtual account");
      return;
    }

    try {
      setCreating(true);

      const payload: any = {
        virtualAccountId: createVaId,
        name: createName.trim(),
        startDate: createStartDate || null,

        utilizationLimitOn: createUtilLimitOn,
        transactionLimitOn: createTxnLimitOn,
      };

      if (createTxnLimitOn) {
        payload.minTransactionCents = usdToCents(Number(createMinTxnUsd) || 0);
        payload.maxTransactionCents = usdToCents(Number(createMaxTxnUsd) || 0);
      }

      if (createUtilLimitOn) {
        payload.dailyLimitCents = usdToCents(Number(createDailyLimitUsd) || 0);
        payload.timezone = "UTC";
        payload.preset = createUtilPreset;
      }

      const created: CardGroup = await cardGroupApi.createCardGroup(
        activeAccountId,
        payload
      );

      const rulesPayload = buildConstraintRulesPayload(
        createCountriesAllow,
        createMccCodesAllow,
        createMerchantCategories,
        createMerchantIds
      );

      if (rulesPayload && created && created.id != null) {
        try {
          await cardGroupApi.patchSpendingConstraint(created.id, rulesPayload);
        } catch (err: any) {
          console.error(err);
          toast.error(
            err?.response?.data?.message ||
              "Card group created but rule update failed"
          );
        }
      }

      toast.success("Create card group successful");
      setShowCreate(false);
      setPage(0);
      await loadData(activeAccountId, 0, selectedVaId, search);
    } catch (err: any) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || "Unable to create card group"
      );
    } finally {
      setCreating(false);
    }
  };

  const openEditModal = (cg: CardGroup) => {
    setEditingGroup(cg);
    setEditTab("MAIN");
    setEditName(cg.name ?? "");
    setEditStartDate(cg.startDate ?? "");

    const dailyUsd = centsToUsd(cg.dailyLimitCents);
    const minUsd = centsToUsd(cg.minTransactionCents);
    const maxUsd = centsToUsd(cg.maxTransactionCents);

    setEditDailyLimitUsd(dailyUsd);
    setEditMinTxnUsd(minUsd);
    setEditMaxTxnUsd(maxUsd);

    const txLimitOnFromBackend =
      (cg as any).transactionLimitOn !== undefined
        ? Boolean((cg as any).transactionLimitOn)
        : minUsd > 0 || maxUsd > 0;

    const utilLimitOnFromBackend =
      (cg as any).utilizationLimitOn !== undefined
        ? Boolean((cg as any).utilizationLimitOn)
        : dailyUsd > 0;

    setEditTxnLimitOn(txLimitOnFromBackend);
    setEditUtilLimitOn(utilLimitOnFromBackend);

    setEditMinTxnUsdInput(minUsd > 0 ? minUsd.toFixed(2) : "");
    setEditMaxTxnUsdInput(maxUsd > 0 ? maxUsd.toFixed(2) : "");

    const preset = (cg as any).preset as UtilizationPreset | undefined;
    setEditUtilPreset(preset || "daily");

    const sc = (cg as any).spendingConstraint as
      | CardSpendingConstraintParam
      | null
      | undefined;

    if (sc) {
      const { countries, mccCodes, merchants, categories } =
        extractRuleSelectionsFromConstraint(sc);

      setEditCountriesAllow(countries);
      setEditMccCodesAllow(mccCodes);
      setEditMerchantIds(merchants);
      setEditMerchantCategories(categories);
    } else {
      setEditCountriesAllow([]);
      setEditMccCodesAllow([]);
      setEditMerchantIds([]);
      setEditMerchantCategories([]);
    }

    setMerchantSearchQuery("");
    setMerchantSearchResult([]);
    setMerchantSearchCursor(undefined);

    setShowEdit(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup) return;
    if (!editName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    try {
      const payload: any = {
        name: editName.trim(),
        startDate: editStartDate || null,

        utilizationLimitOn: editUtilLimitOn,
        transactionLimitOn: editTxnLimitOn,
      };

      if (editTxnLimitOn) {
        payload.minTransactionCents = usdToCents(Number(editMinTxnUsd) || 0);
        payload.maxTransactionCents = usdToCents(Number(editMaxTxnUsd) || 0);
      }

      if (editUtilLimitOn) {
        payload.dailyLimitCents = usdToCents(Number(editDailyLimitUsd) || 0);
        payload.timezone = "UTC";
        payload.preset = editUtilPreset;
      }

      await cardGroupApi.updateCardGroup(editingGroup.id, payload);

      const rulesPayload = buildConstraintRulesPayload(
        editCountriesAllow,
        editMccCodesAllow,
        editMerchantCategories,
        editMerchantIds
      );

      if (rulesPayload) {
        try {
          await cardGroupApi.patchSpendingConstraint(
            editingGroup.id,
            rulesPayload
          );
        } catch (err: any) {
          console.error(err);
          toast.error(
            err?.response?.data?.message ||
              "Card group updated but rule update failed"
          );
        }
      }

      toast.success("Update card group successful");
      setShowEdit(false);
      if (activeAccountId != null) {
        await loadData(activeAccountId, page, selectedVaId, search);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || "Unable to update card group"
      );
    }
  };

  if (loading) return <div>Check auth...</div>;
  if (!user) return <div>Not logged in</div>;

  const renderLimitToggle = (on: boolean, setOn: (v: boolean) => void) => (
    <div className="inline-flex rounded-full bg-slate-100 p-0.5 text-[11px]">
      <button
        type="button"
        className={`px-3 py-1 rounded-full ${
          !on
            ? "bg-white shadow-sm text-slate-900"
            : "text-slate-500 hover:text-slate-700"
        }`}
        onClick={() => setOn(false)}
      >
        Off
      </button>
      <button
        type="button"
        className={`px-3 py-1 rounded-full ${
          on
            ? "bg-emerald-500 text-white shadow-sm"
            : "text-slate-500 hover:text-slate-700"
        }`}
        onClick={() => setOn(true)}
      >
        On
      </button>
    </div>
  );

  const disabledInputClass = (enabled: boolean) =>
    enabled
      ? "bg-white"
      : "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200";

  const renderCountriesChips = (
    selected: string[],
    setSelected: (v: string[]) => void
  ) => (
    <div className="flex flex-wrap gap-1.5 max-h-45 overflow-y-auto">
      {countries.map((c) => {
        const code = c.code.toUpperCase();
        const label = countryLabelMap.get(code) || `${code} – ${c.name}`;
        const active = selected.includes(code);
        return (
          <button
            key={code}
            type="button"
            className={`px-3 py-1 rounded-full border text-[11px] transition ${
              active
                ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
            onClick={() => setSelected(toggleStringInArray(selected, code))}
          >
            {label}
          </button>
        );
      })}
    </div>
  );

  const renderMccChips = (
    selected: string[],
    setSelected: (v: string[]) => void
  ) => (
    <div className="flex flex-wrap gap-1.5 max-h-45 overflow-y-auto">
      {mccCodes.map((m) => {
        const code = m.code;
        const label = mccLabelMap.get(code) || `${code} – ${m.name}`;
        const active = selected.includes(code);
        return (
          <button
            key={code}
            type="button"
            className={`px-3 py-1 rounded-full border text-[11px] transition ${
              active
                ? "bg-indigo-50 text-indigo-700 border-indigo-300"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
            onClick={() => setSelected(toggleStringInArray(selected, code))}
          >
            {label}
          </button>
        );
      })}
    </div>
  );

  const renderMerchantCategoryChips = (
    selected: string[],
    setSelected: (v: string[]) => void
  ) => (
    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
      {merchantCategories.map((cat) => {
        const slashId = (cat as any).slashId as string | undefined;
        if (!slashId) return null;
        const label =
          merchantCategoryLabelMap.get(slashId) || `${slashId} – ${cat.name}`;
        const active = selected.includes(slashId);
        return (
          <button
            key={slashId}
            type="button"
            className={`px-3 py-1 rounded-full border text-[11px] transition ${
              active
                ? "bg-pink-50 text-pink-700 border-pink-300"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
            onClick={() => setSelected(toggleStringInArray(selected, slashId))}
          >
            {label}
          </button>
        );
      })}
    </div>
  );

  const renderMerchantSelectedChips = (
    selectedIds: string[],
    setSelected: (v: string[]) => void
  ) => (
    <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto mt-1.5">
      {selectedIds.length === 0 ? (
        <span className="text-[11px] text-slate-400">
          No merchants selected
        </span>
      ) : (
        selectedIds.map((id) => (
          <span
            key={id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-[11px] text-slate-800"
          >
            <span>{id}</span>
            <button
              type="button"
              className="text-slate-500 hover:text-red-500"
              onClick={() => setSelected(selectedIds.filter((x) => x !== id))}
            >
              ×
            </button>
          </span>
        ))
      )}
    </div>
  );

  return (
    <>
      <div className="rounded-2xl bg-white shadow-sm border border-slate-200/70 px-4 py-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-[0.16em] text-indigo-500">
              Cards Group management
            </div>
            <div className="text-xl font-semibold text-slate-900">
              {activeAccount ? activeAccount.name : "No active account"}
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-slate-700">
               <span className="inline-flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                Virtual accounts: {loadingVa ? "..." : loadingVa === false ? accountVirtualAccounts.length : "0"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing || activeAccountId == null}
              className="rounded-full bg-indigo-600 text-white px-5 py-1.5 text-sm font-medium shadow-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {syncing ? "Refreshing..." : "🔄 Refresh "}
            </button>

            <button
              className="rounded-full bg-slate-900 text-white px-5 py-1.5 text-sm font-medium shadow-md hover:bg-slate-800 disabled:opacity-50 transition-colors"
              onClick={openCreateModal}
              disabled={activeAccountId == null || loadingVa}
            >
              + Create Card Group
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-700 text-xs uppercase tracking-wide">
                Virtual Account
              </span>
              <select
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                value={selectedVaId ?? ""}
                onChange={(e) => {
                  const v = e.target.value ? Number(e.target.value) : null;
                  setSelectedVaId(v);
                  setPage(0);
                }}
                disabled={activeAccountId == null || loadingVa}
              >
                <option value="">
                  {loadingVa ? "Loading VAs..." : "All Virtual Accounts"}
                </option>
                {accountVirtualAccounts.map((va) => (
                  <option key={va.id} value={va.id}>
                    {va.name || va.accountNumber || `VA #${va.id}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full">
              <form
                onSubmit={handleSearchSubmit}
                className="flex items-center ml-auto gap-0"
              >
                <input
                  className="rounded-l-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder="Search by name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button
                  type="submit"
                  className="rounded-r-xl border border-l-0 border-slate-200 bg-slate-100 px-3 py-1.5 text-xs sm:text-sm text-slate-700 hover:bg-slate-200"
                >
                  Go
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60">
        <div className="max-w-full overflow-x-auto">
          <table className="min-w-full text-xs sm:text-sm">
            <thead className="bg-slate-100/80 backdrop-blur">
              <tr className="border-b border-slate-200/70">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Virtual Account
                </th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Daily Limit
                </th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Txn Size
                </th>
                {/* <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Rules
                  </th> */}
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {fetching ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-4 text-center text-xs text-slate-500"
                  >
                    Loading card groups...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-7 text-center text-xs sm:text-sm text-slate-500"
                  >
                    No card groups found
                  </td>
                </tr>
              ) : (
                data.map((cg) => (
                  <tr
                    key={cg.id}
                    className="bg-white/60 hover:bg-indigo-50/60 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-semibold text-indigo-700">
                          {cg.name?.[0]?.toUpperCase() || "C"}
                        </div>
                        <div>
                          <div className="text-xs sm:text-sm font-medium text-slate-900">
                            {cg.name ?? "-"}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {/* ID: {cg.id} */}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="text-xs sm:text-sm text-slate-900">
                        {findVaName(cg.virtualAccountId, cg)}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-center">
                      {(cg as any).utilizationLimitOn ??
                      (cg.dailyLimitCents && cg.dailyLimitCents > 0) ? (
                        <>
                          <div className="text-xs sm:text-sm font-semibold text-emerald-600">
                            {formatUsd(cg.dailyLimitCents)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {(cg as any).preset || "daily"}
                          </div>
                        </>
                      ) : (
                        <span className="text-[11px] text-slate-400">Off</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-center">
                      {(cg as any).transactionLimitOn ??
                      (cg.minTransactionCents || cg.maxTransactionCents) ? (
                        <div className="text-xs sm:text-sm font-medium text-indigo-700">
                          {formatUsd(cg.minTransactionCents)} –{" "}
                          {formatUsd(cg.maxTransactionCents)}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">Off</span>
                      )}
                    </td>

                    {/* <td className="px-4 py-3 text-center">
                        {(cg as any).spendingConstraint ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[11px] font-medium">
                            Custom
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            None
                          </span>
                        )}
                      </td> */}

                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center gap-2">
                        <button
                          className="inline-flex items-center gap-1 rounded-full bg-sky-500 px-2.5 py-1 text-[11px] font-medium text-white shadow-sm hover:bg-sky-600 transition"
                          onClick={() => openEditModal(cg)}
                        >
                          <span className="hidden sm:inline">Edit</span>
                          <span className="sm:hidden">✏️</span>
                        </button>
                        <button
                          className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-1 text-[11px] font-medium text-white shadow-sm hover:bg-red-600 transition"
                          onClick={() => handleDelete(cg.id)}
                        >
                          <span className="hidden sm:inline">Delete</span>
                          <span className="sm:hidden">🗑</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 bg-white/80 px-4 py-3">
          <p className="text-[11px] sm:text-xs text-slate-500">
            Page{" "}
            <span className="font-semibold text-slate-800">{page + 1}</span> of{" "}
            <span className="font-semibold text-slate-800">
              {Math.max(totalPages, 1)}
            </span>{" "}
            Card Groups
          </p>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1.5 text-xs rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:text-slate-300 disabled:border-slate-100 disabled:bg-transparent transition"
              disabled={page <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Prev
            </button>
            <span className="text-[11px] text-slate-400">
              {page + 1} / {Math.max(totalPages, 1)}
            </span>
            <button
              className="px-3 py-1.5 text-xs rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:text-slate-300 disabled:border-slate-100 disabled:bg-transparent transition"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-[999] bg-black/40 flex items-center justify-center">
          <div className="w-full max-w-4xl rounded-3xl bg-[#f5f7ff] shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-[#f5f7ff] border-b border-slate-200/70">
              <h2 className="text-base font-semibold text-slate-900">
                New Card Group
              </h2>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="text-pink-500 text-xl leading-none hover:text-pink-600"
              >
                ×
              </button>
            </div>

            {/* Tabs */}
            <div className="px-6 pt-3">
              <div className="inline-flex rounded-2xl bg-slate-100/80 p-1 text-xs sm:text-sm mb-3">
                <button
                  type="button"
                  className={`px-4 py-1.5 rounded-xl font-medium ${
                    createTab === "MAIN"
                      ? "bg-white shadow-sm text-slate-900"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                  onClick={() => setCreateTab("MAIN")}
                >
                  Main Details
                </button>
                <button
                  type="button"
                  className={`px-4 py-1.5 rounded-xl font-medium ${
                    createTab === "LIMITS"
                      ? "bg-white shadow-sm text-slate-900"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                  onClick={() => setCreateTab("LIMITS")}
                >
                  Limits & Rules
                </button>
              </div>
            </div>

            <form
              onSubmit={handleCreateSubmit}
              className="px-6 pb-5 pt-1 space-y-4"
            >
              {createTab === "MAIN" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">
                      Virtual Account
                    </label>
                    <select
                      className="w-full rounded-xl border border-transparent bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                      value={createVaId ?? ""}
                      onChange={(e) =>
                        setCreateVaId(
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                    >
                      <option value="">Select VA</option>
                      {accountVirtualAccounts.map((va) => (
                        <option key={va.id} value={va.id}>
                          {va.name || va.accountNumber || `VA #${va.id}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">
                      Name
                    </label>
                    <input
                      className="w-full rounded-xl border border-transparent bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      placeholder="Name card group"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">
                      Start Date
                    </label>
                    <input
                      type="date"
                      className="w-full rounded-xl border border-transparent bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                      value={createStartDate}
                      onChange={(e) => setCreateStartDate(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {createTab === "LIMITS" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="rounded-2xl bg-white border border-slate-200/80 p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            Transaction Size Limit
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Control minimum and maximum transaction size.
                          </p>
                        </div>
                        {renderLimitToggle(
                          createTxnLimitOn,
                          setCreateTxnLimitOn
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <span className="text-[11px] font-medium text-slate-600">
                            Min
                          </span>
                          <input
                            type="text"
                            inputMode="decimal"
                            className={`w-full rounded-xl border border-transparent px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 ${disabledInputClass(
                              createTxnLimitOn
                            )}`}
                            value={createMinTxnUsdInput}
                            disabled={!createTxnLimitOn}
                            onChange={(e) => {
                              const raw = e.target.value;
                              setCreateMinTxnUsdInput(raw);
                              const cleaned = raw.replace(/,/g, "");
                              const num = parseFloat(cleaned);
                              setCreateMinTxnUsd(Number.isNaN(num) ? 0 : num);
                            }}
                            onBlur={() => {
                              if (!createMinTxnUsdInput || !createTxnLimitOn)
                                return;
                              setCreateMinTxnUsdInput(
                                createMinTxnUsd.toFixed(2)
                              );
                            }}
                            placeholder="No minimum"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[11px] font-medium text-slate-600">
                            Max
                          </span>
                          <input
                            type="text"
                            inputMode="decimal"
                            className={`w-full rounded-xl border border-transparent px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 ${disabledInputClass(
                              createTxnLimitOn
                            )}`}
                            value={createMaxTxnUsdInput}
                            disabled={!createTxnLimitOn}
                            onChange={(e) => {
                              const raw = e.target.value;
                              setCreateMaxTxnUsdInput(raw);
                              const cleaned = raw.replace(/,/g, "");
                              const num = parseFloat(cleaned);
                              setCreateMaxTxnUsd(Number.isNaN(num) ? 0 : num);
                            }}
                            onBlur={() => {
                              if (!createMaxTxnUsdInput || !createTxnLimitOn)
                                return;
                              setCreateMaxTxnUsdInput(
                                createMaxTxnUsd.toFixed(2)
                              );
                            }}
                            placeholder="No maximum"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white border border-slate-200/80 p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            Utilization Limit
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Limit total spend for a given time frame.
                          </p>
                        </div>
                        {renderLimitToggle(
                          createUtilLimitOn,
                          setCreateUtilLimitOn
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <span className="text-[11px] font-medium text-slate-600">
                            Limit amount (USD)
                          </span>
                          <input
                            type="text"
                            inputMode="decimal"
                            className={`w-full rounded-xl border border-transparent px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 ${disabledInputClass(
                              createUtilLimitOn
                            )}`}
                            value={createDailyLimitUsdInput}
                            disabled={!createUtilLimitOn}
                            onChange={(e) => {
                              const raw = e.target.value;
                              setCreateDailyLimitUsdInput(raw);
                              const cleaned = raw.replace(/,/g, "");
                              const num = parseFloat(cleaned);
                              setCreateDailyLimitUsd(
                                Number.isNaN(num) ? 0 : num
                              );
                            }}
                            onBlur={() => {
                              if (
                                !createDailyLimitUsdInput ||
                                !createUtilLimitOn
                              )
                                return;
                              setCreateDailyLimitUsdInput(
                                createDailyLimitUsd.toFixed(2)
                              );
                            }}
                            placeholder="Enter amount..."
                          />
                        </div>

                        <div className="space-y-1">
                          <span className="text-[11px] font-medium text-slate-600">
                            Timeframe
                          </span>
                          <select
                            className={`w-full rounded-xl border border-transparent px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 ${disabledInputClass(
                              createUtilLimitOn
                            )}`}
                            value={createUtilPreset}
                            disabled={!createUtilLimitOn}
                            onChange={(e) =>
                              setCreateUtilPreset(
                                e.target.value as UtilizationPreset
                              )
                            }
                          >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div
                        className="rounded-2xl bg-white border border-slate-200/80 p-4 space-y-2"
                        style={{ height: "248px" }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-slate-900">
                            Country Rule
                          </span>
                          <span className="text-[10px] text-slate-400">
                            allowlist by country
                          </span>
                        </div>
                        {metaLoading && countries.length === 0 ? (
                          <p className="text-[11px] text-slate-400">
                            Loading countries...
                          </p>
                        ) : (
                          renderCountriesChips(
                            createCountriesAllow,
                            setCreateCountriesAllow
                          )
                        )}
                      </div>

                      <div className="rounded-2xl bg-white border border-slate-200/80 p-4 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-slate-900">
                            MCC Rule
                          </span>
                          <span className="text-[10px] text-slate-400">
                            allowlist by MCC
                          </span>
                        </div>
                        {metaLoading && mccCodes.length === 0 ? (
                          <p className="text-[11px] text-slate-400">
                            Loading MCC codes...
                          </p>
                        ) : (
                          renderMccChips(
                            createMccCodesAllow,
                            setCreateMccCodesAllow
                          )
                        )}
                      </div>

                      <div className="rounded-2xl bg-white border border-slate-200/80 p-4 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-slate-900">
                            Merchant Categories
                          </span>
                          <span className="text-[10px] text-slate-400">
                            allowlist by category
                          </span>
                        </div>
                        {metaLoading && merchantCategories.length === 0 ? (
                          <p className="text-[11px] text-slate-400">
                            Loading merchant categories...
                          </p>
                        ) : (
                          renderMerchantCategoryChips(
                            createMerchantCategories,
                            setCreateMerchantCategories
                          )
                        )}
                      </div>

                      <div className="rounded-2xl bg-white border border-slate-200/80 p-4 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-slate-900">
                            Merchants
                          </span>
                          <span className="text-[10px] text-slate-400">
                            search Slash merchants
                          </span>
                        </div>

                        <input
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                          placeholder="Type at least 3 characters..."
                          value={merchantSearchQuery}
                          onChange={(e) =>
                            setMerchantSearchQuery(e.target.value)
                          }
                        />

                        {merchantSearching && (
                          <p className="text-[11px] text-slate-400 mt-1">
                            Searching merchants...
                          </p>
                        )}

                        {merchantSearchResult.length > 0 && (
                          <div className="max-h-28 overflow-auto rounded-xl border border-slate-200 bg-white px-2 py-2 space-y-1 mt-1">
                            {merchantSearchResult.map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                className="w-full text-left text-[11px] text-slate-700 hover:bg-indigo-50 rounded-lg px-2 py-1 flex justify-between gap-2"
                                onClick={() => addMerchantToCreate(m)}
                              >
                                <span>{m.name || m.id}</span>
                                <span className="text-slate-400 text-[10px]">
                                  {m.id}
                                </span>
                              </button>
                            ))}

                            {merchantSearchCursor && (
                              <button
                                type="button"
                                onClick={loadMoreMerchants}
                                className="mt-1 w-full text-center text-[11px] text-indigo-600 hover:text-indigo-800"
                              >
                                Load more...
                              </button>
                            )}
                          </div>
                        )}

                        {renderMerchantSelectedChips(
                          createMerchantIds,
                          setCreateMerchantIds
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={creating}
                className="mt-3 mb-1 w-full rounded-xl bg-[#311BFF] py-2.5 text-sm font-semibold text-white shadow-md hover:bg-[#2612e8] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {creating ? "Creating..." : "Create"}
              </button>
            </form>
          </div>
        </div>
      )}

      {showEdit && editingGroup && (
        <div className="fixed inset-0 z-[999] bg-black/40 flex items-center justify-center">
          <div className="w-full max-w-4xl rounded-3xl bg-[#f5f7ff] shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-[#f5f7ff] border-b border-slate-200/70">
              <h2 className="text-base font-semibold text-slate-900">
                Edit Card Group
              </h2>
              <button
                type="button"
                onClick={() => setShowEdit(false)}
                className="text-pink-500 text-xl leading-none hover:text-pink-600"
              >
                ×
              </button>
            </div>

            <div className="px-6 pt-3">
              <div className="inline-flex rounded-2xl bg-slate-100/80 p-1 text-xs sm:text-sm mb-3">
                <button
                  type="button"
                  className={`px-4 py-1.5 rounded-xl font-medium ${
                    editTab === "MAIN"
                      ? "bg-white shadow-sm text-slate-900"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                  onClick={() => setEditTab("MAIN")}
                >
                  Main Details
                </button>
                <button
                  type="button"
                  className={`px-4 py-1.5 rounded-xl font-medium ${
                    editTab === "LIMITS"
                      ? "bg-white shadow-sm text-slate-900"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                  onClick={() => setEditTab("LIMITS")}
                >
                  Limits & Rules
                </button>
              </div>
            </div>

            <form
              onSubmit={handleEditSubmit}
              className="px-6 pb-5 pt-1 space-y-4"
            >
              {editTab === "MAIN" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">
                      Name
                    </label>
                    <input
                      className="w-full rounded-xl border border-transparent bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">
                      Start Date
                    </label>
                    <input
                      type="date"
                      className="w-full rounded-xl border border-transparent bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                      value={editStartDate}
                      onChange={(e) => setEditStartDate(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {editTab === "LIMITS" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="rounded-2xl bg-white border border-slate-200/80 p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            Transaction Size Limit
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Control minimum and maximum transaction size.
                          </p>
                        </div>
                        {renderLimitToggle(editTxnLimitOn, setEditTxnLimitOn)}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <span className="text-[11px] font-medium text-slate-600">
                            Min
                          </span>
                          <input
                            type="text"
                            inputMode="decimal"
                            className={`w-full rounded-xl border border-transparent px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 ${disabledInputClass(
                              editTxnLimitOn
                            )}`}
                            value={editMinTxnUsdInput}
                            disabled={!editTxnLimitOn}
                            onChange={(e) => {
                              const raw = e.target.value;
                              setEditMinTxnUsdInput(raw);
                              const cleaned = raw.replace(/,/g, "");
                              const num = parseFloat(cleaned);
                              setEditMinTxnUsd(Number.isNaN(num) ? 0 : num);
                            }}
                            onBlur={() => {
                              if (!editMinTxnUsdInput || !editTxnLimitOn)
                                return;
                              setEditMinTxnUsdInput(editMinTxnUsd.toFixed(2));
                            }}
                            placeholder="No minimum"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[11px] font-medium text-slate-600">
                            Max
                          </span>
                          <input
                            type="text"
                            inputMode="decimal"
                            className={`w-full rounded-xl border border-transparent px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 ${disabledInputClass(
                              editTxnLimitOn
                            )}`}
                            value={editMaxTxnUsdInput}
                            disabled={!editTxnLimitOn}
                            onChange={(e) => {
                              const raw = e.target.value;
                              setEditMaxTxnUsdInput(raw);
                              const cleaned = raw.replace(/,/g, "");
                              const num = parseFloat(cleaned);
                              setEditMaxTxnUsd(Number.isNaN(num) ? 0 : num);
                            }}
                            onBlur={() => {
                              if (!editMaxTxnUsdInput || !editTxnLimitOn)
                                return;
                              setEditMaxTxnUsdInput(editMaxTxnUsd.toFixed(2));
                            }}
                            placeholder="No maximum"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white border border-slate-200/80 p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            Utilization Limit
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Limit total spend for a given time frame.
                          </p>
                        </div>
                        {renderLimitToggle(editUtilLimitOn, setEditUtilLimitOn)}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <span className="text-[11px] font-medium text-slate-600">
                            Limit amount (USD)
                          </span>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            className={`w-full rounded-xl border border-transparent px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 ${disabledInputClass(
                              editUtilLimitOn
                            )}`}
                            value={editDailyLimitUsd}
                            disabled={!editUtilLimitOn}
                            onChange={(e) => {
                              const num = parseFloat(e.target.value);
                              setEditDailyLimitUsd(Number.isNaN(num) ? 0 : num);
                            }}
                          />
                        </div>

                        <div className="space-y-1">
                          <span className="text-[11px] font-medium text-slate-600">
                            Timeframe
                          </span>
                          <select
                            className={`w-full rounded-xl border border-transparent px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 ${disabledInputClass(
                              editUtilLimitOn
                            )}`}
                            value={editUtilPreset}
                            disabled={!editUtilLimitOn}
                            onChange={(e) =>
                              setEditUtilPreset(
                                e.target.value as UtilizationPreset
                              )
                            }
                          >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="rounded-2xl bg-white border border-slate-200/80 p-4 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-slate-900">
                            Country Rule
                          </span>
                          <span className="text-[10px] text-slate-400">
                            allowlist by country
                          </span>
                        </div>
                        {metaLoading && countries.length === 0 ? (
                          <p className="text-[11px] text-slate-400">
                            Loading countries...
                          </p>
                        ) : (
                          renderCountriesChips(
                            editCountriesAllow,
                            setEditCountriesAllow
                          )
                        )}
                      </div>

                      <div className="rounded-2xl bg-white border border-slate-200/80 p-4 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-slate-900">
                            MCC Rule
                          </span>
                          <span className="text-[10px] text-slate-400">
                            allowlist by MCC
                          </span>
                        </div>
                        {metaLoading && mccCodes.length === 0 ? (
                          <p className="text-[11px] text-slate-400">
                            Loading MCC codes...
                          </p>
                        ) : (
                          renderMccChips(
                            editMccCodesAllow,
                            setEditMccCodesAllow
                          )
                        )}
                      </div>

                      <div className="rounded-2xl bg-white border border-slate-200/80 p-4 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-slate-900">
                            Merchant Categories
                          </span>
                          <span className="text-[10px] text-slate-400">
                            allowlist by category
                          </span>
                        </div>
                        {metaLoading && merchantCategories.length === 0 ? (
                          <p className="text-[11px] text-slate-400">
                            Loading merchant categories...
                          </p>
                        ) : (
                          renderMerchantCategoryChips(
                            editMerchantCategories,
                            setEditMerchantCategories
                          )
                        )}
                      </div>

                      <div className="rounded-2xl bg-white border border-slate-200/80 p-4 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-slate-900">
                            Merchants
                          </span>
                          <span className="text-[10px] text-slate-400">
                            search Slash merchants
                          </span>
                        </div>

                        <input
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                          placeholder="Type at least 3 characters..."
                          value={merchantSearchQuery}
                          onChange={(e) =>
                            setMerchantSearchQuery(e.target.value)
                          }
                        />

                        {merchantSearching && (
                          <p className="text-[11px] text-slate-400 mt-1">
                            Searching merchants...
                          </p>
                        )}

                        {merchantSearchResult.length > 0 && (
                          <div className="max-h-28 overflow-auto rounded-xl border border-slate-200 bg-white px-2 py-2 space-y-1 mt-1">
                            {merchantSearchResult.map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                className="w-full text-left text-[11px] text-slate-700 hover:bg-indigo-50 rounded-lg px-2 py-1 flex justify-between gap-2"
                                onClick={() => addMerchantToEdit(m)}
                              >
                                <span>{m.name || m.id}</span>
                                <span className="text-slate-400 text-[10px]">
                                  {m.id}
                                </span>
                              </button>
                            ))}

                            {merchantSearchCursor && (
                              <button
                                type="button"
                                onClick={loadMoreMerchants}
                                className="mt-1 w-full text-center text-[11px] text-indigo-600 hover:text-indigo-800"
                              >
                                Load more...
                              </button>
                            )}
                          </div>
                        )}

                        {renderMerchantSelectedChips(
                          editMerchantIds,
                          setEditMerchantIds
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="mt-3 mb-1 w-full rounded-xl bg-[#311BFF] py-2.5 text-sm font-semibold text-white shadow-md hover:bg-[#2612e8] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Update
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
