// // src/components/TransactionManager.tsx
// import React, { useEffect, useMemo, useState } from "react";
// import { toast } from "react-toastify";

// import { useAuth } from "../../context/AuthContextProvider";
// import {
//   Account,
//   VirtualAccount,
//   Card,
//   CardPage,
//   Transaction,
//   TransactionListResponse,
// } from "../../types/Types";

// import { virtualAccountApi } from "../../api/api.virtualaccout";
// import { cardApi } from "../../api/api.card";
// import { transactionApi } from "../../api/api.transaction";

// interface Props {
//   pageSize?: number;
// }

// export const TransactionManager: React.FC<Props> = ({ pageSize = 100 }) => {
//   const { user, loading: authLoading } = useAuth();

//   // ========== AUTH & ACTIVE ACCOUNT ==========
//   const accounts: Account[] = useMemo(() => user?.accounts ?? [], [user]);

//   const activeAccountId: number | null = useMemo(() => {
//     if (!accounts || accounts.length === 0) return null;
//     if ((user as any)?.activeAccount && (user as any).activeAccount.id) {
//       return (user as any).activeAccount.id;
//     }
//     return accounts[0].id;
//   }, [accounts, user]);

//   const activeAccount = useMemo(
//     () => accounts.find((a) => a.id === activeAccountId) || null,
//     [accounts, activeAccountId]
//   );

//   // ========== META: VA & CARD ==========
//   const [vaOptions, setVaOptions] = useState<VirtualAccount[]>([]);
//   const [vaLoading, setVaLoading] = useState(false);

//   const [cardOptions, setCardOptions] = useState<Card[]>([]);
//   const [cardLoading, setCardLoading] = useState(false);

//   const [selectedVaId, setSelectedVaId] = useState<number | null>(null);
//   const [selectedCardId, setSelectedCardId] = useState<number | null>(null);

//   // reset filter khi đổi account
//   useEffect(() => {
//     setSelectedVaId(null);
//     setSelectedCardId(null);
//   }, [activeAccountId]);

//   // Load VA list by account
//   useEffect(() => {
//     const loadVas = async () => {
//       if (!activeAccountId) {
//         setVaOptions([]);
//         return;
//       }
//       try {
//         setVaLoading(true);
//         const res = await virtualAccountApi.getByAccountPaged(
//           activeAccountId,
//           0,
//           500,
//           undefined
//         );
//         setVaOptions(res.content || []);
//       } catch (err) {
//         console.error(err);
//         toast.error("Failed to load virtual accounts");
//       } finally {
//         setVaLoading(false);
//       }
//     };
//     loadVas();
//   }, [activeAccountId]);

//   // Load card list (filter by VA nếu chọn)
//   useEffect(() => {
//     const loadCards = async () => {
//       if (!activeAccountId) {
//         setCardOptions([]);
//         return;
//       }
//       try {
//         setCardLoading(true);
//         const res: CardPage = await cardApi.getPagedCards({
//           accountId: activeAccountId,
//           virtualAccountId: selectedVaId ?? undefined,
//           cardGroupId: undefined,
//           page: 0,
//           size: 500,
//         });
//         setCardOptions(res.content || []);
//       } catch (err) {
//         console.error(err);
//         toast.error("Failed to load cards");
//       } finally {
//         setCardLoading(false);
//       }
//     };
//     loadCards();
//   }, [activeAccountId, selectedVaId]);

//   // ========== FILTERS ==========
//   const [statusFilter, setStatusFilter] = useState<string>("");
//   const [dateFrom, setDateFrom] = useState<string>("");
//   const [dateTo, setDateTo] = useState<string>("");
//   const [minAmount, setMinAmount] = useState<string>("");
//   const [maxAmount, setMaxAmount] = useState<string>("");
//   const [merchantSearch, setMerchantSearch] = useState<string>("");

//   // ========== TRANSACTIONS STATE (CURSOR-BASED) ==========
//   const [transactions, setTransactions] = useState<Transaction[]>([]);
//   const [nextCursor, setNextCursor] = useState<string | null>(null);
//   const [loadingTx, setLoadingTx] = useState(false);
//   const [initialLoaded, setInitialLoaded] = useState(false);

//   const clearTransactions = () => {
//     setTransactions([]);
//     setNextCursor(null);
//   };

//   const buildSearchParams = (cursor?: string | null) => {
//     const va = vaOptions.find((v) => v.id === selectedVaId);
//     const card = cardOptions.find((c) => c.id === selectedCardId);

//     const minAmountCents =
//       minAmount.trim() !== "" ? Math.round(Number(minAmount) * 100) : undefined;
//     const maxAmountCents =
//       maxAmount.trim() !== "" ? Math.round(Number(maxAmount) * 100) : undefined;

//     return {
//       accountId: activeAccountId!,
//       virtualAccountId: va?.slashId,
//       cardId: card?.slashId,
//       status: statusFilter || undefined,
//       dateFrom: dateFrom || undefined,
//       dateTo: dateTo || undefined,
//       minAmountCents:
//         Number.isFinite(minAmountCents as any) && (minAmountCents as any) > 0
//           ? minAmountCents
//           : undefined,
//       maxAmountCents:
//         Number.isFinite(maxAmountCents as any) && (maxAmountCents as any) > 0
//           ? maxAmountCents
//           : undefined,
//       merchant: merchantSearch.trim() || undefined,
//       cursor: cursor ?? undefined,
//       size: pageSize,
//     };
//   };

//   const loadTransactions = async (cursor?: string | null, append = false) => {
//     if (!activeAccountId) return;
//     try {
//       setLoadingTx(true);
//       const params = buildSearchParams(cursor);
//       const res: TransactionListResponse = await transactionApi.search(params);

//       setTransactions((prev) =>
//         append ? [...prev, ...(res.items || [])] : res.items || []
//       );
//       setNextCursor(res.metadata?.nextCursor ?? null);
//       setInitialLoaded(true);
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to load transactions");
//     } finally {
//       setLoadingTx(false);
//     }
//   };

//   // load lần đầu + khi filter đổi (không dùng cursor cũ)
//   useEffect(() => {
//     if (!activeAccountId) return;

//     clearTransactions();
//     loadTransactions(null, false);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [
//     activeAccountId,
//     selectedVaId,
//     selectedCardId,
//     statusFilter,
//     dateFrom,
//     dateTo,
//     minAmount,
//     maxAmount,
//     merchantSearch,
//     pageSize,
//   ]);

//   const handleLoadMore = () => {
//     if (!nextCursor || loadingTx) return;
//     loadTransactions(nextCursor, true);
//   };

//   const formatAmount = (cents?: number | null): string => {
//     if (cents == null) return "-";
//     const usd = cents / 100;
//     return usd.toLocaleString(undefined, {
//       minimumFractionDigits: 2,
//       maximumFractionDigits: 2,
//     });
//   };

//   const formatDateTime = (iso?: string | null): string => {
//     if (!iso) return "-";
//     const d = new Date(iso);
//     if (Number.isNaN(d.getTime())) return iso;
//     return d.toLocaleString();
//   };

//   const getVaLabel = (t: Transaction): string => {
//     if (t.virtualAccountId) return t.virtualAccountId;
//     const va = vaOptions.find((v) => v.slashId === t.virtualAccountId);
//     return va?.name || va?.id?.toString() || "-";
//   };

//   const getCardLabel = (t: Transaction): string => {
//     if (t.cardId) {
//       const card = cardOptions.find((c) => c.slashId === t.cardId);
//       if (card) return card.name || `**** ${card.last4 ?? ""}`;
//     }
//     return t.cardId || "-";
//   };

//   if (authLoading) {
//     return (
//       <div className="flex items-center justify-center h-64 text-slate-500">
//         Loading authentication...
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-5">
//       {/* HEADER + FILTERS GỘP 1 BLOCK */}
//       <div className="rounded-2xl bg-white shadow-sm border border-slate-200/70 p-4 space-y-4">
//         <div className="flex flex-wrap items-center justify-between gap-4">
//           <div className="space-y-1">
//             <div className="text-xs uppercase tracking-[0.16em] text-slate-500">
//               Transactions
//             </div>
//             <div className="text-lg font-semibold text-slate-900">
//               {activeAccount ? activeAccount.name : "No active account"}
//             </div>
//             <div className="flex flex-wrap gap-3 text-xs text-slate-600">
//               <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-full">
//                 <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
//                 Virtual accounts: {vaLoading ? "..." : vaOptions.length || "0"}
//               </span>
//               <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-full">
//                 <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
//                 Cards: {cardLoading ? "..." : cardOptions.length || "0"}
//               </span>
//               <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-full">
//                 <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
//                 Loaded: {transactions.length}
//               </span>
//             </div>
//           </div>

//           <div className="flex items-center gap-3">
//             <button
//               type="button"
//               className="rounded-full bg-indigo-600 text-white px-5 py-1.5 text-sm font-medium shadow-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
//               disabled={!activeAccountId || loadingTx}
//               onClick={() => {
//                 clearTransactions();
//                 loadTransactions(null, false);
//               }}
//             >
//               🔄 Refresh
//             </button>
//           </div>
//         </div>

//         {/* FILTERS */}
//         <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
//           {/* left filters */}
//           <div className="flex flex-wrap items-center gap-3 text-sm">
//             {/* VA */}
//             <div className="flex items-center gap-2">
//               <span className="font-medium text-slate-700 text-xs uppercase tracking-wide">
//                 Virtual account
//               </span>
//               <select
//                 className="border border-slate-200 rounded-full px-3 py-1 min-w-[160px] bg-slate-50 text-slate-800 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
//                 value={selectedVaId ?? ""}
//                 onChange={(e) =>
//                   setSelectedVaId(
//                     e.target.value ? Number(e.target.value) : null
//                   )
//                 }
//               >
//                 <option value="">All VAs</option>
//                 {vaOptions.map((va) => (
//                   <option key={va.id} value={va.id}>
//                     {va.name || va.slashId || va.id}
//                   </option>
//                 ))}
//               </select>
//             </div>

//             {/* Card */}
//             <div className="flex items-center gap-2">
//               <span className="font-medium text-slate-700 text-xs uppercase tracking-wide">
//                 Card
//               </span>
//               <select
//                 className="border border-slate-200 rounded-full px-3 py-1 min-w-[160px] bg-slate-50 text-slate-800 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
//                 value={selectedCardId ?? ""}
//                 onChange={(e) =>
//                   setSelectedCardId(
//                     e.target.value ? Number(e.target.value) : null
//                   )
//                 }
//               >
//                 <option value="">All cards</option>
//                 {cardOptions.map((c) => (
//                   <option key={c.id} value={c.id}>
//                     {c.name || `**** ${c.last4 ?? ""}` || c.id}
//                   </option>
//                 ))}
//               </select>
//             </div>

//             {/* Status */}
//             <div className="flex items-center gap-2">
//               <span className="font-medium text-slate-700 text-xs uppercase tracking-wide">
//                 Status
//               </span>
//               <select
//                 className="border border-slate-200 rounded-full px-3 py-1 min-w-[140px] bg-slate-50 text-slate-800 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
//                 value={statusFilter}
//                 onChange={(e) => setStatusFilter(e.target.value)}
//               >
//                 <option value="">All</option>
//                 <option value="pending">Pending</option>
//                 <option value="posted">Posted</option>
//                 <option value="declined">Declined</option>
//               </select>
//             </div>
//           </div>

//           {/* right filters */}
//           <div className="flex flex-wrap items-center gap-3 text-sm">
//             {/* Date range */}
//             <div className="flex items-center gap-2">
//               <span className="font-medium text-slate-700 text-xs uppercase tracking-wide">
//                 Date
//               </span>
//               <input
//                 type="date"
//                 className="border border-slate-200 rounded-full px-3 py-1 bg-slate-50 text-slate-800 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
//                 value={dateFrom}
//                 onChange={(e) => setDateFrom(e.target.value)}
//               />
//               <span className="text-slate-400 text-xs">–</span>
//               <input
//                 type="date"
//                 className="border border-slate-200 rounded-full px-3 py-1 bg-slate-50 text-slate-800 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
//                 value={dateTo}
//                 onChange={(e) => setDateTo(e.target.value)}
//               />
//             </div>

//             {/* Amount range */}
//             <div className="flex items-center gap-2">
//               <span className="font-medium text-slate-700 text-xs uppercase tracking-wide">
//                 Amount (USD)
//               </span>
//               <input
//                 type="number"
//                 placeholder="Min"
//                 className="border border-slate-200 rounded-full px-3 py-1 w-20 bg-slate-50 text-slate-800 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
//                 value={minAmount}
//                 onChange={(e) => setMinAmount(e.target.value)}
//               />
//               <span className="text-slate-400 text-xs">–</span>
//               <input
//                 type="number"
//                 placeholder="Max"
//                 className="border border-slate-200 rounded-full px-3 py-1 w-20 bg-slate-50 text-slate-800 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
//                 value={maxAmount}
//                 onChange={(e) => setMaxAmount(e.target.value)}
//               />
//             </div>

//             {/* Merchant search */}
//             <div className="relative">
//               <input
//                 className="border border-slate-200 rounded-full pl-8 pr-3 py-1.5 text-xs min-w-[180px] bg-slate-50 text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
//                 placeholder="Merchant search..."
//                 value={merchantSearch}
//                 onChange={(e) => setMerchantSearch(e.target.value)}
//               />
//               <span className="absolute left-2 top-1.5 text-slate-400 text-xs">
//                 🔍
//               </span>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* TABLE */}
//       <div className="border border-slate-200/70 rounded-2xl overflow-hidden bg-white shadow-sm">
//         <table className="w-full text-sm">
//           <thead className="bg-slate-50/90 text-slate-600 border-b border-slate-200/80">
//             <tr>
//               <th className="px-3 py-3 text-left font-semibold text-xs uppercase tracking-wide">
//                 Date
//               </th>
//               <th className="px-3 py-3 text-left font-semibold text-xs uppercase tracking-wide">
//                 Merchant / Description
//               </th>
//               <th className="px-3 py-3 text-left font-semibold text-xs uppercase tracking-wide">
//                 VA
//               </th>
//               <th className="px-3 py-3 text-left font-semibold text-xs uppercase tracking-wide">
//                 Card
//               </th>
//               <th className="px-3 py-3 text-right font-semibold text-xs uppercase tracking-wide">
//                 Amount (USD)
//               </th>
//               <th className="px-3 py-3 text-left font-semibold text-xs uppercase tracking-wide">
//                 Status
//               </th>
//             </tr>
//           </thead>
//           <tbody>
//             {loadingTx && !initialLoaded ? (
//               <tr>
//                 <td
//                   colSpan={6}
//                   className="px-4 py-8 text-center text-slate-500 text-sm"
//                 >
//                   <div className="flex flex-col items-center gap-2">
//                     <span className="inline-block h-5 w-5 border-[3px] border-slate-400 border-t-transparent rounded-full animate-spin" />
//                     <span>Loading transactions...</span>
//                   </div>
//                 </td>
//               </tr>
//             ) : transactions.length === 0 ? (
//               <tr>
//                 <td
//                   colSpan={6}
//                   className="px-4 py-8 text-center text-slate-500 text-sm"
//                 >
//                   No transactions found
//                 </td>
//               </tr>
//             ) : (
//               transactions.map((t, idx) => (
//                 <tr
//                   key={t.id + "-" + idx}
//                   className={`border-t border-slate-100/80 transition hover:bg-indigo-50/40 ${
//                     idx % 2 === 1 ? "bg-slate-50/40" : "bg-white"
//                   }`}
//                 >
//                   <td className="px-3 py-2 text-slate-800 whitespace-nowrap text-xs md:text-sm">
//                     {formatDateTime(t.date)}
//                   </td>
//                   <td className="px-3 py-2 text-slate-800 text-xs md:text-sm">
//                     <div className="flex flex-col gap-[2px]">
//                       <span className="font-medium truncate max-w-[260px]">
//                         {t.merchantDescription || t.description || "-"}
//                       </span>
//                       {t.memo && (
//                         <span className="text-[11px] text-slate-500 truncate max-w-[260px]">
//                           {t.memo}
//                         </span>
//                       )}
//                     </div>
//                   </td>
//                   <td className="px-3 py-2 text-slate-800 text-xs md:text-sm">
//                     {getVaLabel(t)}
//                   </td>
//                   <td className="px-3 py-2 text-slate-800 text-xs md:text-sm">
//                     {getCardLabel(t)}
//                   </td>
//                   <td className="px-3 py-2 text-right text-xs md:text-sm">
//                     <span
//                       className={`inline-flex items-center px-2 py-[2px] rounded-full text-[11px] font-semibold ${
//                         (t.amountCents ?? 0) < 0
//                           ? "bg-emerald-50 text-emerald-700"
//                           : "bg-rose-50 text-rose-700"
//                       }`}
//                     >
//                       {t.amountCents != null && t.amountCents !== 0
//                         ? (t.amountCents ?? 0) < 0
//                           ? "-" + formatAmount(Math.abs(t.amountCents))
//                           : "+" + formatAmount(t.amountCents)
//                         : formatAmount(t.amountCents)}
//                     </span>
//                   </td>
//                   <td className="px-3 py-2 text-xs md:text-sm">
//                     <span
//                       className={`inline-flex px-2 py-[2px] rounded-full text-[11px] font-medium ${
//                         t.status === "pending"
//                           ? "bg-amber-50 text-amber-700"
//                           : t.status === "posted"
//                           ? "bg-emerald-50 text-emerald-700"
//                           : t.status === "declined"
//                           ? "bg-rose-50 text-rose-700"
//                           : "bg-slate-50 text-slate-600"
//                       }`}
//                     >
//                       {t.status || "Unknown"}
//                     </span>
//                   </td>
//                 </tr>
//               ))
//             )}
//           </tbody>
//         </table>
//       </div>

//       {/* LOAD MORE */}
//       <div className="flex items-center justify-between text-xs md:text-sm text-slate-600">
//         <span>
//           Loaded{" "}
//           <span className="font-semibold">{transactions.length}</span>{" "}
//           transaction(s)
//         </span>
//         <div className="flex items-center gap-2">
//           {nextCursor && (
//             <button
//               className="border px-3 py-1 rounded-full bg-white hover:bg-slate-50 disabled:opacity-40 text-xs md:text-sm transition flex items-center gap-1"
//               disabled={loadingTx}
//               onClick={handleLoadMore}
//             >
//               {loadingTx && (
//                 <span className="inline-block h-3 w-3 border-[2px] border-slate-400 border-t-transparent rounded-full animate-spin" />
//               )}
//               Load more
//             </button>
//           )}
//           {!nextCursor && initialLoaded && (
//             <span className="text-[11px] text-slate-400">
//               No more transactions
//             </span>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };
