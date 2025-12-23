import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import api from "../../config/api.config";
import { useAuth } from "../../context/AuthContextProvider";
import { virtualAccountApi } from "../../api/api.virtualaccout";

import type {
  Account,
  VirtualAccount,
  Card,
  TransactionItemDTO,
} from "../../types/Types";

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import Flatpickr from "react-flatpickr";

type Props = {
  pageSize?: number;
};

export type TxStatusFilter =
  | ""
  | "pending"
  | "settled"
  | "declined"
  | "refund"
  | "reversed"
  | "returned"
  | "dispute";

type StatusKey = Exclude<TxStatusFilter, "">;

const STATUS_ORDER: StatusKey[] = [
  "pending",
  "settled",
  "declined",
  "refund",
  "reversed",
  "returned",
  "dispute",
];

const STATUS_LABEL: Record<StatusKey, string> = {
  pending: "Pending",
  settled: "Settled",
  declined: "Declined",
  refund: "Refund",
  reversed: "Reversed",
  returned: "Returned",
  dispute: "Dispute",
};

const TOTAL_ONLY = new Set<string>(["pending", "settled"]);

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

const moneyClass = (cents?: number | null) => {
  const v = Number(cents ?? 0);
  if (!Number.isFinite(v) || v === 0) return "text-slate-900";
  return v < 0 ? "text-red-600" : "text-green-600";
};

const sanitizeFilename = (name: string) => {
  const safe = (name || "account")
    .replace(/[\/\\:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  return safe.slice(0, 80) || "account";
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

type Sum = { count: number; amountCents: number };
type CountryBucketKey = "NON_US" | "US" | "UNKNOWN";
type CountryCalc = {
  key: CountryBucketKey;
  label: string;
  total: Sum;
  byStatus: Record<StatusKey, Sum>;
};

const initStatusMap = (): Record<StatusKey, Sum> => {
  const m = {} as Record<StatusKey, Sum>;
  for (const k of STATUS_ORDER) m[k] = { count: 0, amountCents: 0 };
  return m;
};

const toStatusKey = (s: string): StatusKey | null => {
  const x = s.trim().toLowerCase();
  return (STATUS_ORDER as string[]).includes(x) ? (x as StatusKey) : null;
};

const txStatusNormalized = (tx: any): string =>
  String(tx?.detailedStatus ?? "").trim().toLowerCase();

const normalizeCountry = (raw: any): string =>
  (raw ?? "").toString().trim().toUpperCase();

const getTxCountryRaw = (tx: any): any => {
  return (
    tx?.merchantData?.location?.country ??
    tx?.merchantData?.location?.countryCode ??
    tx?.merchantData?.country ??
    tx?.merchantCountry ??
    tx?.country ??
    tx?.location?.country ??
    tx?.location?.countryCode ??
    tx?.merchant?.country ??
    tx?.merchant?.location?.country ??
    ""
  );
};

const isUSCountryValue = (raw: any): boolean => {
  const c = normalizeCountry(raw);
  if (!c) return false;

  if (c === "US" || c === "USA") return true;
  if (c.includes("UNITED STATES")) return true;
  if (c === "UNITED STATES OF AMERICA") return true;

  if (c.startsWith("US") && c.length > 2) {
    const ch = c[2];
    if (ch === "-" || ch === "/" || ch === "_" || ch === "." || ch === " ")
      return true;
  }

  return false;
};

const isUSTxHeuristic = (tx: any): boolean => {
  const raw = getTxCountryRaw(tx);
  if (isUSCountryValue(raw)) return true;

  const loc = tx?.merchantData?.location ?? tx?.location ?? {};
  const state = (loc?.state ?? loc?.region ?? "")
    .toString()
    .trim()
    .toUpperCase();
  const postal = (loc?.postalCode ?? loc?.zip ?? "").toString().trim();
  const city = (loc?.city ?? "").toString().trim().toUpperCase();

  const US_STATES = new Set([
    "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
    "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
    "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
  ]);

  if (US_STATES.has(state)) return true;
  if (/^\d{5}(-\d{4})?$/.test(postal)) return true;

  if (city === "NEW YORK" || city === "LOS ANGELES" || city === "SAN FRANCISCO")
    return true;

  return false;
};

const getTxCountryNorm = (tx: any): string => {
  const c = normalizeCountry(getTxCountryRaw(tx));
  if (c) return c;
  if (isUSTxHeuristic(tx)) return "US";
  return ""; // unknown
};

const getTxCountryRawNorm = (tx: any): string =>
  normalizeCountry(getTxCountryRaw(tx));

const getTxIdAny = (tx: any): string => {
  const candidates = [
    tx?.id,
    tx?.transactionId,
    tx?.txId,
    tx?.transaction_id,
    tx?.providerAuthorizationId,
    tx?.provider_authorization_id,
    tx?.providerTransactionId,
    tx?.provider_transaction_id,
    tx?.authorizationId,
    tx?.authorization_id,
  ];

  for (const c of candidates) {
    const s = (c ?? "").toString().trim();
    if (s) return s;
  }
  return "";
};

const txKey = (tx: any): string => {
  const realId = getTxIdAny(tx);
  if (realId) return `id:${realId}`;

  const cardId = (tx?.cardId ?? "").toString().trim();
  const t = tx?.occurredAt ?? tx?.authorizedAt ?? tx?.date ?? tx?.createdAt ?? "";
  const time = String(t ?? "").trim();
  const amt = String(Math.trunc(Number(tx?.amountCents ?? 0) || 0));
  const st = String(tx?.detailedStatus ?? "").trim().toLowerCase();
  const m = String(
    tx?.merchantDescription ??
      tx?.merchantData?.description ??
      tx?.description ??
      tx?.memo ??
      ""
  )
    .trim()
    .toLowerCase();

  return `k:${cardId}|${time}|${amt}|${st}|${m}`;
};

const dedupeTx = <T,>(arr: T[]): T[] => {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const tx of arr || []) {
    const k = txKey(tx as any);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(tx);
  }
  return out;
};

const amountCentsNormalized = (tx: any): number => {
  const raw = Math.trunc(Number(tx?.amountCents ?? 0) || 0);
  if (!Number.isFinite(raw) || raw === 0) return 0;
  return raw;
};

type DataSourceMode = "LIVE";

export const TransactionManager: React.FC<Props> = ({ pageSize = 50 }) => {
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
  const [country, setCountry] = useState<string>("");

  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const thisYear = new Date().getFullYear();
  const [yearPreset, setYearPreset] = useState<number | "">("");

  const [items, setItems] = useState<TransactionItemDTO[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [serverCount, setServerCount] = useState<number | null>(null);

  const [loadingVa, setLoadingVa] = useState(false);
  const [accountVAs, setAccountVAs] = useState<VirtualAccount[]>([]);

  const [loadingCards, setLoadingCards] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);

  const [page, setPage] = useState(0);

  const [mode] = useState<DataSourceMode>("LIVE");
  const lastFetchKeyRef = useRef<string>("");
  const fetchAbortRef = useRef<AbortController | null>(null);

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

  const safeTotalWant = 50000;

  const buildCommonParams = () => {
    const params: Record<string, any> = { accountId: activeAccountId };

    if (selectedVaId != null) params.virtualAccountId = selectedVaId;

    const fd = fromDate || toYmd(new Date());
    const td = toDate || toYmd(new Date());

    setIf(params, "filter:from_date", localDayStartMs(fd));
    setIf(params, "filter:to_date", localDayEndMs(td));
    setIf(params, "filter:cardId", selectedCardSlashId);

    setIf(
      params,
      "filter:detailed_status",
      status ? String(status).toLowerCase() : ""
    );
    setIf(params, "filter:country", country);

    return params;
  };

  const buildLiveParams = (cursor?: string | null) => {
    const params = buildCommonParams();
    if (safeTotalWant > 0) setIf(params, "total", safeTotalWant);
    setIf(params, "cursor", cursor);
    return params;
  };

  const resetData = () => {
    setPage(0);
    setItems([]);
    setNextCursor(null);
    setServerCount(null);
  };

  const fetchLive = async (cursor?: string | null, append?: boolean) => {
    if (!activeAccountId) return;

    if (fetchAbortRef.current) fetchAbortRef.current.abort();
    const ac = new AbortController();
    fetchAbortRef.current = ac;

    setFetching(true);
    try {
      const liveParams = buildLiveParams(cursor);

      const res = await api.get<any>("/api/transactions", {
        params: liveParams,
        signal: ac.signal,
      });

      const data: any = res.data;
      const newItems = data?.items ?? [];
      const nc = data?.metadata?.nextCursor ?? data?.metadata?.next_cursor ?? null;

      const count = data?.metadata?.count;
      const sc = typeof count === "number" ? count : null;
      setServerCount(sc);

      setItems((prev) => {
        const merged = append
          ? [...(prev ?? []), ...(newItems ?? [])]
          : (newItems ?? []);
        return dedupeTx(merged);
      });

      setNextCursor(nc);
    } catch (e: any) {
      if (e?.name === "CanceledError" || e?.code === "ERR_CANCELED") {
        // ignore
      } else {
        console.error(e);
        toast.error(e?.response?.data?.message || "Fetch transactions failed");
      }
    } finally {
      setFetching(false);
    }
  };

  const fetchTransactions = async (cursor?: string | null, append?: boolean) => {
    if (!activeAccountId) return;
    await fetchLive(cursor, append);
  };

  useEffect(() => {
    if (!activeAccountId) return;

    const key = JSON.stringify({
      activeAccountId,
      selectedVaId,
      selectedCardSlashId,
      status,
      country,
      fromDate,
      toDate,
      totalWant: safeTotalWant,
      pageSize,
    });

    if (lastFetchKeyRef.current === key) return;
    lastFetchKeyRef.current = key;

    resetData();
    fetchTransactions(null, false);
  }, [
    activeAccountId,
    selectedVaId,
    selectedCardSlashId,
    status,
    country,
    fromDate,
    toDate,
    pageSize,
  ]);

  

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

  const txCountry = (tx: TransactionItemDTO) => getTxCountryNorm(tx) || "—";

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
      const c = getTxCountryNorm(tx);
      if (c) s.add(c);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filteredItems = useMemo(() => {
    let base: any[] = dedupeTx(items ?? []);

    if (country.trim()) {
      const want = country.trim().toUpperCase();
      base = base.filter((tx: any) => getTxCountryNorm(tx) === want);
    }

    if (status) {
      const want = String(status).toLowerCase();
      base = base.filter((tx: any) => txStatusNormalized(tx) === want);
    }

    return base;
  }, [items, country, status]);

  const calcBuckets = useMemo<CountryCalc[]>(() => {
    const base = dedupeTx(filteredItems ?? []);

    const init = (key: CountryBucketKey, label: string): CountryCalc => ({
      key,
      label,
      total: { count: 0, amountCents: 0 },
      byStatus: initStatusMap(),
    });

    const nonUs = init("NON_US", "NON-US (All except US)");
    const us = init("US", "US");
    const unknown = init("UNKNOWN", "UNKNOWN (No country)");

    for (const tx of base as any[]) {
      const amt = amountCentsNormalized(tx);
      const rawC = getTxCountryRawNorm(tx);
      const stNorm = txStatusNormalized(tx);

      let bucket: CountryCalc;
      if (!rawC) bucket = unknown;
      else if (isUSCountryValue(rawC)) bucket = us;
      else bucket = nonUs;

      bucket.total.count += 1;

      if (TOTAL_ONLY.has(stNorm)) {
        bucket.total.amountCents += amt;
      }

      const st = toStatusKey(stNorm);
      if (st) {
        bucket.byStatus[st].count += 1;
        bucket.byStatus[st].amountCents += amt;
      }
    }

    return unknown.total.count > 0 ? [nonUs, us, unknown] : [nonUs, us];
  }, [filteredItems]);

  const totalLoaded = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalLoaded / pageSize));
  const pageItems = filteredItems.slice(page * pageSize, page * pageSize + pageSize);

  const ensureDataForPage = async (targetPage: number) => {
    const need = (targetPage + 1) * pageSize;
    if (items.length >= need) return;
    if (!nextCursor) return;
    if (fetching) return;
    await fetchTransactions(nextCursor, true);
  };

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
      Amount: fmtUsd(amountCentsNormalized(tx)),
      Status: tx.detailedStatus || "",
      Reason: tx.declineReason || tx.approvalReason || "",
      Description: txDescription(tx),
      Merchant: txMerchant(tx),
      Country: txCountry(tx),
      Date: txDate(tx),
      TxId: getTxIdAny(tx) || "",
      CountryRaw: getTxCountryRawNorm(tx) || "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");

    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });

    const accName = sanitizeFilename(
      activeAccount?.name || `account_${activeAccountId ?? "unknown"}`
    );
    const fileName = `transactions_${accName}_${Date.now()}.xlsx`;

    saveAs(new Blob([buf], { type: "application/octet-stream" }), fileName);
  };

  const yearOptions = useMemo(() => {
    const ys: number[] = [];
    for (let y = thisYear; y >= thisYear - 5; y--) ys.push(y);
    return ys;
  }, [thisYear]);

  const summaryStatusKeys = useMemo(() => {
    if (status) return [status as StatusKey];
    return STATUS_ORDER;
  }, [status]);

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
              <span className="ml-2">
                • Source: <span className="font-semibold">{mode}</span>
              </span>
              {serverCount != null ? (
                <span className="ml-2 text-slate-400">
                  • serverCount: {serverCount}
                </span>
              ) : null}
              {safeTotalWant ? (
                <span className="ml-2 text-slate-400">• total={safeTotalWant}</span>
              ) : null}
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
              disabled={!filteredItems.length}
              className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Export Excel
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3">
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

          <div className="min-w-[260px]">
            <div className="text-[11px] font-medium text-slate-500 mb-1">VA Name</div>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200"
              value={selectedVaId ?? ""}
              onChange={(e) => setSelectedVaId(e.target.value ? Number(e.target.value) : null)}
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
            <div className="text-[11px] font-medium text-slate-500 mb-1">Status</div>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200"
              value={status}
              onChange={(e) => setStatus(e.target.value as TxStatusFilter)}
            >
              <option value="">All</option>
              {STATUS_ORDER.map((k) => (
                <option key={k} value={k}>
                  {STATUS_LABEL[k]}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-[160px]">
            <div className="text-[11px] font-medium text-slate-500 mb-1">Country</div>
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
            <div className="text-[11px] font-medium text-slate-500 mb-1">Year</div>
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
            <div className="text-[11px] font-medium text-slate-500 mb-1">Quick</div>
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

          <div className="min-w-[240px]">
            <div className="text-[11px] font-medium text-slate-500 mb-1">From</div>
            <div className="relative">
              <Flatpickr
                value={ymdToDate(fromDate) || undefined}
                options={{ dateFormat: "d/m/Y", allowInput: true, appendTo: document.body }}
                onChange={(dates: Date[]) => {
                  setYearPreset("");
                  setFromDate(dates?.[0] ? toYmd(dates[0]) : "");
                }}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 pr-10 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="dd/mm/yyyy"
              />
            </div>
          </div>

          <div className="min-w-[240px]">
            <div className="text-[11px] font-medium text-slate-500 mb-1">To</div>
            <div className="relative">
              <Flatpickr
                value={ymdToDate(toDate) || undefined}
                options={{ dateFormat: "d/m/Y", allowInput: true, appendTo: document.body }}
                onChange={(dates: Date[]) => {
                  setYearPreset("");
                  setToDate(dates?.[0] ? toYmd(dates[0]) : "");
                }}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 pr-10 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="dd/mm/yyyy"
              />
            </div>
          </div>

          <div className="ml-auto text-xs text-slate-500 pb-2">
            {fetching ? "Loading..." : `Auto load • Page size: ${pageSize} • total=${safeTotalWant}`}
          </div>
        </div>

        {/* Total Summary */}
        <div className="rounded-3xl bg-white border border-slate-200/70 px-5 py-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div className="text-sm font-semibold text-slate-800">Total Summary</div>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            {calcBuckets.map((b) => (
              <div
                key={b.key}
                className="rounded-2xl border border-slate-200 bg-slate-50/40 px-4 py-3"
              >
                <div className="text-sm font-semibold text-slate-900">
                  {b.label}{" "}
                  <span className="text-slate-500 font-medium">
                    ({b.total.count} transactions)
                  </span>
                </div>

                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Amount:</span>
                    <span className={`font-semibold ${moneyClass(b.total.amountCents)}`}>
                      {fmtUsd(b.total.amountCents)}
                    </span>
                  </div>

                  {summaryStatusKeys.map((k) => {
                    const v = b.byStatus[k];
                    const label = STATUS_LABEL[k];
                    return (
                      <div key={k} className="flex justify-between">
                        <span className="text-slate-500">{label}:</span>
                        <span className={`font-semibold ${moneyClass(v.amountCents)}`}>
                          {fmtUsd(v.amountCents)}{" "}
                          <span className="text-slate-500 font-medium">({v.count})</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pager */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="text-sm font-semibold text-slate-800">
            Transaction: {totalLoaded}
            {safeTotalWant ? ` / ${safeTotalWant}` : ""}
            {nextCursor ? " (more available)" : ""}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
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
                  <tr key={txKey(tx)} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-900">
                      {cardLabel(tx)}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={
                          amountCentsNormalized(tx) < 0
                            ? "text-red-500 font-semibold bg-red-50 px-4 py-1 rounded-full"
                            : "text-green-500 font-semibold bg-green-50 px-4 py-1 rounded-full"
                        }
                      >
                        {fmtUsd(amountCentsNormalized(tx))}
                      </span>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-slate-700 capitalize">
                      {tx.detailedStatus || "—"}
                    </td>

                    <td className="px-4 py-3 text-slate-700 max-w-[360px]">
                      <div className="truncate">{txDescription(tx)} — {tx.declineReason || tx.approvalReason}</div>
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
              onClick={async () => {
                await fetchTransactions(nextCursor, true);
              }}
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
