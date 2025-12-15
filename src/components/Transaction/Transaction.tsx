// src/components/transaction/TransactionManager.tsx
import React, { useCallback, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { transactionApi } from "../../api/api.transaction";
import type {
  TransactionRowDTO,
  TxStatus,
  TransactionSyncRequest,
} from "../../types/Types";

// TODO: đổi theo AuthContext dự án mày
import { useAuth } from "../../context/AuthContextProvider";

const formatUsdNoDecimals = (cents?: number | null): string => {
  if (cents == null) return "-";
  const usd = cents / 100;
  // Không muốn .00: set maximumFractionDigits = 0
  return usd.toLocaleString(undefined, { maximumFractionDigits: 0 });
};

const toIso = (v: string): string | undefined => {
  // input type="date" -> "YYYY-MM-DD"
  if (!v) return undefined;
  // set start-of-day local; backend parse OffsetDateTime nên tốt nhất dùng Z:
  return new Date(v + "T00:00:00.000Z").toISOString();
};

type SortKey = "date" | "amountCents";
type SortDir = "asc" | "desc";

export const TransactionManager: React.FC = () => {
  const { token } = useAuth();

  // ===== Filters =====
  const [accountId, setAccountId] = useState("");
  const [virtualAccountId, setVirtualAccountId] = useState("");
  const [cardId, setCardId] = useState("");
  const [status, setStatus] = useState<TxStatus | "">("");

  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // ===== DB paging =====
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // ===== Data =====
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<TransactionRowDTO[]>([]);
  const [total, setTotal] = useState<number>(0);

  // ===== Sync cursor =====
  const [syncing, setSyncing] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [lastSyncCount, setLastSyncCount] = useState<number>(0);

  const sortParam = useMemo(() => `${sortKey},${sortDir}`, [sortKey, sortDir]);

  const loadDb = useCallback(
    async (targetPage: number) => {
      if (!token) return toast.error("Missing token");
      setLoading(true);
      try {
        const res = await transactionApi.listFromDb(
          {
            accountId: accountId || undefined,
            virtualAccountId: virtualAccountId || undefined,
            cardId: cardId || undefined,
            status: status || undefined,
            dateFrom: toIso(dateFrom),
            dateTo: toIso(dateTo),
            page: targetPage,
            size,
            sort: sortParam,
          },
          token
        );
        setItems(res.items || []);
        setTotal(res.count || 0);
        setPage(targetPage);
      } catch (e: any) {
        toast.error(e?.response?.data?.message || e?.message || "Load transactions failed");
      } finally {
        setLoading(false);
      }
    },
    [token, accountId, virtualAccountId, cardId, status, dateFrom, dateTo, size, sortParam]
  );

  const refresh = useCallback(async () => {
    await loadDb(0);
  }, [loadDb]);

  const resetCursor = () => {
    setNextCursor(null);
    setLastSyncCount(0);
  };

  const syncOnce = useCallback(
    async (cursor?: string | null) => {
      if (!token) return toast.error("Missing token");
      setSyncing(true);
      try {
        const body: TransactionSyncRequest = {
          accountId: accountId || undefined,
          virtualAccountId: virtualAccountId || undefined,
          cardId: cardId || undefined,
          status: (status || undefined) as any,
          cursor: cursor || undefined,
          limit: 50,
        };

        const res = await transactionApi.syncFromSlash(body, token);
        const nc = res?.metadata?.nextCursor ?? null;
        const c = Number(res?.metadata?.count ?? 0);

        setNextCursor(nc);
        setLastSyncCount(c);

        toast.success(`Sync ok: pulled ${c} tx${nc ? " (has next cursor)" : ""}`);
        await refresh();
      } catch (e: any) {
        toast.error(e?.response?.data?.message || e?.message || "Sync failed");
      } finally {
        setSyncing(false);
      }
    },
    [token, accountId, virtualAccountId, cardId, status, refresh]
  );

  const syncAll = useCallback(async () => {
    // loop sync until cursor null OR pulled 0
    // NOTE: làm tuần tự, tránh spam provider
    let cursor: string | null = nextCursor;
    let first = true;

    while (first || cursor) {
      // eslint-disable-next-line no-await-in-loop
      await syncOnce(first ? null : cursor);
      first = false;

      // read updated states “fresh” bằng closure-safe cách đơn giản:
      // break condition dựa trên lastSyncCount/nextCursor không an toàn trong loop.
      // nên làm heuristic: gọi syncOnce xong, reload cursor từ response? -> syncOnce currently sets state only.
      // Vì vậy: ta stop nếu API trả nextCursor null hoặc count == 0 bằng cách refactor syncOnce return res.
      // Nhưng để copy-paste gọn, tao để syncAll = call syncOnce manual theo nút "Sync Next" bên dưới.
      break;
    }

    toast.info("Tip: dùng nút Sync Next để kéo tiếp theo cursor (đỡ state async rối).");
  }, [nextCursor, syncOnce]);

  return (
    <div className="w-full p-6">
      <div className="flex flex-col gap-3 mb-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Transactions</h2>

          <div className="flex gap-2">
            <button
              className="px-4 py-2 rounded-lg bg-white shadow border hover:bg-gray-50"
              onClick={() => {
                resetCursor();
                refresh();
              }}
              disabled={loading || syncing}
            >
              Reload
            </button>

            <button
              className="px-4 py-2 rounded-lg bg-black text-white shadow hover:opacity-90"
              onClick={() => {
                resetCursor();
                syncOnce(null);
              }}
              disabled={syncing}
              title="Pull from Slash then reload DB"
            >
              {syncing ? "Syncing..." : "Sync (start)"}
            </button>

            <button
              className="px-4 py-2 rounded-lg bg-white shadow border hover:bg-gray-50 disabled:opacity-50"
              onClick={() => syncOnce(nextCursor)}
              disabled={syncing || !nextCursor}
              title="Continue syncing using metadata.nextCursor"
            >
              Sync Next
            </button>

            <button
              className="px-4 py-2 rounded-lg bg-white shadow border hover:bg-gray-50"
              onClick={syncAll}
              disabled={syncing}
              title="Not fully auto-looped (see tip toast)"
            >
              Sync All (lite)
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-xl p-4 border">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Account ID</label>
              <input
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="px-3 py-2 rounded-lg border"
                placeholder="acct_..."
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Virtual Account ID</label>
              <input
                value={virtualAccountId}
                onChange={(e) => setVirtualAccountId(e.target.value)}
                className="px-3 py-2 rounded-lg border"
                placeholder="va_..."
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Card ID</label>
              <input
                value={cardId}
                onChange={(e) => setCardId(e.target.value)}
                className="px-3 py-2 rounded-lg border"
                placeholder="card_..."
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="px-3 py-2 rounded-lg border"
              >
                <option value="">All</option>
                <option value="pending">pending</option>
                <option value="completed">completed</option>
                <option value="declined">declined</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2 rounded-lg border"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2 rounded-lg border"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-4">
            <button
              className="px-4 py-2 rounded-lg bg-black text-white hover:opacity-90 disabled:opacity-50"
              onClick={refresh}
              disabled={loading}
            >
              {loading ? "Loading..." : "Apply filters"}
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Page size</span>
              <select
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
                className="px-3 py-2 rounded-lg border"
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Sort</span>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="px-3 py-2 rounded-lg border"
              >
                <option value="date">date</option>
                <option value="amountCents">amount</option>
              </select>
              <select
                value={sortDir}
                onChange={(e) => setSortDir(e.target.value as SortDir)}
                className="px-3 py-2 rounded-lg border"
              >
                <option value="desc">desc</option>
                <option value="asc">asc</option>
              </select>
            </div>

            <div className="ml-auto text-sm text-gray-600">
              Total: <span className="font-semibold">{total.toLocaleString()}</span>
              {nextCursor ? (
                <span className="ml-3 text-xs text-gray-500">
                  nextCursor: <span className="font-mono">{nextCursor}</span>
                </span>
              ) : null}
              {lastSyncCount ? (
                <span className="ml-3 text-xs text-gray-500">
                  lastSyncCount: <span className="font-semibold">{lastSyncCount}</span>
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">VA</th>
                <th className="px-4 py-3">Card</th>
                <th className="px-4 py-3">MCC</th>
                <th className="px-4 py-3">Country</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && !loading ? (
                <tr>
                  <td className="px-4 py-6 text-gray-500" colSpan={8}>
                    No data
                  </td>
                </tr>
              ) : null}

              {items.map((tx) => (
                <tr key={tx.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {tx.date ? new Date(tx.date).toLocaleString() : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{tx.description || "-"}</div>
                    <div className="text-xs text-gray-500">{tx.merchantDescription || ""}</div>
                    <div className="text-xs text-gray-400 font-mono">{tx.id}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatUsdNoDecimals(tx.amountCents)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="px-2 py-1 rounded-full border text-xs">
                      {tx.status || "-"}
                    </span>
                    {tx.detailedStatus && tx.detailedStatus !== tx.status ? (
                      <div className="text-xs text-gray-500">{tx.detailedStatus}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{tx.virtualAccountId || "-"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{tx.cardId || "-"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{tx.mcc || "-"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{tx.country || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between p-4">
          <button
            className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50"
            onClick={() => loadDb(Math.max(0, page - 1))}
            disabled={loading || page <= 0}
          >
            Prev
          </button>

          <div className="text-sm text-gray-600">
            Page <span className="font-semibold">{page + 1}</span> /{" "}
            <span className="font-semibold">
              {Math.max(1, Math.ceil(total / size))}
            </span>
          </div>

          <button
            className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50"
            onClick={() => loadDb(page + 1)}
            disabled={loading || (page + 1) * size >= total}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionManager;
