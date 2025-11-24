import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContextProvider";
import { Account, CardGroup, VirtualAccount } from "../../types/Types";
import { cardGroupApi } from "../../api/api.cardgroup";
import { virtualAccountApi } from "../../api/api.virtualaccout";
import { toast } from "react-toastify";

interface Props {
  pageSize?: number;
}

export const CardGroupManager: React.FC<Props> = ({ pageSize = 10 }) => {
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
  const [createName, setCreateName] = useState("");
  const [createVaId, setCreateVaId] = useState<number | null>(null);
  const [createDailyLimitUsd, setCreateDailyLimitUsd] = useState<number>(0);
  const [createMinTxnUsd, setCreateMinTxnUsd] = useState<number>(0);
  const [createMaxTxnUsd, setCreateMaxTxnUsd] = useState<number>(0);
  const [createDailyLimitUsdInput, setCreateDailyLimitUsdInput] =
    useState<string>("");
  const [createMinTxnUsdInput, setCreateMinTxnUsdInput] = useState<string>("");
  const [createMaxTxnUsdInput, setCreateMaxTxnUsdInput] = useState<string>("");
  const [createStartDate, setCreateStartDate] = useState<string>("");
  const [showEdit, setShowEdit] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CardGroup | null>(null);
  const [editName, setEditName] = useState("");
  const [editDailyLimitUsd, setEditDailyLimitUsd] = useState<number>(0);
  const [editMinTxnUsd, setEditMinTxnUsd] = useState<number>(0);
  const [editMaxTxnUsd, setEditMaxTxnUsd] = useState<number>(0);
  const [editStartDate, setEditStartDate] = useState<string>("");
  const [accountVirtualAccounts, setAccountVirtualAccounts] = useState<
    VirtualAccount[]
  >([]);
  const [loadingVa, setLoadingVa] = useState(false);

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

  const formatUsd = (cents?: number | null) => {
    if (cents == null) return "-";

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  };

  const [editMinTxnUsdInput, setEditMinTxnUsdInput] = useState<string>("");
  const [editMaxTxnUsdInput, setEditMaxTxnUsdInput] = useState<string>("");

  const usdToCents = (usd: number) => {
    if (!Number.isFinite(usd)) return 0;
    return Math.round(usd * 100);
  };

  const centsToUsd = (cents?: number | null) => {
    if (cents == null) return 0;
    return Number((cents / 100).toFixed(2));
  };

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

  const openCreateModal = () => {
    setCreateName("");

    // reset số
    setCreateDailyLimitUsd(0);
    setCreateMinTxnUsd(0);
    setCreateMaxTxnUsd(0);

    // reset input string
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
        preset: "daily",
      });

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
        preset: "daily",
      });

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

  if (loading) return <div>Check auth...</div>;
  if (!user) return <div>Not logged in</div>;

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-6">
        <div className="space-y-4">
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
                  {loadingVa ? "Loading VAs..." : "All Virtual Accounts"}
                </option>
                {accountVirtualAccounts.map((va) => (
                  <option key={va.id} value={va.id}>
                    {va.name || va.accountNumber || `VA #${va.id}`}
                  </option>
                ))}
              </select>

              <form onSubmit={handleSearchSubmit} className="flex items-center">
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
                              {/* <div className="text-[10px] text-slate-400">
                                Slash ID: {cg.slashId}
                              </div> */}
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

                        {/* Status */}
                        {/* <td className="px-4 py-3 text-center">
                          {cg.closed ? (
                            <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-semibold text-red-600">
                              Closed
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                              Active
                            </span>
                          )}
                        </td> */}

                        {/* Actions */}
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex items-center gap-1 sm:gap-2">
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
                <span className="font-semibold text-slate-800">{page + 1}</span>{" "}
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

      {/* CREATE MODAL */}
      {showCreate && (
        <div className="fixed inset-0 z-[999] bg-black/40">
          <div className="absolute left-1/2 top-1/2 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-[#f5f7ff] shadow-xl overflow-hidden px-4 sm:px-0">
            <div className="flex items-center justify-between px-5 py-4 bg-[#f5f7ff]">
              <h2 className="text-base font-semibold text-slate-900">
                Create Card Group
              </h2>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="text-pink-500 text-xl leading-none hover:text-pink-600"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleCreateSubmit}
              className="px-5 pb-5 pt-1 space-y-4"
            >
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">
                  Virtual Account:
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
                  Name:
                </label>
                <input
                  className="w-full rounded-xl border border-transparent bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Name card group"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols gap-3">
                {/* DAILY LIMIT */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">
                    Daily Limit (USD):
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full rounded-xl border border-transparent bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    value={createDailyLimitUsdInput}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setCreateDailyLimitUsdInput(raw);

                      const cleaned = raw.replace(/,/g, "");
                      const num = parseFloat(cleaned);
                      setCreateDailyLimitUsd(Number.isNaN(num) ? 0 : num);
                    }}
                    onBlur={() => {
                      if (!createDailyLimitUsdInput) return;
                      setCreateDailyLimitUsdInput(
                        createDailyLimitUsd.toFixed(2)
                      );
                    }}
                    placeholder="0.00"
                  />
                </div>

                {/* MIN TXN */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">
                    Minimum Transaction (USD):
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full rounded-xl border border-transparent bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    value={createMinTxnUsdInput}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setCreateMinTxnUsdInput(raw);

                      const cleaned = raw.replace(/,/g, "");
                      const num = parseFloat(cleaned);
                      setCreateMinTxnUsd(Number.isNaN(num) ? 0 : num);
                    }}
                    onBlur={() => {
                      if (!createMinTxnUsdInput) return;
                      setCreateMinTxnUsdInput(createMinTxnUsd.toFixed(2));
                    }}
                    placeholder="0.00"
                  />
                </div>

                {/* MAX TXN */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">
                    Maximum Transaction (USD):
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full rounded-xl border border-transparent bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    value={createMaxTxnUsdInput}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setCreateMaxTxnUsdInput(raw);

                      const cleaned = raw.replace(/,/g, "");
                      const num = parseFloat(cleaned);
                      setCreateMaxTxnUsd(Number.isNaN(num) ? 0 : num);
                    }}
                    onBlur={() => {
                      if (!createMaxTxnUsdInput) return;
                      setCreateMaxTxnUsdInput(createMaxTxnUsd.toFixed(2));
                    }}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">
                  Start Date:
                </label>
                <input
                  type="date"
                  className="w-full rounded-xl border border-transparent bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  value={createStartDate}
                  onChange={(e) => setCreateStartDate(e.target.value)}
                />
              </div>

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

      {/* EDIT MODAL */}
      {showEdit && editingGroup && (
        <div className="fixed inset-0 z-[999] bg-black/40">
          <div className="absolute left-1/2 top-1/2 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-[#f5f7ff] shadow-xl overflow-hidden px-4 sm:px-0">
            <div className="flex items-center justify-between px-5 py-4 bg-[#f5f7ff]">
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

            <form
              onSubmit={handleEditSubmit}
              className="px-5 pb-5 pt-1 space-y-4"
            >
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">
                  Name:
                </label>
                <input
                  className="w-full rounded-xl border border-transparent bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">
                    Daily Limit (USD):
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className="w-full rounded-xl border border-transparent bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    value={editDailyLimitUsd}
                    onChange={(e) => {
                      const val = e.target.value;
                      const num = parseFloat(val);
                      setEditDailyLimitUsd(Number.isNaN(num) ? 0 : num);
                    }}
                  />
                </div>

                {/* MIN */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">
                    Minimum Transaction (USD):
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full rounded-xl border border-transparent bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    value={editMinTxnUsdInput}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setEditMinTxnUsdInput(raw);

                      const cleaned = raw.replace(/,/g, "");
                      const num = parseFloat(cleaned);
                      setEditMinTxnUsd(Number.isNaN(num) ? 0 : num);
                    }}
                    onBlur={() => {
                      if (!editMinTxnUsdInput) return;
                      setEditMinTxnUsdInput(editMinTxnUsd.toFixed(2));
                    }}
                    placeholder="0.00"
                  />
                </div>

                {/* MAX */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">
                    Maximum Transaction (USD):
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full rounded-xl border border-transparent bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    value={editMaxTxnUsdInput}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setEditMaxTxnUsdInput(raw);

                      const cleaned = raw.replace(/,/g, "");
                      const num = parseFloat(cleaned);
                      setEditMaxTxnUsd(Number.isNaN(num) ? 0 : num);
                    }}
                    onBlur={() => {
                      if (!editMaxTxnUsdInput) return;
                      setEditMaxTxnUsdInput(editMaxTxnUsd.toFixed(2));
                    }}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">
                  Start Date:
                </label>
                <input
                  type="date"
                  className="w-full rounded-xl border border-transparent bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                />
              </div>

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
