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
  TransactionCursorScanDTO,
} from "../../types/Types";

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import Flatpickr from "react-flatpickr";
// import "flatpickr/dist/themes/material_blue.css";

type Props = {
  pageSize?: number; 
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
  const iso = hasTz ? raw : `${raw}Z`;
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
  const [y, m, d] = yyyyMmDd.split("-").map((x) => Number(x));
  if (!y || !m || !d) return undefined;
  const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
  return Number.isNaN(dt.getTime()) ? undefined : dt.getTime();
};

const localDayEndMs = (yyyyMmDd?: string) => {
  if (!yyyyMmDd) return undefined;
  const [y, m, d] = yyyyMmDd.split("-").map((x) => Number(x));
  if (!y || !m || !d) return undefined;
  const dt = new Date(y, m - 1, d, 23, 59, 59, 999);
  return Number.isNaN(dt.getTime()) ? undefined : dt.getTime();
};

const toYmd = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const ymdToDate = (ymd?: string) => {
  if (!ymd) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

const isSingleDay = (fromDate?: string, toDate?: string) => {
  if (!fromDate || !toDate) return false;
  return fromDate === toDate;
};

export const TransactionManager: React.FC<Props> = ({ pageSize = 20 }) => {
  const { user, loading } = useAuth();

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

  const [selectedVaId, setSelectedVaId] = useState<number | null>(null);
  const [selectedCardSlashId, setSelectedCardSlashId] = useState<string>("");
  const [status, setStatus] = useState<TxStatusFilter>("");
  const [country, setCountry] = useState<string>(""); // ✅ new
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [totalWant, setTotalWant] = useState<number>(50000);
  const thisYear = new Date().getFullYear();
  const [yearPreset, setYearPreset] = useState<number | "">("");
  const [items, setItems] = useState<TransactionItemDTO[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [serverCount, setServerCount] = useState<number | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] =
    useState<TransactionCursorScanDTO | null>(null);

  const [loadingVa, setLoadingVa] = useState(false);
  const [accountVAs, setAccountVAs] = useState<VirtualAccount[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);
  const [page, setPage] = useState(0);
  const singleDayMode = useMemo(
    () => isSingleDay(fromDate, toDate),
    [fromDate, toDate]
  );

  useEffect(() => {
    if (!activeAccountId) return;
    if (fromDate || toDate) return;

    const now = new Date();
    const ymd = toYmd(now);
    setFromDate(ymd);
    setToDate(ymd);
  }, [activeAccountId]);

  useEffect(() => {
    if (!yearPreset) return;

    const y = Number(yearPreset);
    if (!Number.isFinite(y) || y < 1970) return;

    setFromDate(`${y}-01-01`);
    setToDate(`${y}-12-31`);
  }, [yearPreset]);

  const onLast365Days = () => {
    setYearPreset("");
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 365);
    setFromDate(toYmd(from));
    setToDate(toYmd(now));
  };

  const onToday = () => {
    setYearPreset("");
    const now = new Date();
    const ymd = toYmd(now);
    setFromDate(ymd);
    setToDate(ymd);
  };

 

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

        if (list.length === 1) setSelectedVaId((list[0] as any).id);
        else setSelectedVaId(null);
      } catch (e: any) {
        console.error(e);
        setAccountVAs([]);
        setSelectedVaId(null);
        toast.error(e?.response?.data?.message || "Unable to load virtual accounts");
      } finally {
        setLoadingVa(false);
      }
    };
    run();
  }, [activeAccountId]);

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
        const list: any[] = data?.items || data?.content || data?.data?.items || [];
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

  const buildParams = (cursor?: string | null) => {
    const params: Record<string, any> = { accountId: activeAccountId };

    if (selectedVaId != null) params.virtualAccountId = selectedVaId;

    setIf(params, "filter:from_date", localDayStartMs(fromDate));
    setIf(params, "filter:to_date", localDayEndMs(toDate));
    setIf(params, "filter:cardId", selectedCardSlashId);
    setIf(params, "filter:status", status);
    setIf(params, "filter:country", country);

    if (!singleDayMode) {
      const t =
        Number.isFinite(totalWant) && totalWant > 0 ? Math.floor(totalWant) : undefined;
      setIf(params, "total", t);
    }

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

      const data: any = res.data;
      const newItems = data?.items ?? [];
      const nc = data?.metadata?.nextCursor ?? null;

      const count = data?.metadata?.count;
      setServerCount(typeof count === "number" ? count : null);

      setItems((prev) => (append ? [...prev, ...newItems] : newItems));
      setNextCursor(nc);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Fetch transactions failed");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (!activeAccountId) return;

    setPage(0);
    setItems([]);
    setNextCursor(null);
    setServerCount(null);
    setScanResult(null);

    fetchTransactions(null, false);
  }, [
    activeAccountId,
    selectedVaId,
    selectedCardSlashId,
    status,
    country, 
    fromDate,
    toDate,
    totalWant,
  ]);

  const scanPages = async () => {
    if (!activeAccountId) return;

    setScanning(true);
    setScanResult(null);

    try {
      const params: any = {
        accountId: activeAccountId,
        maxPages: 500,
      };

      if (selectedVaId != null) params.virtualAccountId = selectedVaId;

      setIf(params, "filter:from_date", localDayStartMs(fromDate));
      setIf(params, "filter:to_date", localDayEndMs(toDate));
      setIf(params, "filter:cardId", selectedCardSlashId);
      setIf(params, "filter:status", status);
      setIf(params, "filter:country", country);

      const res = await api.get<TransactionCursorScanDTO>("/api/transactions/scan", {
        params,
      });

      setScanResult(res.data);
      toast.success("Scan completed");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Scan failed");
    } finally {
      setScanning(false);
    }
  };

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

  const countryOptions = useMemo(() => {
    const s = new Set<string>();
    (items ?? []).forEach((tx: any) => {
      const c = (tx?.merchantData?.location?.country || "").toString().trim();
      if (c) s.add(c);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filteredItems = useMemo(() => {
    const cc = country.trim();
    if (!cc) return items;

    return (items ?? []).filter((tx: any) => {
      const c = (tx?.merchantData?.location?.country || "").toString().trim();
      return c === cc;
    });
  }, [items, country]);

  const totalLoaded = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalLoaded / pageSize));
  const start = page * pageSize;
  const end = start + pageSize;
  const pageItems = filteredItems.slice(start, end);

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
    const maxPage = Math.max(0, Math.ceil(filteredItems.length / pageSize) - 1);
    if (page > maxPage) setPage(maxPage);
  }, [filteredItems.length, page, pageSize]);

  const exportExcel = () => {
    if (!filteredItems || filteredItems.length === 0) {
      toast.info("No data to export");
      return;
    }

    const rows = filteredItems.map((tx: any) => ({
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

  const safeTotalWant =
    Number.isFinite(totalWant) && totalWant > 0 ? Math.floor(totalWant) : 0;

  const yearOptions = useMemo(() => {
    const ys: number[] = [];
    for (let y = thisYear; y >= thisYear - 5; y--) ys.push(y);
    return ys;
  }, [thisYear]);

  if (loading) return <div>Check auth...</div>;
  if (!user) return <div>Not logged in</div>;

  return (
    <div className="space-y-4">
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
              onClick={scanPages}
              disabled={scanning || !activeAccountId}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {scanning ? "Scanning..." : "Scan pages"}
            </button>

            <button
              type="button"
              onClick={exportExcel}
              disabled={!filteredItems.length}
              className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Export Excel
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[210px]">
            <div className="text-[11px] font-medium text-slate-500 mb-1">
              Card
            </div>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200"
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

          <div className="min-w-[260px]">
            <div className="text-[11px] font-medium text-slate-500 mb-1">
              VA Name
            </div>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200"
              value={selectedVaId ?? ""}
              onChange={(e) =>
                setSelectedVaId(e.target.value ? Number(e.target.value) : null)
              }
              disabled={loadingVa || activeAccountId == null}
            >
              <option value="">{loadingVa ? "Loading..." : "All"}</option>
              {(accountVAs as any[]).map((va) => (
                <option key={va.id} value={va.id}>
                  {va.name || va.accountNumber || `VA #${va.id}`}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-[180px]">
            <div className="text-[11px] font-medium text-slate-500 mb-1">
              Status
            </div>
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

          <div className="min-w-[160px]">
            <div className="text-[11px] font-medium text-slate-500 mb-1">
              Country
            </div>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            >
              <option value="">All</option>
              {countryOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-[160px]">
            <div className="text-[11px] font-medium text-slate-500 mb-1">
              Year
            </div>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200"
              value={yearPreset === "" ? "" : String(yearPreset)}
              onChange={(e) => {
                const v = e.target.value;
                setYearPreset(v ? Number(v) : "");
              }}
            >
              <option value="">Custom</option>
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-[240px]">
            <div className="text-[11px] font-medium text-slate-500 mb-1">
              Quick
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onLast365Days}
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 hover:bg-slate-50"
              >
                One Year
              </button>

              <button
                type="button"
                onClick={onToday}
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 hover:bg-slate-50"
              >
                Clear
              </button>

            </div>
          </div>

          {/* Total want (ONLY multi-day) */}
          <div className="min-w-[160px]" style={{display: "none"}}>
            <div className="text-[11px] font-medium text-slate-500 mb-1">
              Total (multi-day)
            </div>
            <input
              type="number"
              min={1}
              value={totalWant}
              onChange={(e) => setTotalWant(Number(e.target.value || 0))}
              disabled={singleDayMode}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-50"
            />
          </div>

          {/* Date range (TAILADMIN / FLATPICKR) */}
          <div className="min-w-[240px]">
            <div className="text-[11px] font-medium text-slate-500 mb-1">
              From
            </div>
            <div className="relative">
              <Flatpickr
                value={ymdToDate(fromDate) || undefined}
                options={{
                  dateFormat: "d/m/Y",
                  allowInput: true,
                  appendTo: document.body, 
                }}
                onChange={(dates: Date[]) => {
                  setYearPreset("");
                  setFromDate(dates?.[0] ? toYmd(dates[0]) : "");
                }}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 pr-10 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="dd/mm/yyyy"
              />

              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M7 3v2M17 3v2M4 9h16M6 5h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </div>
          </div>

          <div className="min-w-[240px]">
            <div className="text-[11px] font-medium text-slate-500 mb-1">
              To
            </div>
            <div className="relative">
              <Flatpickr
                value={ymdToDate(toDate) || undefined}
                options={{
                  dateFormat: "d/m/Y",
                  allowInput: true,
                  appendTo: document.body,
                }}
                onChange={(dates: Date[]) => {
                  setYearPreset("");
                  setToDate(dates?.[0] ? toYmd(dates[0]) : "");
                }}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 pr-10 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="dd/mm/yyyy"
              />

              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M7 3v2M17 3v2M4 9h16M6 5h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </div>
          </div>

          <div className="ml-auto text-xs text-slate-500 pb-2">
            {fetching ? "Loading..." : `Auto load • Page size: ${pageSize}`}
          </div>
        </div>

        {scanResult && (
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-4 text-sm space-y-2">
            <div className="font-semibold text-indigo-700">Scan result</div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-slate-700">
              <div>
                <div className="text-xs text-slate-500">Total pages</div>
                <div className="font-semibold">{scanResult.totalPages}</div>
              </div>

              <div>
                <div className="text-xs text-slate-500">Total items</div>
                <div className="font-semibold">{scanResult.totalItemsLoaded}</div>
              </div>

              <div>
                <div className="text-xs text-slate-500">First page size</div>
                <div className="font-semibold">{scanResult.firstPageSize ?? "-"}</div>
              </div>

              <div>
                <div className="text-xs text-slate-500">Stop reason</div>
                <div className="font-semibold">{scanResult.stopReason || "-"}</div>
              </div>
            </div>

            <details className="pt-2">
              <summary className="cursor-pointer text-xs text-indigo-600">
                Show page breakdown
              </summary>

              <div className="mt-2 max-h-[240px] overflow-auto rounded-xl bg-white border border-slate-200">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Page</th>
                      <th className="px-3 py-2 text-left">Items</th>
                      <th className="px-3 py-2 text-left">Has next</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scanResult.pageItemCounts.map((c, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="px-3 py-2">#{idx + 1}</td>
                        <td className="px-3 py-2">{c}</td>
                        <td className="px-3 py-2">
                          {scanResult.nextCursors[idx] ? "Yes" : "No"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </div>
        )}

        {/* Stats + Pager */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="text-sm font-semibold text-slate-800">
            Transaction: {totalLoaded}
            {!singleDayMode && safeTotalWant ? ` / ${safeTotalWant}` : ""}
            {typeof serverCount === "number" ? " " : ""}
            {nextCursor ? " (more available)" : ""}
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
                            ? "text-red-500 font-semibold bg-red-50 px-4 py-1 rounded-full"
                            : "text-green-500 font-semibold bg-green-50 px-4 py-1 rounded-full"
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
                      <div className="truncate">{txDescription(tx)}</div>
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

export default TransactionManager;
