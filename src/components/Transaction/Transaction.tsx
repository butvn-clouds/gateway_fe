import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContextProvider";
import {
  Account,
  Card,
  VirtualAccount,
  Transaction,
  TransactionSearchResponse,
} from "../../types/Types";
import { virtualAccountApi } from "../../api/api.virtualaccout";
import { cardApi } from "../../api/api.card";
import { transactionApi } from "../../api/api.transaction";

interface Props {
  pageSize?: number;
}

export const TransactionManager: React.FC<Props> = ({ pageSize = 100 }) => {
  const { user, loading } = useAuth();

  // ====== AUTH / ACCOUNT ======
  const accounts: Account[] = useMemo(() => user?.accounts ?? [], [user]);

  const activeAccountId: number | null = useMemo(() => {
    if (!user) return null;
    if (user.activeAccount) return user.activeAccount.id;
    if (accounts.length > 0) return accounts[0].id;
    return null;
  }, [user, accounts]);

  const activeAccount: Account | null = useMemo(() => {
    if (!activeAccountId) return null;
    return accounts.find((a) => a.id === activeAccountId) || null;
  }, [accounts, activeAccountId]);

  // ====== FILTERS ======
  const [selectedCardId, setSelectedCardId] = useState<string>("");
  const [selectedVaId, setSelectedVaId] = useState<string>("");

  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const [searchTerm, setSearchTerm] = useState<string>("");

  // ====== DATA STATE ======
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [loadingTx, setLoadingTx] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [currentCursor, setCurrentCursor] = useState<string | null>(null);

  // ====== META: CARDS / VAs ======
  const [cards, setCards] = useState<Card[]>([]);
  const [virtualAccounts, setVirtualAccounts] = useState<VirtualAccount[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(false);

  // ====== SELECTION ======
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const allChecked =
    transactions.length > 0 &&
    selectedIds.length > 0 &&
    selectedIds.length === transactions.length;

  const toggleSelectAll = () => {
    if (allChecked) {
      setSelectedIds([]);
    } else {
      setSelectedIds(transactions.map((t) => t.id || ""));
    }
  };

  const toggleRow = (id?: string | null) => {
    if (!id) return;
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // ====== HELPERS ======
  const formatAmount = (amountCents?: number | null): string => {
    if (amountCents == null) return "-";
    const usd = amountCents / 100;
    const abs = Math.abs(usd).toFixed(2);
    const sign = usd < 0 ? "-" : "";
    return `${sign}${abs} USD`;
  };

  const formatDateTime = (iso?: string | null): string => {
    if (!iso) return "-";
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      return d.toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  const getCardLabel = (cardId?: string | null) => {
    if (!cardId) return "-";
    const c = cards.find(
      (x) => x.slashId === cardId || String(x.id) === String(cardId)
    );
    if (!c) return cardId;
    const suffix = c.last4 ? `**** ${c.last4}` : c.id ? `#${c.id}` : "";
    return c.name ? `${c.name} ${suffix}`.trim() : suffix || cardId;
  };

  const getVaName = (vaId?: string | null) => {
    if (!vaId) return "-";
    const v = virtualAccounts.find(
      (x) => x.slashId === vaId || String(x.id) === String(vaId)
    );
    if (!v) return vaId;
    return v.name || v.accountNumber || `VA #${v.id}`;
  };

  const handleDateClick = (e: React.MouseEvent<HTMLInputElement>) => {
    const input = e.currentTarget as HTMLInputElement & {
      showPicker?: () => void;
    };
    if (input.showPicker) input.showPicker();
  };

  // ====== LOAD META ======
  useEffect(() => {
    const loadMeta = async () => {
      if (!activeAccountId) {
        setCards([]);
        setVirtualAccounts([]);
        return;
      }
      try {
        setLoadingMeta(true);
        const [cardRes, vaRes] = await Promise.all([
          cardApi.getByAccountPaged(activeAccountId, 0, 1000, undefined),
          virtualAccountApi.getByAccountPaged(activeAccountId, 0, 1000, undefined),
        ]);
        setCards(cardRes.content || []);
        setVirtualAccounts(vaRes.content || []);
      } catch (err: any) {
        console.error(err);
        toast.error(
          err?.response?.data?.message || "Unable to load cards / virtual accounts"
        );
      } finally {
        setLoadingMeta(false);
      }
    };

    loadMeta();
  }, [activeAccountId]);

  // ====== LOAD TRANSACTIONS ======
  const fetchTransactions = async (cursor?: string | null, append = false) => {
    if (!activeAccountId) {
      toast.error("No account selected");
      return;
    }

    try {
      setLoadingTx(true);

      const params: any = {
        accountId: activeAccountId,
        cardId: selectedCardId || undefined,
        virtualAccountId: selectedVaId || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        cursor: cursor || undefined,
        pageSize,
      };

      const res: TransactionSearchResponse =
        await transactionApi.searchTransactions(activeAccountId, params);

      setTransactions((prev) =>
        append ? [...prev, ...(res.items || [])] : res.items || []
      );
      setTotalCount(res.count ?? null);
      setNextCursor(res.nextCursor ?? null);
      setCurrentCursor(cursor ?? null);
      setSelectedIds([]);
    } catch (err: any) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || "Unable to load transactions from Slash"
      );
    } finally {
      setLoadingTx(false);
    }
  };

  useEffect(() => {
    if (activeAccountId != null) {
      setSelectedCardId("");
      setSelectedVaId("");
      setFromDate("");
      setToDate("");
      setSearchTerm("");
      setCurrentCursor(null);
      setNextCursor(null);
      fetchTransactions(null, false);
    } else {
      setTransactions([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAccountId]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentCursor(null);
    setNextCursor(null);
    fetchTransactions(null, false);
  };

  const handleLoadMore = () => {
    if (!nextCursor) return;
    fetchTransactions(nextCursor, true);
  };

  // ====== SYNC BUTTON ======
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    if (!activeAccountId) return;
    try {
      setSyncing(true);
      setCurrentCursor(null);
      setNextCursor(null);
      await fetchTransactions(null, false);
      toast.success("Synced transactions from Slash");
    } finally {
      setSyncing(false);
    }
  };

  // ====== CLIENT SEARCH ======
  const displayTransactions = useMemo(() => {
    if (!searchTerm.trim()) return transactions;
    const q = searchTerm.toLowerCase();
    return transactions.filter((tx) => {
      const fields: (string | undefined | null)[] = [
        tx.description,
        tx.memo,
        tx.merchantDescription,
        tx.merchantData?.description,
        tx.merchantData?.location?.country,
        tx.merchantData?.location?.city,
        tx.cardId,
        tx.virtualAccountId,
      ];
      return fields.some((f) => f && f.toLowerCase().includes(q));
    });
  }, [transactions, searchTerm]);

  // ====== RENDER ======
  if (loading) return <div>Checking auth...</div>;
  if (!user) return <div>Not logged in</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Dashboard
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">
            Transactions
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {activeAccount && (
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              <span className="font-medium">{activeAccount.name}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleSync}
            disabled={syncing || loadingTx}
            className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-md transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {syncing ? (
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4l3.5-3.5L12 0v4a8 8 0 00-8 8h4z"
                />
              </svg>
            ) : (
              <svg
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4 4V1.5M4 4H1.5M4 4L2.5 2.5M16 4V1.5M16 4H18.5M16 4L17.5 2.5M4 16V18.5M4 16H1.5M4 16L2.5 17.5M16 16V18.5M16 16H18.5M16 16L17.5 17.5M6 10C6 8.34315 7.34315 7 9 7H11C12.6569 7 14 8.34315 14 10C14 11.6569 12.6569 13 11 13H10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            <span>{syncing ? "Syncing..." : "Sync"}</span>
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        {/* Header */}
        <div className="flex flex-col justify-between gap-5 border-b border-gray-100 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-5 py-4 sm:flex-row sm:items-center dark:border-gray-800 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Transactions list
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Real-time transactions fetched from Slash
              {totalCount != null && (
                <>
                  {" "}
                  ·{" "}
                  <span className="font-medium text-gray-800 dark:text-white/80">
                    {totalCount} transactions
                  </span>
                </>
              )}
            </p>
          </div>

          <form
            onSubmit={handleFilterSubmit}
            className="flex flex-wrap items-center gap-3"
          >
            {/* Search */}
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M3.04199 9.37363C3.04199 5.87693 5.87735 3.04199 9.37533 3.04199C12.8733 3.04199 15.7087 5.87693 15.7087 9.37363C15.7087 12.8703 12.8733 15.7053 9.37533 15.7053C5.87735 15.7053 3.04199 12.8703 3.04199 9.37363ZM9.37533 1.54199C5.04926 1.54199 1.54199 5.04817 1.54199 9.37363C1.54199 13.6991 5.04926 17.2053 9.37533 17.2053C11.2676 17.2053 13.0032 16.5344 14.3572 15.4176L17.1773 18.238C17.4702 18.5309 17.945 18.5309 18.2379 18.238C18.5308 17.9451 18.5309 17.4703 18.238 17.1773L15.4182 14.3573C16.5367 13.0033 17.2087 11.2669 17.2087 9.37363C17.2087 5.04817 13.7014 1.54199 9.37533 1.54199Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search description / merchant / memo"
                className="dark:bg-dark-900 shadow-theme-xs focus:border-brand-300 focus:ring-brand-500/10 dark:focus:border-brand-800 h-10 w-60 rounded-full border border-gray-300 bg-white py-2 pr-4 pl-9 text-sm text-gray-800 placeholder:text-gray-400 focus:ring-3 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Card select */}
            <select
              className="dark:bg-dark-900 shadow-theme-xs focus:border-brand-300 focus:ring-brand-500/10 dark:focus:border-brand-800 h-10 min-w-[150px] rounded-full border border-gray-300 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:ring-3 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
              value={selectedCardId}
              onChange={(e) => setSelectedCardId(e.target.value)}
              disabled={loadingMeta}
            >
              <option value="">All cards</option>
              {cards.map((c) => (
                <option key={c.id} value={c.slashId || String(c.id)}>
                  {c.name || c.last4 || `Card #${c.id}`}
                </option>
              ))}
            </select>

            {/* VA select */}
            <select
              className="dark:bg-dark-900 shadow-theme-xs focus:border-brand-300 focus:ring-brand-500/10 dark:focus:border-brand-800 h-10 min-w-[150px] rounded-full border border-gray-300 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:ring-3 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
              value={selectedVaId}
              onChange={(e) => setSelectedVaId(e.target.value)}
              disabled={loadingMeta}
            >
              <option value="">All VAs</option>
              {virtualAccounts.map((va) => (
                <option key={va.id} value={va.slashId || String(va.id)}>
                  {va.name || va.accountNumber || `VA #${va.id}`}
                </option>
              ))}
            </select>

            {/* From */}
            <input
              type="date"
              id="tx-from-date"
              className="dark:bg-dark-900 shadow-theme-xs focus:border-brand-300 focus:ring-brand-500/10 dark:focus:border-brand-800 h-10 w-36 appearance-none rounded-full border border-gray-300 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:ring-3 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
              value={fromDate || ""}
              onChange={(e) => setFromDate(e.target.value)}
              onClick={handleDateClick}
            />

            {/* To */}
            <input
              type="date"
              id="tx-to-date"
              className="dark:bg-dark-900 shadow-theme-xs focus:border-brand-300 focus:ring-brand-500/10 dark:focus:border-brand-800 h-10 w-36 appearance-none rounded-full border border-gray-300 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:ring-3 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
              value={toDate || ""}
              onChange={(e) => setToDate(e.target.value)}
              onClick={handleDateClick}
            />

            {/* Filter button */}
            <button
              type="submit"
              className="shadow-theme-xs inline-flex h-10 items-center justify-center rounded-full bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loadingTx}
            >
              {loadingTx ? "Filtering..." : "Filter"}
            </button>
          </form>
        </div>

        {/* TABLE */}
        <div className="custom-scrollbar overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60 text-xs uppercase tracking-wide text-gray-500 dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900/40">
                <th className="p-4 text-left">
                  <div className="flex w-full items-center gap-3">
                    <label className="flex cursor-pointer items-center text-sm font-medium text-gray-700 select-none dark:text-gray-400">
                      <span className="relative">
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={allChecked}
                          onChange={toggleSelectAll}
                        />
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded-sm border-[1.25px] ${
                            allChecked
                              ? "border-brand-500 bg-brand-500"
                              : "bg-transparent border-gray-300 dark:border-gray-700"
                          }`}
                        >
                          <span className={allChecked ? "" : "opacity-0"}>
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 12 12"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M10 3L4.5 8.5L2 6"
                                stroke="white"
                                strokeWidth="1.6666"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </span>
                        </span>
                      </span>
                    </label>
                    <p className="text-[11px] font-semibold tracking-wide text-gray-500 dark:text-gray-400">
                      Card
                    </p>
                  </div>
                </th>

                <th className="p-4 text-right text-[11px] font-semibold">
                  Amount
                </th>
                <th className="p-4 text-left text-[11px] font-semibold">
                  Status
                </th>
                <th className="p-4 text-left text-[11px] font-semibold">
                  Reason
                </th>
                <th className="p-4 text-left text-[11px] font-semibold">
                  Description
                </th>
                <th className="p-4 text-left text-[11px] font-semibold">
                  Merchant
                </th>
                <th className="p-4 text-left text-[11px] font-semibold">
                  Country
                </th>
                <th className="p-4 text-right text-[11px] font-semibold">
                  Date
                </th>
              </tr>
            </thead>

            <tbody className="divide-x divide-y divide-gray-100 dark:divide-gray-800">
              {loadingTx && transactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="p-6 text-center text-sm text-gray-500"
                  >
                    Loading transactions...
                  </td>
                </tr>
              ) : displayTransactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="p-6 text-center text-sm text-gray-500"
                  >
                    No transactions found
                  </td>
                </tr>
              ) : (
                displayTransactions.map((tx) => {
                  const isNegative = (tx.amountCents ?? 0) < 0;
                  const checked = tx.id ? selectedIds.includes(tx.id) : false;

                  const status = (tx.status || "").toLowerCase();
                  let statusClass =
                    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
                  if (status === "posted" || status === "succeeded") {
                    statusClass =
                      "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400";
                  } else if (status === "pending" || status === "processing") {
                    statusClass =
                      "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400";
                  } else if (status === "declined" || status === "failed") {
                    statusClass =
                      "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400";
                  }

                  return (
                    <tr
                      key={tx.id}
                      className="transition hover:bg-gray-50 dark:hover:bg-gray-900"
                    >
                      {/* checkbox + card */}
                      <td className="p-4 whitespace-nowrap">
                        <div className="group flex items-center gap-3">
                          <label className="flex cursor-pointer items-center text-sm font-medium text-gray-700 select-none dark:text-gray-400">
                            <span className="relative">
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={checked}
                                onChange={() => toggleRow(tx.id)}
                              />
                              <span
                                className={`flex h-4 w-4 items-center justify-center rounded-sm border-[1.25px] ${
                                  checked
                                    ? "border-brand-500 bg-brand-500"
                                    : "bg-transparent border-gray-300 dark:border-gray-700"
                                }`}
                              >
                                <span className={checked ? "" : "opacity-0"}>
                                  <svg
                                    width="12"
                                    height="12"
                                    viewBox="0 0 12 12"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      d="M10 3L4.5 8.5L2 6"
                                      stroke="white"
                                      strokeWidth="1.6666"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </span>
                              </span>
                            </span>
                          </label>

                          <div className="text-[13px] font-medium text-gray-800 dark:text-gray-100">
                            {getCardLabel(tx.cardId)}
                            <div className="text-[11px] text-gray-400">
                              {getVaName(tx.virtualAccountId)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* amount */}
                      <td className="p-4 whitespace-nowrap text-right">
                        <p
                          className={`text-sm font-semibold ${
                            isNegative
                              ? "text-red-600"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {formatAmount(tx.amountCents)}
                        </p>
                      </td>

                      {/* status */}
                      <td className="p-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusClass}`}
                        >
                          {tx.status || "-"}
                        </span>
                      </td>

                      {/* reason */}
                      <td className="p-4 whitespace-nowrap">
                        <p className="max-w-[180px] truncate text-sm text-gray-700 dark:text-gray-400">
                          {tx.declineReason ||
                            tx.approvalReason ||
                            tx.detailedStatus ||
                            "—"}
                        </p>
                      </td>

                      {/* description */}
                      <td className="p-4 whitespace-nowrap">
                        <p className="max-w-[220px] truncate text-sm text-gray-700 dark:text-gray-400">
                          {tx.description || tx.memo || "—"}
                        </p>
                      </td>

                      {/* merchant */}
                      <td className="p-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {tx.merchantDescription ||
                            tx.merchantData?.description ||
                            "—"}
                        </span>
                      </td>

                      {/* country */}
                      <td className="p-4 whitespace-nowrap">
                        <p className="text-sm text-gray-700 dark:text-gray-400">
                          {tx.merchantData?.location?.country || "—"}
                        </p>
                      </td>

                      {/* date */}
                      <td className="p-4 whitespace-nowrap text-right">
                        <p className="text-sm text-gray-700 dark:text-gray-400">
                          {formatDateTime(tx.date)}
                        </p>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* FOOTER */}
        <div className="border-t border-gray-100 px-5 py-4 dark:border-gray-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing{" "}
              <span className="font-medium text-gray-800 dark:text-white/90">
                {displayTransactions.length}
              </span>{" "}
              of{" "}
              <span className="font-medium text-gray-800 dark:text-white/90">
                {totalCount ?? displayTransactions.length}
              </span>{" "}
              transactions
            </div>

            <div className="flex items-center gap-2">
              {nextCursor && (
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingTx}
                  className="shadow-theme-xs inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-white/[0.04]"
                >
                  <span>Load more</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
