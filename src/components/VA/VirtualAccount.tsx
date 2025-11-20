// src/components/VirtualAccountManager.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContextProvider";
import { VirtualAccount } from "../../types/Types";
import { virtualAccountApi } from "../../api/api.virtualaccout";
import { toast } from "react-toastify";

interface Props {
  pageSize?: number;
}

export const VirtualAccountManager: React.FC<Props> = ({ pageSize = 10 }) => {
  const { user, loading } = useAuth();

  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    null
  );
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [data, setData] = useState<VirtualAccount[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createFlatFee, setCreateFlatFee] = useState<number>(0);
  const [createInitialFunding, setCreateInitialFunding] = useState<number>(0);
  const [creating, setCreating] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingVa, setEditingVa] = useState<VirtualAccount | null>(null);
  const [editName, setEditName] = useState("");
  const [editTakeRate, setEditTakeRate] = useState<number>(0);

  const accounts = useMemo(() => user?.accounts ?? [], [user]);

  const formatUsd = (cents?: number | null) => {
    if (cents == null) return "-";
    const dollars = cents / 100;
    return dollars.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  useEffect(() => {
    if (loading) return;

    if (user?.activeAccount) {
      if (selectedAccountId !== user.activeAccount.id) {
        setSelectedAccountId(user.activeAccount.id);
        setPage(0);
      }
    } else if (
      !user?.activeAccount &&
      accounts.length > 0 &&
      selectedAccountId == null
    ) {
      setSelectedAccountId(accounts[0].id);
      setPage(0);
    } else if (accounts.length === 0) {
      setSelectedAccountId(null);
      setPage(0);
    }
  }, [loading, user?.activeAccount?.id, accounts, selectedAccountId]);

  const loadData = async (accountId: number, pageIndex: number) => {
    setFetching(true);
    try {
      const res = await virtualAccountApi.getByAccountPaged(
        accountId,
        pageIndex,
        pageSize
      );

      setData(res.content);
      setPage(
        typeof res.page === "number" &&
          Number.isFinite(res.page) &&
          res.page >= 0
          ? res.page
          : 0
      );
      setTotalPages(
        typeof res.totalPages === "number" && Number.isFinite(res.totalPages)
          ? res.totalPages
          : 0
      );
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Not load được danh sách VA");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (selectedAccountId != null) {
      loadData(selectedAccountId, page);
    } else {
      setData([]);
    }
  }, [selectedAccountId, page]);

  const handleSync = async () => {
    if (selectedAccountId == null) return;
    setSyncing(true);
    try {
      await virtualAccountApi.syncAccount(selectedAccountId);
      setPage(0);
      await loadData(selectedAccountId, 0);
      toast.success("Sync virtual accounts thành công");
    } catch (err: any) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || "Sync virtual accounts thất bại"
      );
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Xoá virtual account này luôn hả?")) return;
    try {
      await virtualAccountApi.deleteVirtualAccount(id);
      toast.success("Xoá virtual account thành công");
      if (selectedAccountId != null) {
        await loadData(selectedAccountId, page);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || "Không xoá được virtual account"
      );
    }
  };

  const openCreateModal = () => {
    setCreateName("");
    setCreateFlatFee(0);
    setCreateInitialFunding(0);
    setShowCreate(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId) {
      toast.error("Chưa chọn account");
      return;
    }
    if (!createName.trim()) {
      toast.error("Name không được để trống");
      return;
    }

    try {
      setCreating(true);

      await virtualAccountApi.createVirtualAccount({
        accountId: selectedAccountId,
        name: createName.trim(),
        flatFeePercent: Number(createFlatFee) || 0,
        initialFundingUsd: Number(createInitialFunding) || 0,
      });

      toast.success("Tạo virtual account thành công");
      setShowCreate(false);
      setPage(0);
      await loadData(selectedAccountId, 0);
    } catch (err: any) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || "Không tạo được virtual account"
      );
    } finally {
      setCreating(false);
    }
  };

  const openEditModal = (va: VirtualAccount) => {
    setEditingVa(va);
    setEditName(va.name ?? "");

    const raw = (va as any).commissionAmountCents as number | undefined;
    setEditTakeRate(raw ? raw / 100 : 0);

    setShowEdit(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVa) return;
    if (!editName.trim()) {
      toast.error("Name không được để trống");
      return;
    }

    try {
      await virtualAccountApi.updateVirtualAccount({
        id: editingVa.id,
        name: editName.trim(),
        takeRatePercent: Number(editTakeRate) || 0,
      });

      toast.success("Cập nhật virtual account thành công");
      setShowEdit(false);
      if (selectedAccountId != null) {
        await loadData(selectedAccountId, page);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || "Không cập nhật được virtual account"
      );
    }
  };

  if (loading) return <div>Check auth...</div>;
  if (!user) return <div>Not logged in</div>;

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-6">
        <div className="space-y-4">
          {/* Header / controls giữ nguyên */}
          <div className="flex flex-wrap items-center gap-3 justify-between mb-2">
            <div className="text-sm text-gray-600">
              Account:&nbsp;
              <span className="font-semibold text-slate-900">
                {user.activeAccount
                  ? user.activeAccount.name
                  : "Chưa chọn account"}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                className="px-4 py-2 text-sm rounded-xl bg-emerald-500 text-white disabled:opacity-60 shadow-sm hover:bg-emerald-600 transition"
                onClick={openCreateModal}
                disabled={selectedAccountId == null}
              >
                + Create Virtual Account
              </button>

              <button
                className="px-4 py-2 text-sm rounded-xl bg-blue-600 text-white disabled:opacity-60 shadow-sm hover:bg-blue-700 transition"
                onClick={handleSync}
                disabled={syncing || selectedAccountId == null}
              >
                {syncing ? "Syncing..." : "Sync Virtual Accounts"}
              </button>
            </div>
          </div>

          {/* ================== NEW TABLE UI ================== */}
          <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60">
            <div className="max-w-full overflow-x-auto">
              <table className="min-w-full text-xs sm:text-sm">
                <thead className="bg-slate-100/80 backdrop-blur">
                  <tr className="border-b border-slate-200/70">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Routing
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Account
                    </th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Balance
                    </th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Spend (30d)
                    </th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Take Rate
                    </th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {fetching ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-4 text-center text-xs text-slate-500"
                      >
                        Loading virtual accounts...
                      </td>
                    </tr>
                  ) : data.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-7 text-center text-xs sm:text-sm text-slate-500"
                      >
                        No virtual accounts found
                      </td>
                    </tr>
                  ) : (
                    data.map((va) => (
                      <tr
                        key={va.id}
                        className="bg-white/60 hover:bg-indigo-50/60 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-semibold text-indigo-700">
                              {va.name?.[0]?.toUpperCase() || "V"}
                            </div>
                            <div>
                              <div className="text-xs sm:text-sm font-medium text-slate-900">
                                {va.name ?? "-"}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3 align-middle">
                          <div className="inline-flex rounded-full bg-slate-900/90 px-2.5 py-1 text-[10px] font-mono text-slate-50">
                            {va.routingNumber ?? "-"}
                          </div>
                        </td>

                        <td className="px-4 py-3 align-middle">
                          <div className="inline-flex rounded-full bg-slate-900/90 px-2.5 py-1 text-[10px] font-mono text-slate-50">
                            {va.accountNumber ?? "-"}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-right align-middle">
                          <div className="text-xs sm:text-sm font-semibold text-slate-900">
                            {formatUsd(va.balanceCents)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Current balance
                          </div>
                        </td>

                        <td className="px-4 py-3 text-right align-middle">
                          <div className="text-xs sm:text-sm font-medium text-slate-800">
                            {formatUsd(va.spendCents)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Last 30 days
                          </div>
                        </td>

                        <td className="px-4 py-3 text-right align-middle">
                          <div className="inline-flex items-center justify-end gap-1">
                            <span className="text-xs sm:text-sm font-semibold text-emerald-600">
                              {(va as any).takeRatePercent != null
                                ? `${(va as any).takeRatePercent} %`
                                : "0.00 %"}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Commission
                          </div>
                        </td>

                         <td className="px-4 py-3 text-right align-middle">
                          <div className="inline-flex items-center gap-1 sm:gap-2">
                            <button
                              className="inline-flex items-center gap-1 rounded-full bg-sky-500 px-2.5 py-1 text-[11px] font-medium text-white shadow-sm hover:bg-sky-600 transition"
                              onClick={() => openEditModal(va)}
                            >
                              <span className="hidden sm:inline">Edit</span>
                              <span className="sm:hidden">✏️</span>
                            </button>
                            <button
                              className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-1 text-[11px] font-medium text-white shadow-sm hover:bg-red-600 transition"
                              onClick={() => handleDelete(va.id)}
                            >
                              <span className="hidden sm:inline">Xoá</span>
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
                <span className="font-semibold text-slate-800">
                  {page + 1}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-800">
                  {Math.max(totalPages, 1)}
                </span>{" "}
                Virtual Accounts
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

      {showCreate && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-3xl bg-[#f5f7ff] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 bg-[#f5f7ff]">
              <h2 className="text-base font-semibold text-slate-900">
                Create Virtual Account
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
                  Name:
                </label>
                <input
                  className="w-full rounded-xl border border-transparent bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Name virtual account"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">
                  Flat Fee (%):
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="w-full rounded-xl border border-transparent bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  value={createFlatFee}
                  onChange={(e) =>
                    setCreateFlatFee(Number(e.target.value) || 0)
                  }
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">
                  Initial Funding (USD):
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="w-full rounded-xl border border-transparent bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  value={createInitialFunding}
                  onChange={(e) =>
                    setCreateInitialFunding(Number(e.target.value) || 0)
                  }
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

      {showEdit && editingVa && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-3xl bg-[#f5f7ff] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 bg-[#f5f7ff]">
              <h2 className="text-base font-semibold text-slate-900">
                Edit Virtual Account
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

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">
                  Take Rate (%):
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="w-full rounded-xl border border-transparent bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  value={editTakeRate}
                  onChange={(e) => setEditTakeRate(Number(e.target.value) || 0)}
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
