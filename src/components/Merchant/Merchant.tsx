import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContextProvider";
import {
  MerchantCategory,
  Merchant,
  MerchantSearchResponse,
  Account,
} from "../../types/Types";
import { merchantApi } from "../../api/api.merchant";
import { toast } from "react-toastify";

export const MerchantPages: React.FC = () => {
  const { user, loading } = useAuth();

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

  const [categories, setCategories] = useState<MerchantCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [searching, setSearching] = useState(false);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const pageSize = 20;
  const [merchantPage, setMerchantPage] = useState(0);
  const [hasSearched, setHasSearched] = useState(false); 

  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true);
      try {
        const data = await merchantApi.getAllCategories();
        const sorted = [...data].sort((a, b) => {
          const ao = a.displayOrder ?? 0;
          const bo = b.displayOrder ?? 0;
          if (ao !== bo) return ao - bo;
          return a.name.localeCompare(b.name);
        });
        setCategories(sorted);
      } catch (err: any) {
        console.error(err);
        toast.error(
          err?.response?.data?.message || "Unable to load merchant categories"
        );
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  const doSearch = async (cursor?: string) => {
    if (!activeAccountId) {
      toast.error("No active account to search merchants");
      return;
    }

    const keyword = searchText.trim();
    if (!keyword) {
      setMerchants([]);
      setNextCursor(null);
      setMerchantPage(0);
      return;
    }

    setSearching(true);
    try {
      const res: MerchantSearchResponse = await merchantApi.searchMerchants(
        activeAccountId,
        keyword,
        cursor
      );

      console.log("Merchant search result =", res);

      if (!cursor) {
        setMerchants(res.items || []);
        setMerchantPage(0);
      } else {
        setMerchants((prev) => [...prev, ...(res.items || [])]);
      }

      setNextCursor(res.metadata?.nextCursor ?? null);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Unable to search merchants");
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasSearched(true); 
    await doSearch();
  };

  const handleLoadMore = async () => {
    if (!nextCursor) return;
    await doSearch(nextCursor);
  };

  const merchantTotalPages = useMemo(() => {
    if (merchants.length === 0) return 1;
    return Math.max(1, Math.ceil(merchants.length / pageSize));
  }, [merchants, pageSize]);

  const merchantPageData = useMemo(() => {
    const start = merchantPage * pageSize;
    return merchants.slice(start, start + pageSize);
  }, [merchants, merchantPage, pageSize]);

  const handlePrevMerPage = () => {
    if (merchantPage <= 0) return;
    setMerchantPage((p) => p - 1);
  };

  const handleNextMerPage = () => {
    if (merchantPage >= merchantTotalPages - 1) return;
    setMerchantPage((p) => p + 1);
  };

  if (loading) return <div>Checking auth...</div>;
  if (!user) return <div>Please login to view merchants.</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h1 className="text-xl font-semibold text-slate-900">Merchants</h1>
          {/* <div className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-[11px] sm:text-xs text-slate-700">
            <span className="font-semibold">Account:</span>{" "}
            {activeAccount ? activeAccount.name : "No account selected"}
          </div> */}
        </div>

        <form
          onSubmit={handleSubmit}
          className=" flex-col sm:flex-row gap-3 items-stretch sm:items-end"
        >
          <div className="flex-1">
            <input
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>

          <div className="flex items-end gap-2 pt-2">
            <button
              type="submit"
              disabled={searching || !activeAccountId}
              className="inline-flex items-center justify-center rounded-xl bg-[#311BFF] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#2612e8] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {searching ? "Searching..." : "Search"}
            </button>

            {nextCursor && (
              <button
                type="button"
                disabled={searching}
                onClick={handleLoadMore}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Load more from Slash
              </button>
            )}
          </div>
        </form>
      </div>

      {hasSearched && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Merchant Search Results
          </h2>

          <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60">
            <div className="max-w-full overflow-x-auto">
              <table className="min-w-full text-xs sm:text-sm">
                <thead className="bg-slate-100/80 backdrop-blur">
                  <tr className="border-b border-slate-200/70">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      No
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      URL
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Merchant ID
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {searching && merchants.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-6 text-center text-xs text-slate-500"
                      >
                        Searching merchants...
                      </td>
                    </tr>
                  ) : merchants.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-6 text-center text-xs text-slate-500"
                      >
                        No merchants found.
                      </td>
                    </tr>
                  ) : (
                    merchantPageData.map((m) => (
                      <tr
                        key={m.id}
                        className="bg-white/60 hover:bg-indigo-50/60 transition-colors"
                      >
                        <td className="px-4 py-3 text-xs sm:text-sm text-slate-700">
                          {merchants.indexOf(m) + 1}
                        </td>
                        <td className="px-4 py-3 text-xs sm:text-sm text-slate-900">
                          {m.name || "-"}
                        </td>
                        <td className="px-4 py-3 text-xs sm:text-sm text-slate-700">
                          {m.url ? (
                            <a
                              href={m.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-600 hover:underline break-all"
                            >
                              {m.url}
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-4 py-3 text-[11px] sm:text-xs text-indigo-700 font-mono">
                          {m.id}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white/80 px-4 py-3">
              <p className="text-[11px] sm:text-xs text-slate-500">
                Page{" "}
                <span className="font-semibold text-slate-800">
                  {merchantPage + 1}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-800">
                  {merchantTotalPages}
                </span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-1.5 text-xs rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:text-slate-300 disabled:border-slate-100 disabled:bg-transparent transition"
                  disabled={merchantPage <= 0}
                  onClick={handlePrevMerPage}
                >
                  Prev
                </button>
                <span className="text-[11px] text-slate-400">
                  {merchantPage + 1} / {merchantTotalPages}
                </span>
                <button
                  className="px-3 py-1.5 text-xs rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:text-slate-300 disabled:border-slate-100 disabled:bg-transparent transition"
                  disabled={merchantPage >= merchantTotalPages - 1}
                  onClick={handleNextMerPage}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Merchant Categories
        </h2>

        <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60">
          <div className="max-w-full overflow-x-auto">
            <table className="min-w-full text-xs sm:text-sm">
              <thead className="bg-slate-100/80 backdrop-blur">
                <tr className="border-b border-slate-200/70">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    No
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Category Name
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Category ID
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingCategories ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-6 text-center text-xs text-slate-500"
                    >
                      Loading categories...
                    </td>
                  </tr>
                ) : categories.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-6 text-center text-xs text-slate-500"
                    >
                      No merchant categories found.
                    </td>
                  </tr>
                ) : (
                  categories.map((cat, idx) => (
                    <tr
                      key={cat.id}
                      className="bg-white/60 hover:bg-indigo-50/60 transition-colors"
                    >
                      <td className="px-4 py-3 text-xs sm:text-sm text-slate-700">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3 text-xs sm:text-sm text-slate-900">
                        {cat.name}
                      </td>
                      <td className="px-4 py-3 text-[11px] sm:text-xs text-indigo-700 font-mono">
                        {cat.slashId}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
