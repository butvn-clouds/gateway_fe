// src/components/CardManager.tsx
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

import { useAuth } from "../../context/AuthContextProvider";
import {
  Account,
  ApiCreateCardParam,
  ApiUpdateCardParam,
  Card,
  CardCountryOption,
  CardGroup,
  CardPage,
  MccCodeOption,
  Merchant,
  MerchantCategory,
  MerchantSearchResponse,
  VirtualAccount,
} from "../../types/Types";
import { cardApi } from "../../api/api.card";
import { cardMetaApi } from "../../api/api.cardMeta";
import { merchantApi } from "../../api/api.merchant";
import { cardGroupApi } from "../../api/api.cardgroup";
import { virtualAccountApi } from "../../api/api.virtualaccout";

interface Props {
  pageSize?: number;
}

export const CardManager: React.FC<Props> = ({ pageSize = 20 }) => {
  const { user, loading: authLoading } = useAuth();

  // ===== ACCOUNT & ACTIVE ACCOUNT =====
  const accounts: Account[] = useMemo(() => user?.accounts ?? [], [user]);
  const activeAccountId: number | null = useMemo(() => {
    if (!accounts || accounts.length === 0) return null;
    if ((user as any)?.activeAccount && (user as any).activeAccount.id) {
      return (user as any).activeAccount.id;
    }
    return accounts[0].id;
  }, [accounts, user]);

  // ===== META STATE =====
  const [vaOptions, setVaOptions] = useState<VirtualAccount[]>([]);
  const [vaLoading, setVaLoading] = useState(false);

  const [cardGroups, setCardGroups] = useState<CardGroup[]>([]);
  const [cardGroupLoading, setCardGroupLoading] = useState(false);

  const [metaLoading, setMetaLoading] = useState(false);
  const [countries, setCountries] = useState<CardCountryOption[]>([]);
  const [mccCodes, setMccCodes] = useState<MccCodeOption[]>([]);
  const [merchantCategories, setMerchantCategories] = useState<
    MerchantCategory[]
  >([]);

  // lookup maps
  const countryLabelMap = useMemo(() => {
    const m = new Map<string, string>();
    countries.forEach((c) => {
      const label =
        c.region && c.region.trim().length > 0
          ? `${c.code} – ${c.name} (${c.region})`
          : `${c.code} – ${c.name}`;
      m.set(c.code, label);
    });
    return m;
  }, [countries]);

  const mccLabelMap = useMemo(() => {
    const m = new Map<string, string>();
    mccCodes.forEach((mc) => {
      m.set(mc.code, `${mc.code} – ${mc.name}`);
    });
    return m;
  }, [mccCodes]);

  const merchantCategoryLabelMap = useMemo(() => {
    const m = new Map<string, string>();
    merchantCategories.forEach((cat) => {
      if (cat.slashId) {
        m.set(cat.slashId, cat.name);
      }
    });
    return m;
  }, [merchantCategories]);

  // ===== FILTER STATE =====
  const [selectedVaId, setSelectedVaId] = useState<number | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    setSelectedVaId(null);
    setSelectedGroupId(null);
  }, [activeAccountId]);

  // ===== LOAD VA =====
  useEffect(() => {
    const loadVas = async () => {
      if (!activeAccountId) {
        setVaOptions([]);
        return;
      }
      try {
        setVaLoading(true);
        const res = await virtualAccountApi.getByAccountPaged(
          activeAccountId,
          0,
          500,
          undefined
        );
        setVaOptions(res.content || []);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load Virtual Accounts");
      } finally {
        setVaLoading(false);
      }
    };
    loadVas();
  }, [activeAccountId]);

  // ===== LOAD CARD GROUPS =====
  useEffect(() => {
    const loadGroups = async () => {
      if (!activeAccountId) {
        setCardGroups([]);
        return;
      }
      try {
        setCardGroupLoading(true);
        const res = await cardGroupApi.getByAccountPaged(
          activeAccountId,
          0,
          500,
          selectedVaId ?? undefined,
          undefined
        );
        setCardGroups(res.content || []);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load card groups");
      } finally {
        setCardGroupLoading(false);
      }
    };
    loadGroups();
  }, [activeAccountId, selectedVaId]);

  // ===== LOAD META =====
  useEffect(() => {
    const loadMeta = async () => {
      try {
        setMetaLoading(true);
        const [c, m, catRes] = await Promise.all([
          cardMetaApi.getCountries(),
          cardMetaApi.getMccCodes(),
          merchantApi.getAllCategories(),
        ]);

        setCountries(c.sort((a, b) => a.code.localeCompare(b.code, "en-US")));
        setMccCodes(m.sort((a, b) => a.code.localeCompare(b.code, "en-US")));
        setMerchantCategories(catRes);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load metadata");
      } finally {
        setMetaLoading(false);
      }
    };
    loadMeta();
  }, []);

  // ===== CARD LIST =====
  const [cardPage, setCardPage] = useState<CardPage | null>(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [page, setPage] = useState(0);

  const loadCards = async (pageIndex = 0) => {
    if (!activeAccountId) return;
    try {
      setCardLoading(true);
      const data = await cardApi.getPagedCards({
        accountId: activeAccountId,
        virtualAccountId: selectedVaId ?? undefined,
        cardGroupId: selectedGroupId ?? undefined,
        page: pageIndex,
        size: pageSize,
        search: search || undefined,
        status: statusFilter || undefined,
      });

      setCardPage({
        ...data,
        content: data.content || [],
      });
      setPage(data.page);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load cards");
    } finally {
      setCardLoading(false);
    }
  };

  useEffect(() => {
    if (!activeAccountId) return;
    loadCards(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAccountId, selectedVaId, selectedGroupId, search, statusFilter, pageSize]);

  const handleChangePage = (newPage: number) => {
    if (!cardPage) return;
    if (newPage < 0 || newPage >= cardPage.totalPages) return;
    loadCards(newPage);
  };

  const handleSync = async () => {
    if (!activeAccountId) return;
    try {
      const res = await cardApi.syncFromSlash(activeAccountId);
      toast.success(`Synced ${res.count} cards from Slash`);
      await loadCards(page);
    } catch (err: any) {
      console.error("sync error:", err?.response?.data || err);
      toast.error(err?.response?.data?.message || "Sync from Slash failed");
    }
  };

  // ===== MERCHANT SEARCH =====
  const [merchantSearchResult, setMerchantSearchResult] = useState<Merchant[]>(
    []
  );
  const [merchantSearchQuery, setMerchantSearchQuery] = useState("");
  const [merchantSearchCursor, setMerchantSearchCursor] = useState<
    string | undefined
  >();
  const [merchantSearching, setMerchantSearching] = useState(false);

  const performMerchantSearch = async (cursor?: string) => {
    if (!activeAccountId) {
      toast.error("No account selected");
      return;
    }
    const q = merchantSearchQuery.trim();
    if (!q && !cursor) return;

    try {
      setMerchantSearching(true);
      const res: MerchantSearchResponse = await merchantApi.searchMerchants(
        activeAccountId,
        q,
        cursor
      );
      if (cursor) {
        setMerchantSearchResult((prev) => [...prev, ...res.items]);
      } else {
        setMerchantSearchResult(res.items);
      }
      setMerchantSearchCursor(res.metadata?.nextCursor || undefined);
    } catch (err) {
      console.error(err);
      toast.error("Merchant search failed");
    } finally {
      setMerchantSearching(false);
    }
  };

  useEffect(() => {
    const q = merchantSearchQuery.trim();
    if (q.length < 3) {
      setMerchantSearchResult([]);
      setMerchantSearchCursor(undefined);
      return;
    }
    const timer = setTimeout(() => {
      performMerchantSearch(undefined);
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchantSearchQuery, activeAccountId]);

  const loadMoreMerchants = () => {
    if (!merchantSearchCursor) return;
    performMerchantSearch(merchantSearchCursor);
  };

  const collectMerchantNames = (ids: string[]): string[] => {
    const map = new Map<string, string>();
    merchantSearchResult.forEach((m) => {
      if (m.id) map.set(m.id, m.name || m.id);
    });
    return ids.map((id) => map.get(id) || id);
  };

  // ===== CREATE STATE =====
  const [showCreate, setShowCreate] = useState(false);
  const [createVaId, setCreateVaId] = useState<number | null>(null);
  const [createGroupId, setCreateGroupId] = useState<number | null>(null);
  const [createName, setCreateName] = useState("");
  const [createDailyLimit, setCreateDailyLimit] = useState<number | null>(null);
  const [createMinTx, setCreateMinTx] = useState<number | null>(null);
  const [createMaxTx, setCreateMaxTx] = useState<number | null>(null);
  const [createCountriesAllow, setCreateCountriesAllow] = useState<string[]>(
    []
  );
  const [createMccCodesAllow, setCreateMccCodesAllow] = useState<string[]>([]);
  const [createMerchantIds, setCreateMerchantIds] = useState<string[]>([]);
  const [createMerchantCategories, setCreateMerchantCategories] = useState<
    string[]
  >([]);
  const [createMerchantNames, setCreateMerchantNames] = useState<string[]>([]);

  // ===== EDIT STATE =====
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [editDailyLimit, setEditDailyLimit] = useState<number | null>(null);
  const [editMinTx, setEditMinTx] = useState<number | null>(null);
  const [editMaxTx, setEditMaxTx] = useState<number | null>(null);
  const [editCountriesAllow, setEditCountriesAllow] = useState<string[]>([]);
  const [editMccCodesAllow, setEditMccCodesAllow] = useState<string[]>([]);
  const [editMerchantIds, setEditMerchantIds] = useState<string[]>([]);
  const [editMerchantCategories, setEditMerchantCategories] = useState<
    string[]
  >([]);
  const [editMerchantNames, setEditMerchantNames] = useState<string[]>([]);
  const [editStatus, setEditStatus] = useState<string>("");

  // ===== DETAIL STATE =====
  const [detailCard, setDetailCard] = useState<Card | null>(null);
  const [showCvv, setShowCvv] = useState(false);

  const toggleStringInArray = (list: string[], value: string): string[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  // ===== OPEN CREATE =====
  const openCreateModal = () => {
    if (!activeAccountId) {
      toast.error("No active account");
      return;
    }
    if (vaOptions.length === 0) {
      toast.error("This account has no virtual accounts");
      return;
    }

    const defaultVaId =
      selectedVaId && vaOptions.some((v) => v.id === selectedVaId)
        ? selectedVaId
        : vaOptions[0].id;

    const groupsForVa =
      cardGroups.filter((g) => g.virtualAccountId === defaultVaId) ||
      cardGroups;

    const defaultGroupId =
      selectedGroupId && groupsForVa.some((g) => g.id === selectedGroupId)
        ? selectedGroupId
        : groupsForVa.length > 0
        ? groupsForVa[0].id
        : null;

    setCreateVaId(defaultVaId);
    setCreateGroupId(defaultGroupId);
    setCreateName("");
    setCreateDailyLimit(null);
    setCreateMinTx(null);
    setCreateMaxTx(null);
    setCreateCountriesAllow([]);
    setCreateMccCodesAllow([]);
    setCreateMerchantIds([]);
    setCreateMerchantCategories([]);
    setCreateMerchantNames([]);
    setMerchantSearchQuery("");
    setMerchantSearchResult([]);
    setMerchantSearchCursor(undefined);

    setShowCreate(true);
  };

  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAccountId || !createVaId) {
      toast.error("Missing account or virtual account");
      return;
    }

    if (
      createMinTx != null &&
      createMaxTx != null &&
      createMinTx >= createMaxTx
    ) {
      toast.error("Minimum transaction must be less than maximum");
      return;
    }

    const merchantNames =
      createMerchantNames.length > 0
        ? createMerchantNames
        : collectMerchantNames(createMerchantIds);

    const payload: ApiCreateCardParam = {
      accountId: activeAccountId,
      virtualAccountId: createVaId,
      cardGroupId: createGroupId ?? undefined,

      name: createName,

      dailyLimitCents: createDailyLimit ?? undefined,
      minTransactionCents: createMinTx ?? undefined,
      maxTransactionCents: createMaxTx ?? undefined,

      countriesAllow:
        createCountriesAllow.length > 0 ? createCountriesAllow : null,
      mccCodesAllow:
        createMccCodesAllow.length > 0 ? createMccCodesAllow : null,

      merchantIds: createMerchantIds.length > 0 ? createMerchantIds : null,
      merchantCategories:
        createMerchantCategories.length > 0
          ? createMerchantCategories
          : null,
      merchantNamesAllow: merchantNames.length > 0 ? merchantNames : null,
    };

    try {
      await cardApi.create(payload);
      toast.success("Card created successfully");
      setShowCreate(false);
      await loadCards(page);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to create card");
    }
  };

  // ===== OPEN EDIT =====
  const openEditModal = (card: Card) => {
    setEditingCard(card);

    setEditDailyLimit(card.dailyLimitCents ?? null);
    setEditMinTx(card.minTransactionCents ?? null);
    setEditMaxTx(card.maxTransactionCents ?? null);
    setEditCountriesAllow(
      (card.countriesAllow ?? []).map((c: any) => String(c))
    );
    setEditMccCodesAllow(
      (card.mccCodesAllow ?? []).map((m: any) => String(m))
    );
    setEditMerchantIds((card.merchantIds ?? []).map((id: any) => String(id)));
    setEditMerchantCategories(
      (card.merchantCategories ?? []).map((id: any) => String(id))
    );
    setEditMerchantNames(card.merchantNamesAllow ?? []);
    setEditStatus(card.status ?? "");

    setMerchantSearchQuery("");
    setMerchantSearchResult([]);
    setMerchantSearchCursor(undefined);
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCard) return;

    if (editMinTx != null && editMaxTx != null && editMinTx >= editMaxTx) {
      toast.error("Minimum transaction must be less than maximum");
      return;
    }

    const merchantNames =
      editMerchantNames.length > 0
        ? editMerchantNames
        : collectMerchantNames(editMerchantIds);

    const payload: ApiUpdateCardParam = {
      name: editingCard.name,

      dailyLimitCents: editDailyLimit ?? undefined,
      minTransactionCents: editMinTx ?? undefined,
      maxTransactionCents: editMaxTx ?? undefined,

      countriesAllow:
        editCountriesAllow.length > 0 ? editCountriesAllow : null,
      mccCodesAllow:
        editMccCodesAllow.length > 0 ? editMccCodesAllow : null,

      merchantIds: editMerchantIds.length > 0 ? editMerchantIds : null,
      merchantCategories:
        editMerchantCategories.length > 0 ? editMerchantCategories : null,
      merchantNamesAllow: merchantNames.length > 0 ? merchantNames : null,

      status: editStatus || undefined,
    };

    try {
      await cardApi.update(editingCard.id, payload);
      toast.success("Card updated successfully");
      setEditingCard(null);
      await loadCards(page);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to update card");
    }
  };

  // ===== HELPERS =====
  const formatAmount = (cents?: number | null): string => {
    if (cents == null) return "-";
    const usd = cents / 100;
    return usd.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const renderCodeList = (
    codes: string[] | undefined | null,
    map: Map<string, string>
  ): string => {
    if (!codes || codes.length === 0) return "Any";
    return codes.map((c) => map.get(c) || c).join(", ");
  };

  const formatPanForDisplay = (
    pan?: string | null,
    fallbackLast4?: string | null
  ): string => {
    if (pan && pan.length >= 12) {
      return pan
        .replace(/\s+/g, "")
        .replace(/(.{4})/g, "$1 ")
        .trim();
    }
    if (fallbackLast4) {
      const masked = `************${fallbackLast4}`;
      return masked.replace(/(.{4})/g, "$1 ").trim();
    }
    return "**** **** **** ****";
  };

  // ===== RENDER =====
  if (authLoading) {
    return <div>Loading authentication...</div>;
  }

  return (
    <div className="space-y-5">
      {/* HEADER + FILTERS */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {/* Group filter */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Group:</span>
            <select
              className="border rounded-full px-3 py-1 min-w-[160px] bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={selectedGroupId ?? ""}
              onChange={(e) =>
                setSelectedGroupId(
                  e.target.value ? Number(e.target.value) : null
                )
              }
            >
              <option value="">All</option>
              {cardGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Virtual account filter */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">
              Virtual account:
            </span>
            <select
              className="border rounded-full px-3 py-1 min-w-[160px] bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={selectedVaId ?? ""}
              onChange={(e) =>
                setSelectedVaId(e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">All</option>
              {vaOptions.map((va) => (
                <option key={va.id} value={va.id}>
                  {va.name || va.id}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Status:</span>
            <select
              className="border rounded-full px-3 py-1 min-w-[140px] bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All</option>
              <option value="active">active</option>
              <option value="inactive">inactive</option>
              <option value="closed">closed</option>
            </select>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Card:</span>
            <input
              className="border rounded-full px-3 py-1 text-sm min-w-[220px] bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="Search by name or last 4..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="rounded-full border border-indigo-500 text-indigo-600 px-4 py-1 text-sm bg-white hover:bg-indigo-50 shadow-sm"
            onClick={handleSync}
          >
            Sync from Slash
          </button>
          <button
            className="rounded-full bg-indigo-600 text-white px-5 py-1.5 text-sm shadow-md hover:bg-indigo-700 disabled:opacity-50"
            onClick={openCreateModal}
            disabled={vaOptions.length === 0}
          >
            + Create card
          </button>
        </div>
      </div>

      {/* CARD TABLE */}
      <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Card</th>
              <th className="px-4 py-3 text-left font-semibold">Group</th>
              <th className="px-4 py-3 text-left font-semibold">
                Virtual account
              </th>
              <th className="px-4 py-3 text-left font-semibold">Daily limit</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
              <th className="px-4 py-3 text-left font-semibold">Created</th>
              <th className="px-4 py-3 text-left font-semibold">Expiry</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {cardLoading || !cardPage ? (
              <tr>
                <td colSpan={8} className="px-4 py-5 text-center text-slate-500">
                  {cardLoading ? "Loading cards..." : "No data"}
                </td>
              </tr>
            ) : !cardPage.content || cardPage.content.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-5 text-center text-slate-500">
                  No cards found
                </td>
              </tr>
            ) : (
              cardPage.content.map((card) => (
                <tr
                  key={card.id}
                  className="border-t last:border-b hover:bg-slate-50/70"
                >
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="text-indigo-600 font-medium hover:underline"
                      onClick={() => {
                        setDetailCard(card);
                        setShowCvv(false);
                      }}
                    >
                      {card.name}
                    </button>
                    {card.last4 && (
                      <span className="ml-2 inline-flex items-center text-xs bg-emerald-100 text-emerald-700 rounded-full px-2 py-[1px]">
                        **** {card.last4}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {card.cardGroupName || "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {card.virtualAccountName || card.virtualAccountId || "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {card.dailyLimitCents != null && card.dailyLimitCents > 0
                      ? "Limited"
                      : "No limit"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-[2px] rounded-full text-xs font-medium ${
                        card.status === "active"
                          ? "bg-emerald-50 text-emerald-700"
                          : card.status === "closed"
                          ? "bg-rose-50 text-rose-700"
                          : "bg-slate-50 text-slate-600"
                      }`}
                    >
                      {card.status || "unknown"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {card.createdAt
                      ? new Date(card.createdAt).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {card.expiryMonth && card.expiryYear
                      ? `${card.expiryMonth}/${card.expiryYear}`
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      className="border rounded-lg px-3 py-1 text-xs hover:bg-slate-100"
                      onClick={() => openEditModal(card)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {cardPage && cardPage.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>
            Total cards:{" "}
            <span className="font-semibold">{cardPage.totalElements}</span> — Page{" "}
            <span className="font-semibold">{cardPage.page + 1}</span> /{" "}
            {cardPage.totalPages}
          </span>
          <div className="space-x-2">
            <button
              className="border px-3 py-1 rounded-md bg-white hover:bg-slate-50 disabled:opacity-50"
              disabled={cardPage.page === 0}
              onClick={() => handleChangePage(cardPage.page - 1)}
            >
              Prev
            </button>
            <button
              className="border px-3 py-1 rounded-md bg-white hover:bg-slate-50 disabled:opacity-50"
              disabled={cardPage.page + 1 >= cardPage.totalPages}
              onClick={() => handleChangePage(cardPage.page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full p-6 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-semibold text-lg text-slate-800">
                Create new card
              </h2>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600"
                onClick={() => setShowCreate(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitCreate} className="space-y-5">
              {/* VA + Group */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Virtual account
                  </label>
                  <select
                    className="border rounded-lg px-3 py-2 w-full bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    value={createVaId ?? ""}
                    onChange={(e) =>
                      setCreateVaId(
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                    required
                  >
                    <option value="">Select virtual account...</option>
                    {vaOptions.map((va) => (
                      <option key={va.id} value={va.id}>
                        {va.name || va.id}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Card group (optional)
                  </label>
                  <select
                    className="border rounded-lg px-3 py-2 w-full bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    value={createGroupId ?? ""}
                    onChange={(e) =>
                      setCreateGroupId(
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                  >
                    <option value="">No group</option>
                    {cardGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* BASIC INFO + LIMITS */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Card name
                  </label>
                  <input
                    className="border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Daily limit (USD)
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="Leave empty for no limit"
                    value={createDailyLimit ?? ""}
                    onChange={(e) =>
                      setCreateDailyLimit(
                        e.target.value === "" ? null : Number(e.target.value)
                      )
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Min transaction (USD)
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    value={createMinTx ?? ""}
                    onChange={(e) =>
                      setCreateMinTx(
                        e.target.value === "" ? null : Number(e.target.value)
                      )
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Max transaction (USD)
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    value={createMaxTx ?? ""}
                    onChange={(e) =>
                      setCreateMaxTx(
                        e.target.value === "" ? null : Number(e.target.value)
                      )
                    }
                  />
                </div>
              </div>

              {/* RULES SECTION */}
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                {/* Countries */}
                <div>
                  <div className="font-semibold mb-1 text-slate-700">
                    Countries allow
                  </div>
                  <div className="border rounded-lg p-2 max-h-56 overflow-y-auto space-y-1 bg-slate-50/40">
                    {metaLoading ? (
                      <div className="text-xs text-slate-500">Loading...</div>
                    ) : (
                      countries.map((c) => (
                        <label
                          key={c.code}
                          className="flex items-center gap-2 text-slate-700"
                        >
                          <input
                            type="checkbox"
                            checked={createCountriesAllow.includes(c.code)}
                            onChange={() =>
                              setCreateCountriesAllow((prev) =>
                                toggleStringInArray(prev, c.code)
                              )
                            }
                          />
                          <span className="text-xs">
                            {c.code} – {c.name}
                            {c.region ? ` (${c.region})` : ""}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                {/* MCC */}
                <div>
                  <div className="font-semibold mb-1 text-slate-700">
                    MCC codes allow
                  </div>
                  <div className="border rounded-lg p-2 max-h-56 overflow-y-auto space-y-1 bg-slate-50/40">
                    {metaLoading ? (
                      <div className="text-xs text-slate-500">Loading...</div>
                    ) : (
                      mccCodes.map((m) => (
                        <label
                          key={m.code}
                          className="flex items-center gap-2 text-slate-700"
                        >
                          <input
                            type="checkbox"
                            checked={createMccCodesAllow.includes(m.code)}
                            onChange={() =>
                              setCreateMccCodesAllow((prev) =>
                                toggleStringInArray(prev, m.code)
                              )
                            }
                          />
                          <span className="text-xs">
                            {m.code} – {m.name}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                {/* Merchant categories */}
                <div>
                  <div className="font-semibold mb-1 text-slate-700">
                    Merchant categories allow
                  </div>
                  <div className="border rounded-lg p-2 max-h-56 overflow-y-auto space-y-1 bg-slate-50/40">
                    {merchantCategories.map((cat) => (
                      <label
                        key={cat.id}
                        className="flex items-center gap-2 text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={createMerchantCategories.includes(
                            cat.slashId
                          )}
                          onChange={() =>
                            setCreateMerchantCategories((prev) =>
                              toggleStringInArray(prev, cat.slashId)
                            )
                          }
                        />
                        <span className="text-xs">{cat.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* MERCHANT RULES */}
              <div className="space-y-2 text-sm">
                <div className="font-semibold text-slate-700">
                  Merchants allow
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    className="border rounded-lg px-3 py-2 flex-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="Type at least 3 characters to search merchant..."
                    value={merchantSearchQuery}
                    onChange={(e) => setMerchantSearchQuery(e.target.value)}
                  />
                  {merchantSearchCursor && (
                    <button
                      type="button"
                      className="border rounded-lg px-3 py-1 text-sm bg-white hover:bg-slate-50"
                      onClick={loadMoreMerchants}
                    >
                      Load more
                    </button>
                  )}
                </div>

                {/* Selected merchants pills */}
                {createMerchantIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {createMerchantIds.map((id, index) => {
                      const label =
                        createMerchantNames[index] ||
                        merchantSearchResult.find((m) => m.id === id)?.name ||
                        id;
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full text-xs"
                        >
                          {label}
                          <button
                            type="button"
                            className="ml-1 text-[10px]"
                            onClick={() => {
                              setCreateMerchantIds((prev) =>
                                prev.filter((x) => x !== id)
                              );
                              setCreateMerchantNames((prev) =>
                                prev.filter((_, i) => i !== index)
                              );
                            }}
                          >
                            ✕
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                <div className="border rounded-lg p-2 max-h-56 overflow-y-auto space-y-1 mt-1 bg-slate-50/40">
                  {merchantSearching && (
                    <div className="text-xs text-slate-500">Searching...</div>
                  )}
                  {!merchantSearching &&
                    merchantSearchResult.length === 0 && (
                      <div className="text-xs text-slate-500">
                        Type at least 3 characters to search.
                      </div>
                    )}
                  {merchantSearchResult.map((m) => (
                    <label
                      key={m.id}
                      className="flex items-center gap-2 text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={createMerchantIds.includes(m.id)}
                        onChange={() => {
                          setCreateMerchantIds((prev) =>
                            toggleStringInArray(prev, m.id)
                          );
                          const name = m.name || m.id;
                          setCreateMerchantNames((prev) => {
                            const existsIndex = prev.indexOf(name);
                            const currentlySelected =
                              createMerchantIds.includes(m.id);
                            if (!currentlySelected && existsIndex === -1) {
                              return [...prev, name];
                            }
                            if (currentlySelected && existsIndex !== -1) {
                              const copy = [...prev];
                              copy.splice(existsIndex, 1);
                              return copy;
                            }
                            return prev;
                          });
                        }}
                      />
                      <span className="text-xs">
                        {m.name || m.id}{" "}
                        {(m as any).merchantCategoryName
                          ? `– ${(m as any).merchantCategoryName}`
                          : ""}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="border rounded-lg px-4 py-1.5 bg-white hover:bg-slate-50"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 text-white rounded-lg px-5 py-1.5 shadow-md hover:bg-indigo-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingCard && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full p-6 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-semibold text-lg text-slate-800">
                Edit card #{editingCard.id}
              </h2>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600"
                onClick={() => setEditingCard(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="space-y-5">
              {/* name + status + limits */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Card name
                  </label>
                  <input
                    className="border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    value={editingCard.name}
                    onChange={(e) =>
                      setEditingCard({ ...editingCard, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    className="border rounded-lg px-3 py-2 w-full bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                  >
                    <option value="">Keep current</option>
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                    <option value="closed">closed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Daily limit (USD)
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    value={editDailyLimit ?? ""}
                    onChange={(e) =>
                      setEditDailyLimit(
                        e.target.value === "" ? null : Number(e.target.value)
                      )
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Min transaction (USD)
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    value={editMinTx ?? ""}
                    onChange={(e) =>
                      setEditMinTx(
                        e.target.value === "" ? null : Number(e.target.value)
                      )
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Max transaction (USD)
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    value={editMaxTx ?? ""}
                    onChange={(e) =>
                      setEditMaxTx(
                        e.target.value === "" ? null : Number(e.target.value)
                      )
                    }
                  />
                </div>
              </div>

              {/* RULES */}
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                {/* Countries */}
                <div>
                  <div className="font-semibold mb-1 text-slate-700">
                    Countries allow
                  </div>
                  <div className="border rounded-lg p-2 max-h-56 overflow-y-auto space-y-1 bg-slate-50/40">
                    {countries.map((c) => (
                      <label
                        key={c.code}
                        className="flex items-center gap-2 text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={editCountriesAllow.includes(c.code)}
                          onChange={() =>
                            setEditCountriesAllow((prev) =>
                              toggleStringInArray(prev, c.code)
                            )
                          }
                        />
                        <span className="text-xs">
                          {c.code} – {c.name}
                          {c.region ? ` (${c.region})` : ""}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* MCC */}
                <div>
                  <div className="font-semibold mb-1 text-slate-700">
                    MCC codes allow
                  </div>
                  <div className="border rounded-lg p-2 max-h-56 overflow-y-auto space-y-1 bg-slate-50/40">
                    {mccCodes.map((m) => (
                      <label
                        key={m.code}
                        className="flex items-center gap-2 text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={editMccCodesAllow.includes(m.code)}
                          onChange={() =>
                            setEditMccCodesAllow((prev) =>
                              toggleStringInArray(prev, m.code)
                            )
                          }
                        />
                        <span className="text-xs">
                          {m.code} – {m.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Merchant categories */}
                <div>
                  <div className="font-semibold mb-1 text-slate-700">
                    Merchant categories allow
                  </div>
                  <div className="border rounded-lg p-2 max-h-56 overflow-y-auto space-y-1 bg-slate-50/40">
                    {merchantCategories.map((cat) => (
                      <label
                        key={cat.id}
                        className="flex items-center gap-2 text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={editMerchantCategories.includes(
                            cat.slashId
                          )}
                          onChange={() =>
                            setEditMerchantCategories((prev) =>
                              toggleStringInArray(prev, cat.slashId)
                            )
                          }
                        />
                        <span className="text-xs">{cat.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* MERCHANT RULES EDIT */}
              <div className="space-y-2 text-sm">
                <div className="font-semibold text-slate-700">
                  Merchants allow
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    className="border rounded-lg px-3 py-2 flex-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="Type at least 3 characters to search merchant..."
                    value={merchantSearchQuery}
                    onChange={(e) => setMerchantSearchQuery(e.target.value)}
                  />
                  {merchantSearchCursor && (
                    <button
                      type="button"
                      className="border rounded-lg px-3 py-1 text-sm bg-white hover:bg-slate-50"
                      onClick={loadMoreMerchants}
                    >
                      Load more
                    </button>
                  )}
                </div>

                {/* Selected merchants pills */}
                {editMerchantIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {editMerchantIds.map((id, index) => {
                      const label =
                        editMerchantNames[index] ||
                        merchantSearchResult.find((m) => m.id === id)?.name ||
                        id;
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full text-xs"
                        >
                          {label}
                          <button
                            type="button"
                            className="ml-1 text-[10px]"
                            onClick={() => {
                              setEditMerchantIds((prev) =>
                                prev.filter((x) => x !== id)
                              );
                              setEditMerchantNames((prev) =>
                                prev.filter((_, i) => i !== index)
                              );
                            }}
                          >
                            ✕
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                <div className="border rounded-lg p-2 max-h-56 overflow-y-auto space-y-1 mt-1 bg-slate-50/40">
                  {merchantSearching && (
                    <div className="text-xs text-slate-500">Searching...</div>
                  )}
                  {!merchantSearching &&
                    merchantSearchResult.length === 0 && (
                      <div className="text-xs text-slate-500">
                        Type at least 3 characters to search.
                      </div>
                    )}
                  {merchantSearchResult.map((m) => (
                    <label
                      key={m.id}
                      className="flex items-center gap-2 text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={editMerchantIds.includes(m.id)}
                        onChange={() => {
                          setEditMerchantIds((prev) =>
                            toggleStringInArray(prev, m.id)
                          );
                          const name = m.name || m.id;
                          setEditMerchantNames((prev) => {
                            const existsIndex = prev.indexOf(name);
                            const currentlySelected =
                              editMerchantIds.includes(m.id);
                            if (!currentlySelected && existsIndex === -1) {
                              return [...prev, name];
                            }
                            if (currentlySelected && existsIndex !== -1) {
                              const copy = [...prev];
                              copy.splice(existsIndex, 1);
                              return copy;
                            }
                            return prev;
                          });
                        }}
                      />
                      <span className="text-xs">
                        {m.name || m.id}{" "}
                        {(m as any).merchantCategoryName
                          ? `– ${(m as any).merchantCategoryName}`
                          : ""}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="border rounded-lg px-4 py-1.5 bg-white hover:bg-slate-50"
                  onClick={() => setEditingCard(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 text-white rounded-lg px-5 py-1.5 shadow-md hover:bg-indigo-700"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {detailCard && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-slate-50 rounded-2xl shadow-2xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            {/* HEADER */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Card details
              </h2>
              <button
                type="button"
                className="text-rose-500 text-xl leading-none"
                onClick={() => setDetailCard(null)}
              >
                ✕
              </button>
            </div>

            {/* TEXT INFO (giống hình 1) */}
            <div className="space-y-1 text-sm text-slate-800 mb-4">
              <p>
                <span className="font-semibold">Card name: </span>
                {detailCard.name}
              </p>
              <p>
                <span className="font-semibold">Status: </span>
                {detailCard.status}
              </p>
              <p>
                <span className="font-semibold">Virtual account: </span>
                {detailCard.virtualAccountName || detailCard.virtualAccountId}
              </p>
              <p>
                <span className="font-semibold">Group: </span>
                {detailCard.cardGroupName || "-"}
              </p>
              {detailCard.isPhysical !== undefined && detailCard.isPhysical !== null && (
                <p>
                  <span className="font-semibold">Physical card: </span>
                  {detailCard.isPhysical ? "Yes" : "No"}
                </p>
              )}
              {detailCard.isSingleUse !== undefined &&
                detailCard.isSingleUse !== null && (
                  <p>
                    <span className="font-semibold">Single use: </span>
                    {detailCard.isSingleUse ? "Yes" : "No"}
                  </p>
                )}

              {/* PAN luôn hiện full */}
              <p>
                <span className="font-semibold">Card number (PAN): </span>
                {formatPanForDisplay(detailCard.pan, detailCard.last4 || null)}
              </p>

              {/* CVV: *** Show CVV */}
              <p className="flex items-center gap-2">
                <span className="font-semibold">CVV:</span>
                <span>
                  {detailCard.cvv
                    ? showCvv
                      ? detailCard.cvv
                      : "***"
                    : "***"}
                </span>
                {detailCard.cvv && (
                  <button
                    type="button"
                    className="text-xs text-indigo-600 underline"
                    onClick={() => setShowCvv((v) => !v)}
                  >
                    {showCvv ? "Hide CVV" : "Show CVV"}
                  </button>
                )}
              </p>

              {detailCard.last4 && (
                <p>
                  <span className="font-semibold">Last 4 digits: </span>
                  {detailCard.last4}
                </p>
              )}
              {detailCard.expiryMonth && detailCard.expiryYear && (
                <p>
                  <span className="font-semibold">Expiry: </span>
                  {detailCard.expiryMonth}/{detailCard.expiryYear}
                </p>
              )}
              <p>
                <span className="font-semibold">Created at: </span>
                {detailCard.createdAt
                  ? new Date(detailCard.createdAt).toLocaleString()
                  : "-"}
              </p>
            </div>

            {/* CARD FRONT / BACK (hình 2 + 3) */}
            <div className="grid md:grid-cols-2 gap-4 mb-5">
              {/* FRONT */}
              <div className="relative rounded-2xl overflow-hidden shadow-lg bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white px-5 py-4">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.15em] text-slate-300">
                      Card name
                    </div>
                    <div className="text-sm font-semibold">
                      {detailCard.name}
                    </div>
                  </div>
                  <div className="text-lg font-bold tracking-widest">
                    VISA
                  </div>
                </div>

                <div className="text-lg tracking-[0.25em] font-mono mb-4">
                  {formatPanForDisplay(detailCard.pan, detailCard.last4 || null)}
                </div>

                <div className="flex items-end justify-between text-xs">
                  <div>
                    <div className="uppercase text-[10px] text-slate-300 mb-1">
                      Card holder
                    </div>
                    <div className="font-semibold truncate max-w-[150px]">
                      {detailCard.name || "Card holder"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="uppercase text-[10px] text-slate-300 mb-1">
                      Expires
                    </div>
                    <div className="font-semibold">
                      {detailCard.expiryMonth && detailCard.expiryYear
                        ? `${detailCard.expiryMonth}/${detailCard.expiryYear}`
                        : "--/----"}
                    </div>
                  </div>
                </div>
              </div>

              {/* BACK */}
              <div className="relative rounded-2xl overflow-hidden shadow-lg bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white px-5 py-4">
                <div className="h-8 bg-black/60 -mx-5 mb-4" />

                <div className="text-xs mb-1 flex items-center justify-between px-1">
                  <span className="font-semibold tracking-wide uppercase">
                    CVV
                  </span>
                </div>

                <div className="bg-slate-100 text-slate-900 rounded-lg px-3 py-2 font-mono text-sm tracking-[0.3em]">
                  {detailCard.cvv
                    ? showCvv
                      ? detailCard.cvv
                      : "***"
                    : "***"}
                </div>

                <div className="absolute bottom-3 right-4 text-lg font-bold tracking-widest opacity-80">
                  VISA
                </div>
              </div>
            </div>

            {/* LIMITS + RULES */}
            <hr className="my-4 border-slate-200" />

            <div className="space-y-2 text-sm text-slate-800">
              <p>
                <span className="font-semibold">Daily limit (USD): </span>
                {detailCard.dailyLimitCents != null &&
                detailCard.dailyLimitCents > 0
                  ? formatAmount(detailCard.dailyLimitCents)
                  : "No limit"}
              </p>
              <p>
                <span className="font-semibold">Countries allow (ISO2): </span>
                {renderCodeList(detailCard.countriesAllow, countryLabelMap)}
              </p>
              <p>
                <span className="font-semibold">Merchant names allow: </span>
                {detailCard.merchantNamesAllow &&
                detailCard.merchantNamesAllow.length > 0
                  ? detailCard.merchantNamesAllow.join(", ")
                  : "Any"}
              </p>
              <p>
                <span className="font-semibold">
                  Merchant categories allow:
                </span>{" "}
                {renderCodeList(
                  detailCard.merchantCategories,
                  merchantCategoryLabelMap
                )}
              </p>
              <p>
                <span className="font-semibold">MCC codes allow: </span>
                {renderCodeList(detailCard.mccCodesAllow, mccLabelMap)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
