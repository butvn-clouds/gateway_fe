import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContextProvider";
import {
  Account,
  VirtualAccount,
  Transaction,
} from "../../types/Types";
import { virtualAccountApi } from "../../api/api.virtualaccout";
import { transactionApi } from "../../api/api.transaction";

interface Props {
  compact?: boolean;
}

type StatusFilter = "all" | "pending" | "posted" | "failed";
type DetailedStatusFilter =
  | "all"
  | "pending"
  | "canceled"
  | "failed"
  | "settled"
  | "declined"
  | "refund"
  | "reversed"
  | "returned"
  | "dispute";

export const TransactionManager: React.FC<Props> = ({ compact }) => {
  const { user, loading } = useAuth();

  // ====== ACCOUNT / VA STATE ======
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

  const [accountVirtualAccounts, setAccountVirtualAccounts] = useState<
    VirtualAccount[]
  >([]);
  const [selectedVaId, setSelectedVaId] = useState<number | null>(null);
  const [loadingVa, setLoadingVa] = useState(false);

  // ====== TRANSACTION LIST STATE ======
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [count, setCount] = useState<number | undefined>();
  const [loadingList, setLoadingList] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Local search (client-side) theo description / merchantDescription / memo
  const [search, setSearch] = useState("");

  // Filter status
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [detailedStatusFilter, setDetailedStatusFilter] =
    useState<DetailedStatusFilter>("all");

  // Filter date (ngày post)
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  // ====== HELPERS ======
  const formatUsd = (cents?: number | null): string => {
    if (cents == null) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  };

  const formatDate = (iso?: string | null) => {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  };

  const amountClass = (amountCents?: number | null) => {
    if (amountCents == null) return "text-slate-700";
    if (amountCents < 0) return "text-red-600";
    if (amountCents > 0) return "text-emerald-600";
    return "text-slate-700";
  };

  const statusBadgeClass = (status?: string | null) => {
    const s = (status || "").toLowerCase();
    if (s === "pending") {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }
    if (s === "posted" || s === "settled") {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (s === "failed" || s === "declined" || s === "canceled") {
      return "bg-red-50 text-red-700 border-red-200";
    }
    return "bg-slate-50 text-slate-600 border-slate-200";
  };

  const findVaName = (id: number | null): string => {
    if (!user || !id) return "-";
    const va =
      accountVirtualAccounts.find((v) => v.id === id) ||
      (user.virtualAccounts ?? []).find((v) => v.id === id);
    return va?.name || va?.accountNumber || `VA #${id}`;
  };

  const findVaSlashId = (id: number | null): string | undefined => {
    if (!id) return undefined;
    const va =
      accountVirtualAccounts.find((v) => v.id === id) ||
      (user?.virtualAccounts ?? []).find((v) => v.id === id);
    return (va as any)?.slashId || undefined;
  };

  // ======================== LOAD VAs THEO ACCOUNT ========================
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
        } else if (
          selectedVaId &&
          !res.content.some((v: VirtualAccount) => v.id === selectedVaId)
        ) {
          setSelectedVaId(null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAccountId]);

  // ======================== LOAD TRANSACTIONS ========================
  const loadTransactions = async (reset: boolean) => {
    if (!activeAccountId) {
      setTransactions([]);
      setNextCursor(undefined);
      setCount(undefined);
      return;
    }

    const vaSlashId = findVaSlashId(selectedVaId);

    const params = {
      accountId: activeAccountId,
      cursor: reset ? undefined : nextCursor,
      virtualAccountId: vaSlashId,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      detailedStatus:
        detailedStatusFilter !== "all" ? detailedStatusFilter : undefined,
    };

    try {
      if (reset) {
        setLoadingList(true);
      } else {
        setLoadingMore(true);
      }

      const res = await transactionApi.list(params);

      if (reset) {
        setTransactions(res.items || []);
      } else {
        setTransactions((prev) => [...prev, ...(res.items || [])]);
      }

      setNextCursor(res.nextCursor || undefined);
      setCount(res.count ?? undefined);
    } catch (err: any) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || "Unable to load transactions"
      );
    } finally {
      setLoadingList(false);
      setLoadingMore(false);
    }
  };

  // Auto load khi account / VA / filter đổi
  useEffect(() => {
    if (activeAccountId != null) {
      loadTransactions(true);
    } else {
      setTransactions([]);
      setNextCursor(undefined);
      setCount(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAccountId, selectedVaId, statusFilter, detailedStatusFilter, fromDate, toDate]);

  // ======================== CLIENT-SIDE FILTER SEARCH ========================
  const filteredTransactions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter((t) => {
      const haystack =
        [
          t.description,
          t.merchantDescription,
          t.memo,
          t.merchantData?.description,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase() || "";
      return haystack.includes(q);
    });
  }, [transactions, search]);

  // ======================== RENDER ========================
  if (loading) return <div>Check auth...</div>;
  if (!user) return <div>Not logged in</div>;

  return (
    <div
      className={`bg-gradient-to-b from-[#f5f7ff] to-white rounded-3xl border border-slate-200/70 shadow-sm ${
        compact ? "p-4" : "p-6"
      }`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div className="space-y-1">
          <h2 className="text-base md:text-lg font-semibold text-slate-900 flex items-center gap-2">
            Transaction Activity
            <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 border border-indigo-100">
              Live from Slash
            </span>
          </h2>
          <p className="text-[11px] md:text-xs text-slate-500 max-w-xl">
            View real-time transactions for your Slash account and virtual
            accounts. Filter by status, date range, and quickly search by
            description or merchant.
          </p>
        </div>

        <div className="flex flex-col items-end gap-1 text-right">
          <div className="text-xs text-slate-500">
            Account:{" "}
            <span className="font-semibold text-slate-900">
              {activeAccount ? activeAccount.name : "No account selected"}
            </span>
          </div>
          {typeof count === "number" && (
            <div className="inline-flex items-center gap-1 rounded-full bg-slate-900 text-white px-3 py-1 text-[11px]">
              <span className="opacity-80">Total</span>
              <span className="font-semibold">{count}</span>
              <span className="opacity-80">transactions</span>
            </div>
          )}
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* VA filter */}
        <select
          className="rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200 min-w-[180px]"
          value={selectedVaId ?? ""}
          onChange={(e) =>
            setSelectedVaId(e.target.value ? Number(e.target.value) : null)
          }
          disabled={activeAccountId == null || loadingVa}
        >
          <option value="">
            {loadingVa ? "Loading virtual accounts..." : "All Virtual Accounts"}
          </option>
          {accountVirtualAccounts.map((va) => (
            <option key={va.id} value={va.id}>
              {va.name || va.accountNumber || `VA #${va.id}`}
            </option>
          ))}
        </select>

        {/* Status */}
        <div className="inline-flex rounded-2xl bg-slate-100/80 p-0.5 text-[11px]">
          {(["all", "pending", "posted", "failed"] as StatusFilter[]).map(
            (s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-2xl font-medium capitalize ${
                  statusFilter === s
                    ? "bg-white shadow-sm text-slate-900"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {s === "all" ? "All status" : s}
              </button>
            )
          )}
        </div>

        {/* Detailed status */}
        <select
          className="rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          value={detailedStatusFilter}
          onChange={(e) =>
            setDetailedStatusFilter(e.target.value as DetailedStatusFilter)
          }
        >
          <option value="all">All detailed statuses</option>
          <option value="pending">Pending</option>
          <option value="settled">Settled</option>
          <option value="declined">Declined</option>
          <option value="failed">Failed</option>
          <option value="canceled">Canceled</option>
          <option value="refund">Refund</option>
          <option value="reversed">Reversed</option>
          <option value="returned">Returned</option>
          <option value="dispute">Dispute</option>
        </select>

        {/* Date range */}
        <div className="flex items-center gap-2 text-[11px]">
          <div className="flex items-center gap-1">
            <span className="text-slate-500">From</span>
            <input
              type="date"
              className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-200"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-500">To</span>
            <input
              type="date"
              className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-200"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </div>

        {/* Search box */}
        <div className="ml-auto flex items-center gap-0">
          <input
            className="rounded-l-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            placeholder="Search description or merchant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            type="button"
            className="rounded-r-2xl border border-l-0 border-slate-200 bg-slate-900 px-3 py-1.5 text-xs sm:text-sm text-white hover:bg-slate-800"
            onClick={() => loadTransactions(true)}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/70">
        <div className="max-w-full overflow-x-auto">
          <table className="min-w-full text-xs sm:text-sm">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200/80">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Description / Merchant
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Virtual Account
                </th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Amount
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Original
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingList ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-xs text-slate-500"
                  >
                    Loading transactions...
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-xs sm:text-sm text-slate-500"
                  >
                    No transactions found with current filters
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t) => {
                  const vaName =
                    t.virtualAccountId && selectedVaId
                      ? findVaName(selectedVaId)
                      : "-";

                  const merchantTitle =
                    t.merchantDescription ||
                    t.merchantData?.description ||
                    "—";

                  const subLine =
                    t.memo ||
                    [
                      t.merchantData?.location?.city,
                      t.merchantData?.location?.country,
                    ]
                      .filter(Boolean)
                      .join(", ");

                  return (
                    <tr
                      key={t.id}
                      className="bg-white hover:bg-indigo-50/60 transition-colors"
                    >
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs sm:text-sm font-medium text-slate-900">
                            {formatDate(t.date)}
                          </span>
                          {t.authorizedAt && (
                            <span className="text-[10px] text-slate-400">
                              Auth: {formatDate(t.authorizedAt)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs sm:text-sm font-semibold text-slate-900 line-clamp-1">
                            {t.description || merchantTitle || "—"}
                          </span>
                          {merchantTitle && (
                            <span className="text-[11px] text-slate-600 line-clamp-1">
                              {merchantTitle}
                            </span>
                          )}
                          {subLine && (
                            <span className="text-[10px] text-slate-400 line-clamp-1">
                              {subLine}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="text-xs sm:text-sm text-slate-900">
                          {vaName}
                        </div>
                        {t.cardId && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Card: {t.cardId}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center align-top">
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusBadgeClass(
                              t.status
                            )}`}
                          >
                            {t.status || "unknown"}
                          </span>
                          {t.detailedStatus && t.detailedStatus !== t.status && (
                            <span className="text-[10px] text-slate-400 uppercase tracking-wide">
                              {t.detailedStatus}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right align-top">
                        <span
                          className={`text-xs sm:text-sm font-semibold ${amountClass(
                            t.amountCents
                          )}`}
                        >
                          {formatUsd(t.amountCents)}
                        </span>
                        {t.feeInfo?.relatedTransaction && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Fee:{" "}
                            {formatUsd(
                              t.feeInfo.relatedTransaction.amount ?? undefined
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right align-top">
                        {t.originalCurrency?.code ? (
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="text-[11px] text-slate-700">
                              {t.originalCurrency.code}{" "}
                              {formatUsd(
                                t.originalCurrency.amountCents ?? undefined
                              )}
                            </span>
                            {typeof t.originalCurrency.conversionRate ===
                              "number" && (
                              <span className="text-[10px] text-slate-400">
                                FX: {t.originalCurrency.conversionRate}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 bg-white/80 px-4 py-3">
          <p className="text-[11px] sm:text-xs text-slate-500">
            Showing{" "}
            <span className="font-semibold text-slate-800">
              {filteredTransactions.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-800">
              {typeof count === "number" ? count : "—"}
            </span>{" "}
            transactions (client-side search applied)
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-3 py-1.5 text-xs rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:text-slate-300 disabled:border-slate-100 disabled:bg-transparent transition"
              onClick={() => loadTransactions(true)}
              disabled={loadingList}
            >
              {loadingList ? "Refreshing..." : "Reload"}
            </button>
            <button
              type="button"
              className="px-4 py-1.5 text-xs rounded-full bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
              onClick={() => loadTransactions(false)}
              disabled={!nextCursor || loadingMore}
            >
              {loadingMore
                ? "Loading more..."
                : nextCursor
                ? "Load more"
                : "No more"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
