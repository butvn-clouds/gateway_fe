// src/components/CardManager.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContextProvider";
import {
  Account,
  Card,
  CardCountryOption,
  MccCodeOption,
  VirtualAccount,
  CardGroup,
  Merchant,
} from "../../types/Types";
import { cardApi } from "../../api/api.card";
import { cardMetaApi } from "../../api/api.cardMeta";
import { virtualAccountApi } from "../../api/api.virtualaccout";
import { cardGroupApi } from "../../api/api.cardgroup";
import { merchantApi } from "../../api/api.merchant";
import { toast } from "react-toastify";

export const CardManager: React.FC<{ pageSize?: number }> = ({
  pageSize = 10,
}) => {
  const { user, loading } = useAuth();

  const accounts: Account[] = useMemo(() => user?.accounts ?? [], [user]);

  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    null
  );
  const [selectedVaId, setSelectedVaId] = useState<number | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [data, setData] = useState<Card[]>([]);
  const [fetching, setFetching] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [countriesOptions, setCountriesOptions] = useState<
    CardCountryOption[]
  >([]);
  const [mccOptions, setMccOptions] = useState<MccCodeOption[]>([]);
  const [virtualAccounts, setVirtualAccounts] = useState<VirtualAccount[]>([]);
  const [cardGroups, setCardGroups] = useState<CardGroup[]>([]);

  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);

  // create state
  const [createName, setCreateName] = useState("");
  const [createDailyLimitUsd, setCreateDailyLimitUsd] = useState<number>(0);
  const [createCountriesAllow, setCreateCountriesAllow] = useState<string[]>(
    []
  );
  const [createMccCodesAllow, setCreateMccCodesAllow] = useState<string[]>([]);
  const [createMerchantIds, setCreateMerchantIds] = useState<string[]>([]);
  const [createMerchantNames, setCreateMerchantNames] = useState<string[]>([]);
  const [createMerchantCategories, setCreateMerchantCategories] = useState<
    string[]
  >([]);

  const [merchantSearch, setMerchantSearch] = useState("");
  const [merchantSuggestions, setMerchantSuggestions] = useState<Merchant[]>(
    []
  );
  const [creating, setCreating] = useState(false);
  const [searchingMerchant, setSearchingMerchant] = useState(false);

  // edit state
  const [editName, setEditName] = useState("");
  const [editDailyLimitUsd, setEditDailyLimitUsd] = useState<number>(0);
  const [editCountriesAllow, setEditCountriesAllow] = useState<string[]>([]);
  const [editMccCodesAllow, setEditMccCodesAllow] = useState<string[]>([]);
  const [editMerchantIds, setEditMerchantIds] = useState<string[]>([]);
  const [editMerchantNames, setEditMerchantNames] = useState<string[]>([]);
  const [editMerchantCategories, setEditMerchantCategories] = useState<
    string[]
  >([]);

  const usdToCents = (v: number) => Math.round((Number(v) || 0) * 100);

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

  // ====== auto chọn account active ======
  useEffect(() => {
    if (loading) return;
    if (user?.activeAccount) {
      if (selectedAccountId !== user.activeAccount.id) {
        setSelectedAccountId(user.activeAccount.id);
        setPage(0);
      }
    } else if (!user?.activeAccount && accounts.length > 0 && selectedAccountId == null) {
      setSelectedAccountId(accounts[0].id);
      setPage(0);
    } else if (accounts.length === 0) {
      setSelectedAccountId(null);
      setPage(0);
    }
  }, [loading, user?.activeAccount?.id, accounts, selectedAccountId]);

  // ====== load meta (countries + mcc) ======
  useEffect(() => {
    (async () => {
      try {
        const [countries, mccCodes] = await Promise.all([
          cardMetaApi.getCountries(),
          cardMetaApi.getMccCodes(),
        ]);
        setCountriesOptions(countries);
        setMccOptions(mccCodes);
      } catch (err) {
        console.error(err);
        toast.error("Unable to load card options");
      }
    })();
  }, []);

  // ====== load VA + card group cho select ======
  useEffect(() => {
    if (!selectedAccountId) return;
    (async () => {
      try {
        // VA của user, filter theo account
        const vas = await virtualAccountApi.getMyVirtualAccounts();
        setVirtualAccounts(
          vas.filter((va) => va.accountId === selectedAccountId)
        );

        // card group theo account
        const groupsPage = await cardGroupApi.getByAccountPaged(
          selectedAccountId,
          0,
          1000
        );
        const groups = groupsPage.content ?? [];
        setCardGroups(
          groups.filter((g: CardGroup) => g.accountId === selectedAccountId)
        );
      } catch (err) {
        console.error(err);
      }
    })();
  }, [selectedAccountId]);

  // ====== load cards ======
  const loadData = async (
    accountId: number,
    pageIndex: number,
    vaId?: number | null,
    groupId?: number | null
  ) => {
    setFetching(true);
    try {
      const res = await cardApi.getByAccountPaged(
        accountId,
        pageIndex,
        pageSize,
        vaId ?? undefined,
        groupId ?? undefined
      );
      setData(res.content ?? []);

      const currentPage =
        typeof res.page === "number" && Number.isFinite(res.page)
          ? res.page
          : pageIndex;
      setPage(currentPage);

      setTotalPages(
        typeof res.totalPages === "number" && Number.isFinite(res.totalPages)
          ? res.totalPages
          : 1
      );
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Unable to load cards");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (selectedAccountId != null) {
      loadData(selectedAccountId, page, selectedVaId, selectedGroupId);
    } else {
      setData([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId, selectedVaId, selectedGroupId, page]);

  // ====== sync ======
  const handleSync = async () => {
    if (selectedAccountId == null) return;
    setSyncing(true);
    try {
      await cardApi.syncAccount(selectedAccountId, selectedVaId ?? undefined);
      await loadData(selectedAccountId, 0, selectedVaId, selectedGroupId);
      toast.success("Sync cards successful");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Sync cards failed");
    } finally {
      setSyncing(false);
    }
  };

  // ====== delete ======
  const handleDelete = async (id: number) => {
    if (!window.confirm("Close this card permanently?")) return;
    try {
      await cardApi.deleteCard(id);
      toast.success("Close card successful");
      if (selectedAccountId != null) {
        await loadData(selectedAccountId, page, selectedVaId, selectedGroupId);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Unable to close card");
    }
  };

  // utils select multi
  const handleMultiSelectChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
    setter: (codes: string[]) => void
  ) => {
    const values = Array.from(e.target.selectedOptions).map((opt) => opt.value);
    setter(values);
  };

  // ====== create modal ======
  const openCreateModal = () => {
    setCreateName("");
    setCreateDailyLimitUsd(0);
    setCreateCountriesAllow([]);
    setCreateMccCodesAllow([]);
    setCreateMerchantIds([]);
    setCreateMerchantNames([]);
    setCreateMerchantCategories([]);
    setMerchantSearch("");
    setMerchantSuggestions([]);
    setShowCreate(true);
  };

  const handleSearchMerchant = async () => {
    if (!merchantSearch.trim()) return;
    if (!selectedAccountId) {
      toast.error("Select an account to search merchants");
      return;
    }
    try {
      setSearchingMerchant(true);
      const res = await merchantApi.searchMerchants(
        selectedAccountId,
        merchantSearch.trim()
      );
      // MerchantSearchResponse: { items: Merchant[], metadata: ... }
      const suggestions: Merchant[] = res?.items ?? [];
      setMerchantSuggestions(suggestions);
    } catch (err) {
      console.error(err);
      toast.error("Unable to search merchants");
    } finally {
      setSearchingMerchant(false);
    }
  };

  const addMerchant = (m: Merchant) => {
    if (createMerchantIds.includes(m.id)) return;
    setCreateMerchantIds((prev) => [...prev, m.id]);
    setCreateMerchantNames((prev) => [...prev, m.name || m.id]);
  };

  const removeMerchantAtIndex = (idx: number) => {
    setCreateMerchantIds((prev) => prev.filter((_, i) => i !== idx));
    setCreateMerchantNames((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId || !selectedVaId) {
      toast.error("Account & Virtual Account are required");
      return;
    }
    if (!createName.trim()) {
      toast.error("Card name cannot be empty");
      return;
    }

    try {
      setCreating(true);
      const dailyLimitCents = usdToCents(createDailyLimitUsd);

      await cardApi.createCard({
        accountId: selectedAccountId,
        virtualAccountId: selectedVaId,
        cardGroupId: selectedGroupId ?? null,
        name: createName.trim(),
        dailyLimitCents,
        countriesAllow: createCountriesAllow,
        mccCodesAllow: createMccCodesAllow,
        merchantIds: createMerchantIds,
        merchantCategories: createMerchantCategories,
        merchantNamesAllow: createMerchantNames,
      });

      toast.success("Create card successful");
      setShowCreate(false);
      await loadData(selectedAccountId, 0, selectedVaId, selectedGroupId);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Unable to create card");
    } finally {
      setCreating(false);
    }
  };

  // ====== edit ======
  const openEditModal = (card: Card) => {
    setEditingCard(card);
    setEditName(card.name ?? "");
    setEditDailyLimitUsd(
      card.dailyLimitCents ? card.dailyLimitCents / 100 : 0
    );
    setEditCountriesAllow(card.countriesAllow ?? []);
    setEditMccCodesAllow(card.mccCodesAllow ?? []);
    setEditMerchantIds(card.merchantIds ?? []);
    setEditMerchantNames(card.merchantNames ?? []);
    setEditMerchantCategories(card.merchantCategories ?? []);
    setShowEdit(true);
  };

  const removeEditMerchantAtIndex = (idx: number) => {
    setEditMerchantIds((prev) => prev.filter((_, i) => i !== idx));
    setEditMerchantNames((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCard) return;
    if (!editName.trim()) {
      toast.error("Card name cannot be empty");
      return;
    }
    try {
      const dailyLimitCents = usdToCents(editDailyLimitUsd);
      await cardApi.updateCard(editingCard.id, {
        name: editName.trim(),
        dailyLimitCents,
        countriesAllow: editCountriesAllow,
        mccCodesAllow: editMccCodesAllow,
        merchantIds: editMerchantIds,
        merchantCategories: editMerchantCategories,
        merchantNamesAllow: editMerchantNames,
      });
      toast.success("Update card successful");
      setShowEdit(false);
      if (selectedAccountId != null) {
        await loadData(selectedAccountId, page, selectedVaId, selectedGroupId);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Unable to update card");
    }
  };

  if (loading) return <div>Check auth...</div>;
  if (!user) return <div>Not logged in</div>;

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-6">
        <div className="space-y-4">
          {/* Filters + actions */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
              {/* Account select */}
              <select
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                value={selectedAccountId ?? ""}
                onChange={(e) => {
                  const v = e.target.value ? Number(e.target.value) : null;
                  setSelectedAccountId(v);
                  setSelectedVaId(null);
                  setSelectedGroupId(null);
                  setPage(0);
                }}
              >
                <option value="">-- Select Account --</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>

              {/* VA filter */}
              <select
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                value={selectedVaId ?? ""}
                onChange={(e) => {
                  const v = e.target.value ? Number(e.target.value) : null;
                  setSelectedVaId(v);
                  setPage(0);
                }}
              >
                <option value="">All VAs</option>
                {virtualAccounts.map((va) => (
                  <option key={va.id} value={va.id}>
                    {va.name ?? va.accountNumber ?? va.slashId}
                  </option>
                ))}
              </select>

              {/* Card group filter */}
              <select
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                value={selectedGroupId ?? ""}
                onChange={(e) => {
                  const v = e.target.value ? Number(e.target.value) : null;
                  setSelectedGroupId(v);
                  setPage(0);
                }}
              >
                <option value="">All Groups</option>
                {cardGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                className="px-4 py-2 text-sm rounded-xl bg-emerald-500 text-white disabled:opacity-60 shadow-sm hover:bg-emerald-600 transition"
                onClick={openCreateModal}
                disabled={selectedAccountId == null || selectedVaId == null}
              >
                + Create Card
              </button>

              <button
                className="px-4 py-2 text-sm rounded-xl bg-blue-600 text-white disabled:opacity-60 shadow-sm hover:bg-blue-700 transition"
                onClick={handleSync}
                disabled={syncing || selectedAccountId == null}
              >
                {syncing ? "Syncing..." : "Sync Cards"}
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60">
            <div className="max-w-full overflow-x-auto">
              <table className="min-w-full text-xs sm:text-sm">
                <thead className="bg-slate-100/80 backdrop-blur">
                  <tr className="border-b border-slate-200/70">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Card
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      VA
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Group
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Daily Limit
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Spend (30d)
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Status
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
                        colSpan={7}
                        className="px-4 py-4 text-center text-xs text-slate-500"
                      >
                        Loading cards...
                      </td>
                    </tr>
                  ) : data.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-7 text-center text-xs sm:text-sm text-slate-500"
                      >
                        No cards found
                      </td>
                    </tr>
                  ) : (
                    data.map((card) => (
                      <tr
                        key={card.id}
                        className="bg-white/60 hover:bg-indigo-50/60 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-semibold text-indigo-700">
                              {card.name?.[0]?.toUpperCase() || "C"}
                            </div>
                            <div>
                              <div className="text-xs sm:text-sm font-medium text-slate-900">
                                {card.name ?? "-"}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                **** {card.last4 ?? "----"}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-center text-xs sm:text-sm text-slate-700">
                          {card.virtualAccountName ?? "-"}
                        </td>

                        <td className="px-4 py-3 text-center text-xs sm:text-sm text-slate-700">
                          {card.cardGroupName ?? "-"}
                        </td>

                        <td className="px-4 py-3 text-center">
                          <div className="text-xs sm:text-sm font-semibold text-slate-900">
                            {formatUsd(card.dailyLimitCents)}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-center">
                          <div className="text-xs sm:text-sm font-medium text-slate-800">
                            {formatUsd(card.spendCents)}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              card.status === "active"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {card.status ?? "unknown"}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex items-center gap-1 sm:gap-2">
                            <button
                              className="inline-flex items-center gap-1 rounded-full bg-sky-500 px-2.5 py-1 text-[11px] font-medium text-white shadow-sm hover:bg-sky-600 transition"
                              onClick={() => openEditModal(card)}
                            >
                              <span className="hidden sm:inline">Edit</span>
                              <span className="sm:hidden">✏️</span>
                            </button>
                            <button
                              className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-1 text-[11px] font-medium text-white shadow-sm hover:bg-red-600 transition"
                              onClick={() => handleDelete(card.id)}
                            >
                              <span className="hidden sm:inline">Close</span>
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
                Cards
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
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-3xl bg-[#f5f7ff] shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 bg-[#f5f7ff] border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-900">
                Create New Card
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
              className="px-5 pb-5 pt-3 space-y-4 overflow-y-auto"
            >
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">
                  Card Name:
                </label>
                <input
                  className="w-full rounded-xl border border-transparent bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Marketing card #1"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">
                  Daily Limit (USD):
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="w-full rounded-xl border border-transparent bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  value={createDailyLimitUsd}
                  onChange={(e) =>
                    setCreateDailyLimitUsd(Number(e.target.value) || 0)
                  }
                />
              </div>

              {/* Countries */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">
                  Countries Allow (ISO2):
                </label>
                <select
                  multiple
                  className="w-full h-28 rounded-xl border border-transparent bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  value={createCountriesAllow}
                  onChange={(e) =>
                    handleMultiSelectChange(e, setCreateCountriesAllow)
                  }
                >
                  {countriesOptions.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} – {c.name}
                      {c.region ? ` (${c.region})` : ""}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400">
                  Giữ Ctrl / Cmd để chọn nhiều country
                </p>
              </div>

              {/* MCC */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">
                  MCC Codes Allow:
                </label>
                <select
                  multiple
                  className="w-full h-28 rounded-xl border border-transparent bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  value={createMccCodesAllow}
                  onChange={(e) =>
                    handleMultiSelectChange(e, setCreateMccCodesAllow)
                  }
                >
                  {mccOptions.map((m) => (
                    <option key={m.code} value={m.code}>
                      {m.code} – {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Merchant search */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Merchants Allow:
                </label>
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded-xl border border-transparent bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    value={merchantSearch}
                    onChange={(e) => setMerchantSearch(e.target.value)}
                    placeholder="Search merchant name or URL"
                  />
                  <button
                    type="button"
                    onClick={handleSearchMerchant}
                    className="px-3 py-2 rounded-xl bg-indigo-500 text-white text-xs font-semibold hover:bg-indigo-600 disabled:opacity-60"
                    disabled={searchingMerchant}
                  >
                    {searchingMerchant ? "Searching..." : "Search"}
                  </button>
                </div>

                {merchantSuggestions.length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-white max-h-32 overflow-y-auto text-xs">
                    {merchantSuggestions.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className="w-full text-left px-3 py-1.5 hover:bg-indigo-50 flex justify-between items-center"
                        onClick={() => addMerchant(m)}
                      >
                        <span>
                          {m.name || m.id}
                          {m.url ? (
                            <span className="text-[10px] text-slate-400 ml-1">
                              {m.url}
                            </span>
                          ) : null}
                        </span>
                        <span className="text-[10px] text-indigo-500 font-semibold">
                          + Add
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {createMerchantNames.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {createMerchantNames.map((n, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-1 text-[11px] text-indigo-700"
                      >
                        {n}
                        <button
                          type="button"
                          className="text-indigo-500 hover:text-indigo-700"
                          onClick={() => removeMerchantAtIndex(idx)}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={creating}
                className="mt-3 mb-1 w-full rounded-xl bg-[#311BFF] py-2.5 text-sm font-semibold text-white shadow-md hover:bg-[#2612e8] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {creating ? "Creating..." : "Create Card"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEdit && editingCard && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-3xl bg-[#f5f7ff] shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 bg-[#f5f7ff] border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-900">
                Edit Card
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
              className="px-5 pb-5 pt-3 space-y-4 overflow-y-auto"
            >
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">
                  Card Name:
                </label>
                <input
                  className="w-full rounded-xl border border-transparent bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>

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
                  onChange={(e) =>
                    setEditDailyLimitUsd(Number(e.target.value) || 0)
                  }
                />
              </div>

              {/* Countries */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">
                  Countries Allow:
                </label>
                <select
                  multiple
                  className="w-full h-28 rounded-xl border border-transparent bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  value={editCountriesAllow}
                  onChange={(e) =>
                    handleMultiSelectChange(e, setEditCountriesAllow)
                  }
                >
                  {countriesOptions.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} – {c.name}
                      {c.region ? ` (${c.region})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* MCC */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">
                  MCC Codes Allow:
                </label>
                <select
                  multiple
                  className="w-full h-28 rounded-xl border border-transparent bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  value={editMccCodesAllow}
                  onChange={(e) =>
                    handleMultiSelectChange(e, setEditMccCodesAllow)
                  }
                >
                  {mccOptions.map((m) => (
                    <option key={m.code} value={m.code}>
                      {m.code} – {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Merchants selected */}
              {editMerchantNames.length > 0 && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">
                    Merchants Allow:
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {editMerchantNames.map((n, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-1 text-[11px] text-indigo-700"
                      >
                        {n}
                        <button
                          type="button"
                          className="text-indigo-500 hover:text-indigo-700"
                          onClick={() => removeEditMerchantAtIndex(idx)}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

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
