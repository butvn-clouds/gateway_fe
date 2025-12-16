// src/components/transaction/TransactionManager.tsx
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import api from "../../config/api.config";
import { useAuth } from "../../context/AuthContextProvider";

import type {
  Account,
  VirtualAccount,
  Card,
  TransactionPageDTO,
  TransactionItemDTO,
} from "../../types/Types";

import { virtualAccountApi } from "../../api/api.virtualaccout";

type Props = {
  pageSize?: number; // rows per page (client pagination)
};

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
 * Slash có thể trả:
 * - ISO string có timezone: 2025-12-12T03:10:00Z / +00:00
 * - ISO string không timezone: 2025-12-12T03:10:00  (danger)
 * - epoch ms dạng number/string
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

  // ===== account =====
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
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  // ===== data =====
  const [items, setItems] = useState<TransactionItemDTO[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [count, setCount] = useState<number>(0);
  const [fetching, setFetching] = useState(false);

  // ===== VA list =====
  const [loadingVa, setLoadingVa] = useState(false);
  const [accountVAs, setAccountVAs] = useState<VirtualAccount[]>([]);

  // ===== Cards list (from DB) =====
  const [loadingCards, setLoadingCards] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);

  // ===== client pagination =====
  const [page, setPage] = useState(0);

  // build map slashCardId -> label
  const cardLabelBySlashId = useMemo(() => {
    const m = new Map<string, string>();
    (cards ?? []).forEach((c: any) => {
      const slashId =
        c?.slashId || c?.idSlash || c?.slashCardId || c?.cardId;
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

  // ===== load cards from DB (to map tx.cardId -> card name) =====
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

        // đổi path nếu BE của m khác
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
    setIf(params, "cursor", cursor);

    return params;
  };

  const fetchTransactions = async (cursor?: string | null, append?: boolean) => {
    if (!activeAccountId) return;

    setFetching(true);
    try {
      const res = await api.get<TransactionPageDTO>("/api/transactions", {
        params: buildParams(cursor),
      });

      const data = res.data;
      const newItems = data?.items ?? [];
      const nc = data?.metadata?.nextCursor ?? null;
      const ct =
        data?.metadata?.count ??
        (append ? count + newItems.length : newItems.length);

      setItems((prev) => (append ? [...prev, ...newItems] : newItems));
      setNextCursor(nc);
      setCount(ct);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Fetch transactions failed");
    } finally {
      setFetching(false);
    }
  };

  // ✅ AUTO LOAD on filter change (reset everything)
  useEffect(() => {
    if (!activeAccountId) return;

    setPage(0);
    setItems([]);
    setNextCursor(null);
    setCount(0);

    fetchTransactions(null, false);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAccountId, selectedVaId, selectedCardSlashId, fromDate, toDate]);

  // ===== helpers render =====
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

  // ✅ FIX DATE: occurredAt > authorizedAt > date > createdAt
  const txDate = (tx: TransactionItemDTO) => {
    const v =
      (tx as any).occurredAt ??
      (tx as any).authorizedAt ??
      (tx as any).date ??
      (tx as any).createdAt;
    return fmtDateLocal(v);
  };

  // ===== pagination slices =====
  const totalLocal = items.length;
  const totalPages = Math.max(1, Math.ceil(totalLocal / pageSize));
  const start = page * pageSize;
  const end = start + pageSize;
  const pageItems = items.slice(start, end);

  // ✅ when user goes next and we don't have enough local data, auto fetch by cursor
  const ensureDataForPage = async (targetPage: number) => {
    const need = (targetPage + 1) * pageSize;
    if (items.length >= need) return; // already have enough data
    if (!nextCursor) return; // no more
    if (fetching) return;

    await fetchTransactions(nextCursor, true);
  };

  const onPrev = () => setPage((p) => Math.max(0, p - 1));

  const onNext = async () => {
    const nextPage = page + 1;

    // try to ensure data for that page (may load more from Slash)
    await ensureDataForPage(nextPage);

    // after fetch, if still not enough => stop
    const need = (nextPage + 1) * pageSize;
    if (items.length < need && !nextCursor) return;

    setPage(nextPage);
  };

  // keep page valid if items shrink (filters change)
  useEffect(() => {
    if (page === 0) return;
    const maxPage = Math.max(0, Math.ceil(items.length / pageSize) - 1);
    if (page > maxPage) setPage(maxPage);
  }, [items.length, page, pageSize]);

  if (loading) return <div>Check auth...</div>;
  if (!user) return <div>Not logged in</div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl bg-white shadow-sm border border-slate-200/70 px-4 py-4 space-y-4">
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

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Card */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-700">Card:</span>
            <select
              className="min-w-[180px] rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200"
              value={selectedCardSlashId}
              onChange={(e) => setSelectedCardSlashId(e.target.value)}
              disabled={loadingCards}
            >
              <option value="">{loadingCards ? "Loading..." : "All"}</option>
              {cards.map((c: any) => {
                const slashId =
                  c?.slashId || c?.idSlash || c?.slashCardId || c?.cardId;
                if (!slashId) return null;
                const label =
                  cardLabelBySlashId.get(String(slashId)) || String(slashId);
                return (
                  <option key={String(slashId)} value={String(slashId)}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>

          {/* VA */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-700">VA Name:</span>
            <select
              className="min-w-[220px] rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200"
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

          {/* From */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-700">From:</span>
            <input
              type="date"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          {/* To */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-700">To:</span>
            <input
              type="date"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>

          <div className="ml-auto text-xs text-slate-500">
            {fetching ? "Loading..." : `Page size: ${pageSize}`}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-700 font-semibold">
            {count || items.length} transactions
          </div>

          {/* Pager */}
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
              Page <span className="font-semibold text-slate-800">{page + 1}</span>{" "}
              / <span className="font-semibold text-slate-800">{totalPages}</span>
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
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="max-w-full overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                <th className="px-4 py-3 text-left text-[12px] font-semibold text-slate-400">
                  Card
                </th>
                <th className="px-4 py-3 text-left text-[12px] font-semibold text-slate-400">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-[12px] font-semibold text-slate-400">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-[12px] font-semibold text-slate-400">
                  Reason
                </th>
                <th className="px-4 py-3 text-left text-[12px] font-semibold text-slate-400">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-[12px] font-semibold text-slate-400">
                  Merchant
                </th>
                <th className="px-4 py-3 text-left text-[12px] font-semibold text-slate-400">
                  Country
                </th>
                <th className="px-4 py-3 text-left text-[12px] font-semibold text-slate-400">
                  Date
                </th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {fetching && items.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-6 text-center text-slate-500"
                  >
                    Loading transactions...
                  </td>
                </tr>
              ) : totalLocal === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-slate-500"
                  >
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
                            ? "text-red-500"
                            : "text-slate-900"
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

                    <td className="px-4 py-3 text-slate-700">
                      {txDescription(tx)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {txDescription(tx)}
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

        {/* Optional manual load more */}
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
