import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContextProvider";
import {
  Account,
  CardsGroupsDTO,
  VirtualAccount,
  Merchant,
  MerchantCategory,
  MerchantSearchResponse,
  CardGroupSpendingConstraintParam,
  CardGroupRestrictionType,
} from "../../types/Types";
import { cardGroupApi } from "../../api/api.cardgroup";
import { virtualAccountApi } from "../../api/api.virtualaccout";
import { merchantApi } from "../../api/api.merchant";

interface Props {
  pageSize?: number;
}

type RuleMode = "OFF" | "ALLOWED" | "BLOCKED";

const toggleStringInArray = (arr: string[], value: string): string[] =>
  arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];

export const CardGroupManager: React.FC<Props> = ({ pageSize = 10 }) => {
  const { user, loading } = useAuth();

  // ======================== LIST / BASIC STATE ========================
  const [selectedVaId, setSelectedVaId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [data, setData] = useState<CardsGroupsDTO[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [search, setSearch] = useState("");

  // CREATE
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createVaId, setCreateVaId] = useState<number | null>(null);
  const [createDailyLimitUsd, setCreateDailyLimitUsd] = useState<number>(0);
  const [createMinTxnUsd, setCreateMinTxnUsd] = useState<number>(0);
  const [createMaxTxnUsd, setCreateMaxTxnUsd] = useState<number>(0);
  const [createDailyLimitUsdInput, setCreateDailyLimitUsdInput] =
    useState<string>("");
  const [createMinTxnUsdInput, setCreateMinTxnUsdInput] =
    useState<string>("");
  const [createMaxTxnUsdInput, setCreateMaxTxnUsdInput] =
    useState<string>("");
  const [createStartDate, setCreateStartDate] = useState<string>("");

  // EDIT BASIC
  const [showEdit, setShowEdit] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CardsGroupsDTO | null>(
    null
  );
  const [editName, setEditName] = useState("");
  const [editDailyLimitUsd, setEditDailyLimitUsd] = useState<number>(0);
  const [editMinTxnUsd, setEditMinTxnUsd] = useState<number>(0);
  const [editMaxTxnUsd, setEditMaxTxnUsd] = useState<number>(0);
  const [editStartDate, setEditStartDate] = useState<string>("");
  const [editMinTxnUsdInput, setEditMinTxnUsdInput] = useState<string>("");
  const [editMaxTxnUsdInput, setEditMaxTxnUsdInput] = useState<string>("");

  // VIRTUAL ACCOUNTS
  const [accountVirtualAccounts, setAccountVirtualAccounts] = useState<
    VirtualAccount[]
  >([]);
  const [loadingVa, setLoadingVa] = useState(false);

  // ======================== LIMITS MODAL STATE ========================
  const [showLimits, setShowLimits] = useState(false);
  const [limitsGroup, setLimitsGroup] = useState<CardsGroupsDTO | null>(
    null
  );
  const [limitsLoading, setLimitsLoading] = useState(false);
  const [limitsSaving, setLimitsSaving] = useState(false);
  const [initialConstraint, setInitialConstraint] =
    useState<CardGroupSpendingConstraintParam | null>(null);

  // META (merchant categories)
  const [metaLoading, setMetaLoading] = useState(false);
  const [merchantCategories, setMerchantCategories] = useState<
    MerchantCategory[]
  >([]);

  // RULE MODES
  const [merchantCategoryMode, setMerchantCategoryMode] =
    useState<RuleMode>("OFF");
  const [merchantMode, setMerchantMode] = useState<RuleMode>("OFF");

  // SELECTED VALUES
  const [selectedMerchantCategoryIds, setSelectedMerchantCategoryIds] =
    useState<string[]>([]);
  const [selectedMerchantIds, setSelectedMerchantIds] = useState<string[]>(
    []
  );

  // MERCHANT SEARCH
  const [merchantSearchQuery, setMerchantSearchQuery] = useState("");
  const [merchantSearchLoading, setMerchantSearchLoading] =
    useState(false);
  const [merchantSearchCursor, setMerchantSearchCursor] = useState<
    string | null
  >(null);
  const [merchantResults, setMerchantResults] = useState<Merchant[]>([]);

  // ======================== COMMON HELPERS ========================

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
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
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

  // ======================== LOAD VIRTUAL ACCOUNTS ========================

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
          setCreateVaId(res.content[0].id);
        } else if (
          createVaId &&
          !res.content.some((v: VirtualAccount) => v.id === createVaId)
        ) {
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

  // ======================== LOAD CARD GROUP LIST ========================

  const loadData = async (
    accountId: number,
    pageIndex: number,
    vaId?: number | null,
    keyword?: string
  ) => {
    setFetching(true);
    try {
      const vaFilter =
        typeof vaId === "number" && Number.isFinite(vaId)
          ? vaId
          : undefined;

      const res = await cardGroupApi.getByAccountPaged(
        accountId,
        pageIndex,
        pageSize,
        vaFilter,
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
        typeof res.totalPages === "number" &&
        Number.isFinite(res.totalPages)
          ? res.totalPages
          : typeof (res as any).total_pages === "number"
          ? (res as any).total_pages
          : 0;

      setPage(currentPage >= 0 ? currentPage : 0);
      setTotalPages(tp);
    } catch (err: any) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || "Unable to load card groups"
      );
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

  // ======================== SEARCH & SYNC ========================

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeAccountId == null) {
      toast.error("No account selected");
      return;
    }
    setPage(0);
    await loadData(activeAccountId, 0, selectedVaId, search);
  };

  const handleSync = async () => {
    if (activeAccountId == null) return;
    setSyncing(true);
    try {
      // Nếu user chọn VA thì sync theo VA, còn không thì sync theo account
      if (selectedVaId) {
        await cardGroupApi.syncByVirtualAccount(selectedVaId);
      } else {
        await cardGroupApi.syncAccount(activeAccountId);
      }

      setPage(0);
      await loadData(activeAccountId, 0, selectedVaId, search);
      toast.success("Sync card groups successful");
    } catch (err: any) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || "Sync card groups failed"
      );
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

  // ======================== CREATE ========================

  const openCreateModal = () => {
    setCreateName("");

    setCreateDailyLimitUsd(0);
    setCreateMinTxnUsd(0);
    setCreateMaxTxnUsd(0);

    setCreateDailyLimitUsdInput("");
    setCreateMinTxnUsdInput("");
    setCreateMaxTxnUsdInput("");

    setCreateStartDate("");

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

      await cardGroupApi.createCardGroup(activeAccountId, {
        virtualAccountId: createVaId,
        name: createName.trim(),
        dailyLimitCents: usdToCents(Number(createDailyLimitUsd) || 0),
        minTransactionCents: usdToCents(Number(createMinTxnUsd) || 0),
        maxTransactionCents: usdToCents(Number(createMaxTxnUsd) || 0),
        startDate: createStartDate || null,
        timezone: "UTC",
      });

      toast.success("Create card group successful");
      setShowCreate(false);
      if (activeAccountId != null) {
        setPage(0);
        await loadData(activeAccountId, 0, selectedVaId, search);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || "Unable to create card group"
      );
    } finally {
      setCreating(false);
    }
  };

  // ======================== EDIT BASIC INFO ========================

  const openEditModal = (cg: CardsGroupsDTO) => {
    setEditingGroup(cg);
    setEditName(cg.name ?? "");

    const minUsd = centsToUsd(cg.minTransactionCents);
    const maxUsd = centsToUsd(cg.maxTransactionCents);

    setEditDailyLimitUsd(centsToUsd(cg.dailyLimitCents));
    setEditMinTxnUsd(minUsd);
    setEditMaxTxnUsd(maxUsd);

    setEditMinTxnUsdInput(minUsd > 0 ? minUsd.toFixed(2) : "");
    setEditMaxTxnUsdInput(maxUsd > 0 ? maxUsd.toFixed(2) : "");

    setEditStartDate(cg.startDate ?? "");
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
      await cardGroupApi.updateCardGroup(editingGroup.id, {
        name: editName.trim(),
        dailyLimitCents: usdToCents(Number(editDailyLimitUsd) || 0),
        minTransactionCents: usdToCents(Number(editMinTxnUsd) || 0),
        maxTransactionCents: usdToCents(Number(editMaxTxnUsd) || 0),
        startDate: editStartDate || null,
        timezone: "UTC",
      });

      toast.success("Update card group successful");
      if (activeAccountId != null) {
        await loadData(activeAccountId, page, selectedVaId, search);
      }
      setShowEdit(false);
    } catch (err: any) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || "Unable to update card group"
      );
    }
  };

  // ======================== LIMITS MODAL: META LOAD ========================

  useEffect(() => {
    if (!showLimits) return;

    const loadMeta = async () => {
      try {
        setMetaLoading(true);
        const catRes = await merchantApi.getAllCategories();
        setMerchantCategories(catRes);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load metadata");
      } finally {
        setMetaLoading(false);
      }
    };

    loadMeta();
  }, [showLimits]);

  // ======================== LIMITS MODAL: INIT FROM CARD GROUP DTO ========================

  const openLimitsModal = async (cg: CardsGroupsDTO) => {
    setLimitsGroup(cg);
    setShowLimits(true);
    setInitialConstraint(null);
    setMerchantCategoryMode("OFF");
    setMerchantMode("OFF");
    setSelectedMerchantCategoryIds([]);
    setSelectedMerchantIds([]);
    setMerchantSearchQuery("");
    setMerchantResults([]);
    setMerchantSearchCursor(null);

    try {
      setLimitsLoading(true);

      const constraint: CardGroupSpendingConstraintParam = {
        merchantCategories: cg.merchantCategories ?? null,
        merchantCategoryRestriction:
          (cg.merchantCategoryRestriction as any) ?? null,
        merchantIds: cg.merchantIds ?? null,
        merchantNamesAllow: cg.merchantNamesAllow ?? null,
        merchantRestriction: (cg.merchantRestriction as any) ?? null,
      };

      setInitialConstraint(constraint);
    } catch (err: any) {
      console.error(err);
      toast.error(
        err?.response?.data?.message ||
          "Failed to load card group limits (using defaults)"
      );
      setInitialConstraint(null);
    } finally {
      setLimitsLoading(false);
    }
  };

  useEffect(() => {
    if (!showLimits) return;

    const c = initialConstraint;

    // Merchant categories
    if (
      c &&
      c.merchantCategories &&
      c.merchantCategories.length > 0 &&
      c.merchantCategoryRestriction
    ) {
      const r = c.merchantCategoryRestriction as CardGroupRestrictionType;

      setMerchantCategoryMode(
        r === "allowlist" ? "ALLOWED" : "BLOCKED"
      );
      setSelectedMerchantCategoryIds(c.merchantCategories.map(String));
    } else {
      setMerchantCategoryMode("OFF");
      setSelectedMerchantCategoryIds([]);
    }

    // Merchants
    if (
      c &&
      c.merchantIds &&
      c.merchantIds.length > 0 &&
      c.merchantRestriction
    ) {
      const r = c.merchantRestriction as CardGroupRestrictionType;

      setMerchantMode(r === "allowlist" ? "ALLOWED" : "BLOCKED");
      setSelectedMerchantIds(c.merchantIds);
    } else {
      setMerchantMode("OFF");
      setSelectedMerchantIds([]);
    }

    setMerchantSearchQuery("");
    setMerchantResults([]);
    setMerchantSearchCursor(null);
  }, [showLimits, initialConstraint]);

  // ======================== LIMITS MODAL: MERCHANT SEARCH ========================

  const handleSearchMerchants = async (cursor?: string | null) => {
    if (!merchantSearchQuery.trim()) {
      setMerchantResults([]);
      setMerchantSearchCursor(null);
      return;
    }

    if (!activeAccountId) {
      toast.error("No account selected for merchant search");
      return;
    }

    try {
      setMerchantSearchLoading(true);
      const res: MerchantSearchResponse = await merchantApi.searchMerchants(
        activeAccountId,
        merchantSearchQuery.trim(),
        cursor ?? undefined,
        undefined
      );

      setMerchantResults(res.items ?? []);
      setMerchantSearchCursor(res.metadata?.nextCursor ?? null);
    } catch (err: any) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || "Failed to search merchants"
      );
    } finally {
      setMerchantSearchLoading(false);
    }
  };

  // ======================== LIMITS MODAL: BUILD PAYLOAD ========================

  const buildPayloadFromState = (): CardGroupSpendingConstraintParam => {
    const payload: CardGroupSpendingConstraintParam = {};

    // Merchant categories
    if (
      merchantCategoryMode !== "OFF" &&
      selectedMerchantCategoryIds.length > 0
    ) {
      payload.merchantCategories = selectedMerchantCategoryIds;
      payload.merchantCategoryRestriction =
        merchantCategoryMode === "ALLOWED"
          ? "allowlist"
          : "denylist";
    }

    // Merchants
    if (merchantMode !== "OFF" && selectedMerchantIds.length > 0) {
      payload.merchantIds = selectedMerchantIds;
      payload.merchantRestriction =
        merchantMode === "ALLOWED" ? "allowlist" : "denylist";
    }

    return payload;
  };

  const handleSaveLimits = async () => {
    if (!limitsGroup) return;
    try {
      setLimitsSaving(true);
      const payload = buildPayloadFromState();
      await cardGroupApi.patchSpendingConstraint(limitsGroup.id, payload);
      toast.success("Saved card group limits successfully");
      setShowLimits(false);
      // reload list cho chắc
      if (activeAccountId != null) {
        await loadData(activeAccountId, page, selectedVaId, search);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(
        err?.response?.data?.message ||
          "Failed to save card group limits"
      );
    } finally {
      setLimitsSaving(false);
    }
  };

  // ======================== UTILS ========================

  const findVaName = (
    id: number | null,
    cg?: CardsGroupsDTO
  ): string => {
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

  if (loading) return <div>Check auth...</div>;
  if (!user) return <div>Not logged in</div>;

  // ======================== RENDER ========================
  return (
    <>
      {/* MAIN CARD */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-6">
        <div className="space-y-4">
          {/* Header / Filters */}
          <div className="flex flex-wrap items-center gap-3 justify-between mb-2">
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-gray-600">
              <div className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800">
                <span className="font-semibold">Account:</span>{" "}
                <span>
                  {activeAccount ? activeAccount.name : "No account selected"}
                </span>
              </div>

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
                  {loadingVa
                    ? "Loading virtual accounts..."
                    : "Filter by virtual account (optional)"}
                </option>
                {accountVirtualAccounts.map((va) => (
                  <option key={va.id} value={va.id}>
                    {va.name || va.accountNumber || `VA #${va.id}`}
                  </option>
                ))}
              </select>

              <form
                onSubmit={handleSearchSubmit}
                className="flex items-center"
              >
                <input
                  className="rounded-l-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder="Search name..."
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

            <div className="flex flex-wrap items-center gap-2">
              <button
                className="px-4 py-2 text-sm rounded-xl bg-emerald-500 text-white disabled:opacity-60 shadow-sm hover:bg-emerald-600 transition"
                onClick={openCreateModal}
                disabled={activeAccountId == null || loadingVa}
              >
                + Create Card Group
              </button>

              <button
                className="px-4 py-2 text-sm rounded-xl bg-blue-600 text-white disabled:opacity-60 shadow-sm hover:bg-blue-700 transition"
                onClick={handleSync}
                disabled={syncing || activeAccountId == null}
              >
                {syncing ? "Syncing..." : "Sync Card Groups"}
              </button>
            </div>
          </div>

          {/* TABLE */}
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
                      Min Txn
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Max Txn
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Start Date
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {fetching ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-4 text-center text-xs text-slate-500"
                      >
                        Loading card groups...
                      </td>
                    </tr>
                  ) : data.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
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
                        {/* Name */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-semibold text-indigo-700">
                              {cg.name?.[0]?.toUpperCase() || "C"}
                            </div>
                            <div>
                              <div className="text-xs sm:text-sm font-medium text-slate-900">
                                {cg.name ?? "-"}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* VA */}
                        <td className="px-4 py-3">
                          <div className="text-xs sm:text-sm text-slate-900">
                            {findVaName(cg.virtualAccountId, cg)}
                          </div>
                        </td>

                        {/* Daily limit */}
                        <td className="px-4 py-3 text-center">
                          <div className="text-xs sm:text-sm font-semibold text-slate-900">
                            {formatUsd(cg.dailyLimitCents)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            per day
                          </div>
                        </td>

                        {/* Min txn */}
                        <td className="px-4 py-3 text-center">
                          <div className="text-xs sm:text-sm font-medium text-slate-800">
                            {formatUsd(cg.minTransactionCents)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            minimum
                          </div>
                        </td>

                        {/* Max txn */}
                        <td className="px-4 py-3 text-center">
                          <div className="text-xs sm:text-sm font-medium text-slate-800">
                            {formatUsd(cg.maxTransactionCents)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            maximum
                          </div>
                        </td>

                        {/* Start date */}
                        <td className="px-4 py-3 text-center">
                          <div className="text-xs sm:text-sm font-medium text-slate-800">
                            {cg.startDate ?? "-"}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex items-center gap-1 sm:gap-2">
                            <button
                              className="inline-flex items-center gap-1 rounded-full bg-sky-500 px-2.5 py-1 text-[11px] font-medium text-white shadow-sm hover:bg-sky-600 transition"
                              onClick={() => openEditModal(cg)}
                            >
                              <span className="hidden sm:inline">
                                Edit
                              </span>
                              <span className="sm:hidden">✏️</span>
                            </button>

                            <button
                              className="inline-flex items-center gap-1 rounded-full bg-indigo-500 px-2.5 py-1 text-[11px] font-medium text-white shadow-sm hover:bg-indigo-600 transition"
                              onClick={() => openLimitsModal(cg)}
                            >
                              <span className="hidden sm:inline">
                                Limits
                              </span>
                              <span className="sm:hidden">⚙️</span>
                            </button>

                            <button
                              className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-1 text-[11px] font-medium text-white shadow-sm hover:bg-red-600 transition"
                              onClick={() => handleDelete(cg.id)}
                            >
                              <span className="hidden sm:inline">
                                Delete
                              </span>
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

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 bg-white/80 px-4 py-3">
              <p className="text-[11px] sm:text-xs text-slate-500">
                Page{" "}
                <span className="font-semibold text-slate-800">
                  {page + 1}
                </span>{" "}
                of{" "}
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
        </div>
      </div>

      {/* ======================== CREATE MODAL ======================== */}
      {showCreate && (
        <div className="fixed inset-0 z-[999] bg-black/40 flex items-center justify-center">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-900">
                Create Card Group
              </h2>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="text-slate-400 text-xl leading-none hover:text-slate-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="px-6 py-4 space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Name
                  </label>
                  <input
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="Card group name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Virtual Account
                  </label>
                  <select
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 bg-white"
                    value={createVaId ?? ""}
                    onChange={(e) =>
                      setCreateVaId(
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                  >
                    <option value="">Select a virtual account</option>
                    {accountVirtualAccounts.map((va) => (
                      <option key={va.id} value={va.id}>
                        {va.name || va.accountNumber || `VA #${va.id}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Daily limit (USD)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                      value={createDailyLimitUsdInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCreateDailyLimitUsdInput(val);
                        const num = parseFloat(val);
                        setCreateDailyLimitUsd(
                          Number.isFinite(num) ? num : 0
                        );
                      }}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Min Txn (USD)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                      value={createMinTxnUsdInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCreateMinTxnUsdInput(val);
                        const num = parseFloat(val);
                        setCreateMinTxnUsd(
                          Number.isFinite(num) ? num : 0
                        );
                      }}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Max Txn (USD)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                      value={createMaxTxnUsdInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCreateMaxTxnUsdInput(val);
                        const num = parseFloat(val);
                        setCreateMaxTxnUsd(
                          Number.isFinite(num) ? num : 0
                        );
                      }}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Start date (yyyy-MM-dd)
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                    value={createStartDate}
                    onChange={(e) => setCreateStartDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => setShowCreate(false)}
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                  disabled={creating}
                >
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================== EDIT MODAL ======================== */}
      {showEdit && editingGroup && (
        <div className="fixed inset-0 z-[999] bg-black/40 flex items-center justify-center">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-900">
                Edit Card Group – {editingGroup.name ?? `#${editingGroup.id}`}
              </h2>
              <button
                type="button"
                onClick={() => setShowEdit(false)}
                className="text-slate-400 text-xl leading-none hover:text-slate-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="px-6 py-4 space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Name
                  </label>
                  <input
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Card group name"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Daily limit (USD)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                      value={editDailyLimitUsd}
                      onChange={(e) => {
                        const num = parseFloat(e.target.value);
                        setEditDailyLimitUsd(
                          Number.isFinite(num) ? num : 0
                        );
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Min Txn (USD)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                      value={editMinTxnUsdInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditMinTxnUsdInput(val);
                        const num = parseFloat(val);
                        setEditMinTxnUsd(Number.isFinite(num) ? num : 0);
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Max Txn (USD)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                      value={editMaxTxnUsdInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditMaxTxnUsdInput(val);
                        const num = parseFloat(val);
                        setEditMaxTxnUsd(Number.isFinite(num) ? num : 0);
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Start date (yyyy-MM-dd)
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                    value={editStartDate || ""}
                    onChange={(e) => setEditStartDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => setShowEdit(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================== LIMITS MODAL ======================== */}
      {showLimits && limitsGroup && (
        <div className="fixed inset-0 z-[999] bg-black/40 flex items-center justify-center">
          <div className="w-full max-w-4xl rounded-3xl bg-[#f5f7ff] shadow-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/70 bg-white/80">
              <h2 className="text-base font-semibold text-slate-900">
                Card Group Limits – {limitsGroup.name ?? `#${limitsGroup.id}`}
              </h2>
              <button
                type="button"
                onClick={() => setShowLimits(false)}
                className="text-pink-500 text-xl leading-none hover:text-pink-600"
              >
                ×
              </button>
            </div>

            <div className="flex flex-col md:flex-row">
              {/* LEFT: rules */}
              <div className="flex-1 px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
                {limitsLoading && (
                  <div className="text-xs text-slate-500 mb-2">
                    Loading current limits...
                  </div>
                )}
                {metaLoading && (
                  <div className="text-xs text-slate-500 mb-2">
                    Loading metadata...
                  </div>
                )}

                {/* Merchant Categories */}
                <div className="rounded-2xl bg-white border border-slate-200 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        Merchant Categories
                      </div>
                      <div className="text-xs text-slate-500">
                        Configure which merchant categories are allowed or
                        blocked.
                      </div>
                    </div>
                    <div className="inline-flex text-[11px] bg-slate-100 rounded-full p-0.5">
                      {(["OFF", "BLOCKED", "ALLOWED"] as RuleMode[]).map(
                        (mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() =>
                              setMerchantCategoryMode(mode)
                            }
                            className={`px-3 py-1 rounded-full ${
                              merchantCategoryMode === mode
                                ? mode === "OFF"
                                  ? "bg-white text-slate-800 shadow-sm"
                                  : mode === "ALLOWED"
                                  ? "bg-emerald-500 text-white shadow-sm"
                                  : "bg-red-500 text-white shadow-sm"
                                : "text-slate-500"
                            }`}
                          >
                            {mode === "OFF"
                              ? "Off"
                              : mode === "ALLOWED"
                              ? "Allowed"
                              : "Blocked"}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {merchantCategoryMode !== "OFF" && (
                    <div className="mt-3 border-t border-slate-100 pt-3">
                      <div className="text-[11px] text-slate-500 mb-2">
                        Select merchant categories:
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {merchantCategories.length === 0 ? (
                          <div className="text-xs text-slate-400">
                            No categories loaded.
                          </div>
                        ) : (
                          merchantCategories.map((cat) => {
                            const id = cat.slashId;
                            const checked =
                              selectedMerchantCategoryIds.includes(id);
                            return (
                              <label
                                key={id}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  className="rounded border-slate-300"
                                  checked={checked}
                                  onChange={() =>
                                    setSelectedMerchantCategoryIds(
                                      (prev) =>
                                        toggleStringInArray(prev, id)
                                    )
                                  }
                                />
                                <span className="text-xs text-slate-800">
                                  {cat.name}
                                </span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Merchants */}
                <div className="rounded-2xl bg-white border border-slate-200 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        Merchants
                      </div>
                      <div className="text-xs text-slate-500">
                        Limit spend to specific merchants or block some.
                      </div>
                    </div>
                    <div className="inline-flex text-[11px] bg-slate-100 rounded-full p-0.5">
                      {(["OFF", "BLOCKED", "ALLOWED"] as RuleMode[]).map(
                        (mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setMerchantMode(mode)}
                            className={`px-3 py-1 rounded-full ${
                              merchantMode === mode
                                ? mode === "OFF"
                                  ? "bg-white text-slate-800 shadow-sm"
                                  : mode === "ALLOWED"
                                  ? "bg-emerald-500 text-white shadow-sm"
                                  : "bg-red-500 text-white shadow-sm"
                                : "text-slate-500"
                            }`}
                          >
                            {mode === "OFF"
                              ? "Off"
                              : mode === "ALLOWED"
                              ? "Allowed"
                              : "Blocked"}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {merchantMode !== "OFF" && (
                    <div className="mt-3 border-t border-slate-100 pt-3 space-y-2">
                      <div className="text-[11px] text-slate-500">
                        Search and select merchants:
                      </div>
                      <div className="flex gap-2">
                        <input
                          className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                          placeholder="Type at least 3 characters to search merchant..."
                          value={merchantSearchQuery}
                          onChange={(e) =>
                            setMerchantSearchQuery(e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleSearchMerchants();
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleSearchMerchants()}
                          className="px-3 py-1.5 rounded-xl bg-indigo-500 text-white text-xs font-medium hover:bg-indigo-600"
                          disabled={merchantSearchLoading}
                        >
                          {merchantSearchLoading
                            ? "Searching..."
                            : "Search"}
                        </button>
                      </div>

                      <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-xl p-2 space-y-1">
                        {merchantResults.length === 0 ? (
                          <div className="text-xs text-slate-400">
                            No merchants loaded.
                          </div>
                        ) : (
                          merchantResults.map((m) => {
                            const id = String(m.id);
                            const checked =
                              selectedMerchantIds.includes(id);
                            return (
                              <label
                                key={id}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  className="rounded border-slate-300"
                                  checked={checked}
                                  onChange={() =>
                                    setSelectedMerchantIds((prev) =>
                                      toggleStringInArray(prev, id)
                                    )
                                  }
                                />
                                <span className="text-xs text-slate-800">
                                  {m.name}
                                </span>
                              </label>
                            );
                          })
                        )}
                        {merchantSearchCursor && (
                          <button
                            type="button"
                            onClick={() =>
                              handleSearchMerchants(
                                merchantSearchCursor
                              )
                            }
                            className="mt-1 text-[11px] text-indigo-600 hover:underline"
                          >
                            Load more…
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT: actions */}
              <div className="w-full md:w-64 border-t md:border-t-0 md:border-l border-slate-200 bg-white/80 px-5 py-4 flex flex-col justify-between">
                <div className="space-y-2 text-xs text-slate-600">
                  <p className="font-semibold text-slate-900 mb-1">
                    Summary
                  </p>
                  <p>
                    Configure advanced rules for this card group. If a
                    section is set to{" "}
                    <span className="font-semibold">Off</span>, no
                    additional limits will be applied for that dimension.
                  </p>
                </div>

                <div className="mt-4 space-y-2">
                  <button
                    type="button"
                    onClick={handleSaveLimits}
                    disabled={limitsSaving}
                    className="w-full rounded-xl bg-[#311BFF] py-2.5 text-sm font-semibold text-white shadow-md hover:bg-[#2612e8] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {limitsSaving ? "Saving..." : "Save limits"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLimits(false)}
                    disabled={limitsSaving}
                    className="w-full rounded-xl border border-slate-300 bg-white py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
