// src/components/transaction/TransactionManager.tsx
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import api from "../../config/api.config";
import { useAuth } from "../../context/AuthContextProvider";
import { virtualAccountApi } from "../../api/api.virtualaccout";

import type {
  Account,
  VirtualAccount,
  Card,
  TransactionPageDTO,
  TransactionItemDTO,
} from "../../types/Types";

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

type Props = {
  pageSize?: number; // rows per page (client pagination)
};

type TxStatusFilter = "" | "pending" | "posted";

const fmtUsd = (cents?: number | null) => {
  if (cents == null) return "-";
  const usd = cents / 100;
  const sign = usd < 0 ? "-" : "";
  const abs = Math.abs(usd);

  const v = Number.isInteger(abs)
    ? abs.toLocaleString("en-US")
    : abs.toLocaleString("en-US", { maximumFractionDigits: 2 });

  return `${sign}${v} USD`;
};

const setIf = (q: Record<string, any>, key: string, val: any) => {
  if (val === undefined || val === null) return;
  if (typeof val === "string" && val.trim() === "") return;
  q[key] = val;
};

/**
 * Slash can return:
 * - ISO with timezone: 2025-12-12T03:10:00Z / +00:00
 * - ISO without timezone: 2025-12-12T03:10:00 (danger)
 * - epoch ms number/string
 */
const parseSlashDate = (value?: string | number | null): Date | null => {
  if (value == null) return null;

  if (typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  if (/^\d+$/.test(raw)) {
    const ms = Number(raw);
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const hasTz = /[zZ]$|[+-]\d{2}:\d{2}$/.test(raw);
  const iso = hasTz ? raw : `${raw}Z`; // assume missing tz is UTC
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

const fmtDateLocal = (value?: string | number | null) => {
  const d = parseSlashDate(value);
  if (!d) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}-${mm}-${yyyy} ${hh}:${mi}`;
};

// yyyy-mm-dd -> epoch ms (local)
const localDayStartMs = (yyyyMmDd?: string) => {
  if (!yyyyMmDd) return undefined;
  const d = new Date(`${yyyyMmDd}T00:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : d.getTime();
};

const localDayEndMs = (yyyyMmDd?: string) => {
  if (!yyyyMmDd) return undefined;
  const d = new Date(`${yyyyMmDd}T23:59:59.999`);
  return Number.isNaN(d.getTime()) ? undefined : d.getTime();
};

export const TransactionManager: React.FC<Props> = ({ pageSize = 20 }) => {
  const { user, loading } = useAuth();

  // ===== accounts =====
  const accounts: Account[] = useMemo(() => user?.accounts ?? [], [user]);

  const activeAccountId: number | null = useMemo(() => {
    if (!user) return null;
    if ((user as any).activeAccount) return (user as any).activeAccount.id;
    if (accounts.length > 0) return accounts[0].id;
    return null;
  }, [user, accounts]);

  const activeAccount: Account | null = useMemo(() => {
    if (!activeAccountId) return null;
    return accounts.find((a) => a.id === activeAccountId) || null;
  }, [accounts, activeAccountId]);

  // ===== filters =====
  const [selectedVaId, setSelectedVaId] = useState<number | null>(null);
  const [selectedCardSlashId, setSelectedCardSlashId] = useState<string>("");
  const [status, setStatus] = useState<TxStatusFilter>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  // ===== data =====
  const [items, setItems] = useState<TransactionItemDTO[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);

  // ===== VA list =====
  const [loadingVa, setLoadingVa] = useState(false);
  const [accountVAs, setAccountVAs] = useState<VirtualAccount[]>([]);

  // ===== Cards list =====
  const [loadingCards, setLoadingCards] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);

  // ===== client pagination =====
  const [page, setPage] = useState(0);

  // ===== default date range: last 7 days (1 lần khi account available) =====
  useEffect(() => {
    if (!activeAccountId) return;
    if (fromDate || toDate) return;

    const now = new Date();
    const to = new Date(now);
    const from = new Date(now);
    from.setDate(from.getDate() - 7);

    const toStr = `${to.getFullYear()}-${String(to.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(to.getDate()).padStart(2, "0")}`;

    const fromStr = `${from.getFullYear()}-${String(
      from.getMonth() + 1
    ).padStart(2, "0")}-${String(from.getDate()).padStart(2, "0")}`;

    setFromDate(fromStr);
    setToDate(toStr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAccountId]);

  // ===== build card label map =====
  const cardLabelBySlashId = useMemo(() => {
    const m = new Map<string, string>();
    (cards ?? []).forEach((c: any) => {
      const slashId = c?.slashId || c?.idSlash || c?.slashCardId || c?.cardId;
      if (!slashId) return;

      const label =
        c?.name ||
        c?.label ||
        (c?.last4 ? `**** ${c.last4}` : null) ||
        c?.panLast4 ||
        String(slashId);

      m.set(String(slashId), String(label));
    });
    return m;
  }, [cards]);

  // ===== load VA when account changes =====
  useEffect(() => {
    const run = async () => {
      if (!activeAccountId) {
        setAccountVAs([]);
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

        const list = res.content || [];
        setAccountVAs(list);

        if (list.length === 1) setSelectedVaId(list[0].id);
        else setSelectedVaId(null);
      } catch (e: any) {
        console.error(e);
        setAccountVAs([]);
        setSelectedVaId(null);
        toast.error(
          e?.response?.data?.message || "Unable to load virtual accounts"
        );
      } finally {
        setLoadingVa(false);
      }
    };
    run();
  }, [activeAccountId]);

  // ===== load cards from DB =====
  useEffect(() => {
    const run = async () => {
      if (!activeAccountId) {
        setCards([]);
        setSelectedCardSlashId("");
        return;
      }

      setLoadingCards(true);
      try {
        const params: any = { accountId: activeAccountId, page: 0, size: 1000 };
        if (selectedVaId != null) params.virtualAccountId = selectedVaId;

        const { data } = await api.get<any>("/api/cards", { params });
        const list: any[] =
          data?.items || data?.content || data?.data?.items || [];
        setCards(list);
      } catch (e: any) {
        console.error(e);
        setCards([]);
      } finally {
        setLoadingCards(false);
      }
    };
    run();
  }, [activeAccountId, selectedVaId]);

  // ===== build params for /api/transactions =====
  const buildParams = (cursor?: string | null) => {
    const params: Record<string, any> = { accountId: activeAccountId };

    if (selectedVaId != null) params.virtualAccountId = selectedVaId;

    setIf(params, "filter:from_date", localDayStartMs(fromDate));
    setIf(params, "filter:to_date", localDayEndMs(toDate));
    setIf(params, "filter:cardId", selectedCardSlashId);
    setIf(params, "filter:status", status);

    setIf(params, "cursor", cursor);
    return params;
  };

  const fetchTransactions = async (
    cursor?: string | null,
    append?: boolean
  ) => {
    if (!activeAccountId) return;

    setFetching(true);
    try {
      const res = await api.get<TransactionPageDTO>("/api/transactions", {
        params: buildParams(cursor),
      });

      const data = res.data;
      const newItems = data?.items ?? [];
      const nc = data?.metadata?.nextCursor ?? null;

      setItems((prev) => (append ? [...prev, ...newItems] : newItems));
      setNextCursor(nc);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Fetch transactions failed");
    } finally {
      setFetching(false);
    }
  };

  // ✅ AUTO LOAD on filter change
  useEffect(() => {
    if (!activeAccountId) return;

    setPage(0);
    setItems([]);
    setNextCursor(null);

    fetchTransactions(null, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeAccountId,
    selectedVaId,
    selectedCardSlashId,
    status,
    fromDate,
    toDate,
  ]);

  // ===== render helpers =====
  const cardLabel = (tx: TransactionItemDTO) => {
    const slashId = (tx as any).cardId;
    if (!slashId) return "—";
    return cardLabelBySlashId.get(String(slashId)) || String(slashId);
  };

  const txDescription = (tx: TransactionItemDTO) =>
    (tx as any).description ||
    (tx as any).memo ||
    (tx as any).merchantDescription ||
    "—";

  const txMerchant = (tx: TransactionItemDTO) =>
    (tx as any).merchantDescription ||
    (tx as any)?.merchantData?.description ||
    "—";

  const txCountry = (tx: TransactionItemDTO) =>
    (tx as any)?.merchantData?.location?.country || "—";

  const txDate = (tx: TransactionItemDTO) => {
    const v =
      (tx as any).occurredAt ??
      (tx as any).authorizedAt ??
      (tx as any).date ??
      (tx as any).createdAt;
    return fmtDateLocal(v);
  };

  // ===== client paging =====
  const totalLoaded = items.length; // ✅ total tx without extra API
  const totalPages = Math.max(1, Math.ceil(totalLoaded / pageSize));
  const start = page * pageSize;
  const end = start + pageSize;
  const pageItems = items.slice(start, end);

  const ensureDataForPage = async (targetPage: number) => {
    const need = (targetPage + 1) * pageSize;
    if (items.length >= need) return;
    if (!nextCursor) return;
    if (fetching) return;

    await fetchTransactions(nextCursor, true);
  };

  const onPrev = () => setPage((p) => Math.max(0, p - 1));

  const onNext = async () => {
    const nextPage = page + 1;
    await ensureDataForPage(nextPage);

    const need = (nextPage + 1) * pageSize;
    if (items.length < need && !nextCursor) return;

    setPage(nextPage);
  };

  useEffect(() => {
    if (page === 0) return;
    const maxPage = Math.max(0, Math.ceil(items.length / pageSize) - 1);
    if (page > maxPage) setPage(maxPage);
  }, [items.length, page, pageSize]);

  // ===== Export Excel =====
  const exportExcel = () => {
    if (!items || items.length === 0) {
      toast.info("No data to export");
      return;
    }

    const rows = items.map((tx: any) => ({
      Card: cardLabel(tx),
      Amount: fmtUsd(tx.amountCents),
      Status: tx.status || tx.detailedStatus || "",
      Reason: tx.declineReason || tx.approvalReason || "",
      Description: txDescription(tx),
      Merchant: txMerchant(tx),
      Country: txCountry(tx),
      Date: txDate(tx),
      TxId: tx.id || "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");

    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const fileName = `transactions_${activeAccountId || "account"}_${Date.now()}.xlsx`;
    saveAs(new Blob([buf], { type: "application/octet-stream" }), fileName);
  };

  if (loading) return <div>Check auth...</div>;
  if (!user) return <div>Not logged in</div>;

  return (
    <div className="space-y-4">
      {/* Header + Filters */}
      <div className="rounded-3xl bg-white shadow-sm border border-slate-200/70 px-5 py-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-[0.16em] text-indigo-500">
              Dashboard
            </div>
            <div className="text-3xl font-semibold text-slate-900">
              Transactions
            </div>
            <div className="text-xs text-slate-500">
              {activeAccount ? activeAccount.name : "No active account"}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchTransactions(null, false)}
              disabled={fetching || !activeAccountId}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {fetching ? "Loading..." : "Refresh"}
            </button>

            <button
              type="button"
              onClick={exportExcel}
              disabled={!items.length}
              className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Export Excel
            </button>
          </div>
        </div>

        {/* Filters row */}
        <div
          className="flex flex-wrap items-end gap-3"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Card */}
          <div className="min-w-[210px]">
            <div className="text-[11px] font-medium text-slate-500 mb-1">Card</div>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200"
              value={selectedCardSlashId}
              onChange={(e) => setSelectedCardSlashId(e.target.value)}
              disabled={loadingCards}
            >
              <option value="">{loadingCards ? "Loading..." : "All"}</option>
              {cards.map((c: any) => {
                const slashId = c?.slashId || c?.idSlash || c?.slashCardId || c?.cardId;
                if (!slashId) return null;
                const label = cardLabelBySlashId.get(String(slashId)) || String(slashId);
                return (
                  <option key={String(slashId)} value={String(slashId)}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>

          {/* VA */}
          <div className="min-w-[240px]">
            <div className="text-[11px] font-medium text-slate-500 mb-1">VA Name</div>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200"
              value={selectedVaId ?? ""}
              onChange={(e) =>
                setSelectedVaId(e.target.value ? Number(e.target.value) : null)
              }
              disabled={loadingVa || activeAccountId == null}
            >
              <option value="">{loadingVa ? "Loading..." : "All"}</option>
              {accountVAs.map((va) => (
                <option key={va.id} value={va.id}>
                  {va.name || va.accountNumber || `VA #${va.id}`}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="min-w-[180px]">
            <div className="text-[11px] font-medium text-slate-500 mb-1">Status</div>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200"
              value={status}
              onChange={(e) => setStatus(e.target.value as TxStatusFilter)}
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="posted">Posted</option>
            </select>
          </div>

          {/* Date range */}
          <div className="min-w-[190px] relative z-[9999]">
            <div className="text-[11px] font-medium text-slate-500 mb-1">From</div>
            <input
              type="date"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className="min-w-[190px] relative z-[9999]">
            <div className="text-[11px] font-medium text-slate-500 mb-1">To</div>
            <input
              type="date"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className="ml-auto text-xs text-slate-500 pb-2">
            {fetching ? "Loading..." : `Auto load • Page size: ${pageSize}`}
          </div>
        </div>

        {/* Stats + Pager */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="text-sm font-semibold text-slate-800">
            Total loaded: {totalLoaded} {nextCursor ? "(more available)" : ""}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPrev}
              disabled={page <= 0 || fetching}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Prev
            </button>

            <div className="text-xs text-slate-500">
              Page <span className="font-semibold text-slate-800">{page + 1}</span> /{" "}
              <span className="font-semibold text-slate-800">{totalPages}</span>
            </div>

            <button
              type="button"
              onClick={onNext}
              disabled={fetching || (page + 1 >= totalPages && !nextCursor)}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <div className="max-w-full overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                <th className="px-4 py-3 text-left text-[12px] font-semibold text-slate-400">Card</th>
                <th className="px-4 py-3 text-left text-[12px] font-semibold text-slate-400">Amount</th>
                <th className="px-4 py-3 text-left text-[12px] font-semibold text-slate-400">Status</th>
                <th className="px-4 py-3 text-left text-[12px] font-semibold text-slate-400">Reason</th>
                <th className="px-4 py-3 text-left text-[12px] font-semibold text-slate-400">Description</th>
                <th className="px-4 py-3 text-left text-[12px] font-semibold text-slate-400">Merchant</th>
                <th className="px-4 py-3 text-left text-[12px] font-semibold text-slate-400">Country</th>
                <th className="px-4 py-3 text-left text-[12px] font-semibold text-slate-400">Date</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {fetching && items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-7 text-center text-slate-500">
                    Loading transactions...
                  </td>
                </tr>
              ) : totalLoaded === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                    No transactions found
                  </td>
                </tr>
              ) : (
                pageItems.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-900">
                      {cardLabel(tx)}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={
                          (tx.amountCents ?? 0) < 0
                            ? "text-red-500 font-semibold"
                            : "text-slate-900 font-semibold"
                        }
                      >
                        {fmtUsd(tx.amountCents)}
                      </span>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-slate-700 capitalize">
                      {tx.status || tx.detailedStatus || "—"}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                      {tx.declineReason || tx.approvalReason || "—"}
                    </td>

                    <td className="px-4 py-3 text-slate-700 max-w-[360px]">
                      <div className="truncate">{txDescription(tx)}</div>
                    </td>

                    <td className="px-4 py-3 text-slate-700 max-w-[260px]">
                      <div className="truncate">{txMerchant(tx)}</div>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                      {txCountry(tx)}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                      {txDate(tx)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {nextCursor && (
          <div className="border-t border-slate-200 bg-white px-4 py-3 flex justify-center">
            <button
              type="button"
              onClick={() => fetchTransactions(nextCursor, true)}
              disabled={fetching}
              className="rounded-full border border-slate-200 px-5 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {fetching ? "Loading..." : "Load more"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
