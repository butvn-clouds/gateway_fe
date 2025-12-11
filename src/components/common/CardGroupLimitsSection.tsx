// import React from "react";
// import {
//   CountryOptionDTO,
//   MccCodeOption,
//   Merchant,
//   MerchantCategory,
// } from "../../types/Types";

// export type RuleMode = "OFF" | "BLOCKED" | "ALLOWED";
// export type UtilizationPreset = "daily" | "weekly" | "monthly";

// interface CardGroupLimitsSectionProps {
//   mode: "create" | "edit";

//   // ====== LIMITS ======
//   txnLimitOn: boolean;
//   setTxnLimitOn: (v: boolean) => void;

//   utilLimitOn: boolean;
//   setUtilLimitOn: (v: boolean) => void;

//   utilPreset: UtilizationPreset;
//   setUtilPreset: (p: UtilizationPreset) => void;

//   minTxnInput: string;
//   onMinTxnChange: (raw: string) => void;
//   onMinTxnBlur: () => void;

//   maxTxnInput: string;
//   onMaxTxnChange: (raw: string) => void;
//   onMaxTxnBlur: () => void;

//   dailyLimitInput: string;
//   onDailyLimitChange: (raw: string) => void;
//   onDailyLimitBlur: () => void;

//   // ====== RULE MODES ======
//   merchantCategoryMode: RuleMode;
//   setMerchantCategoryMode: (m: RuleMode) => void;

//   mccMode: RuleMode;
//   setMccMode: (m: RuleMode) => void;

//   merchantMode: RuleMode;
//   setMerchantMode: (m: RuleMode) => void;

//   countryMode: RuleMode;
//   setCountryMode: (m: RuleMode) => void;

//   // ====== SELECTED VALUES ======
//   selectedMerchantCategoryIds: string[];
//   setSelectedMerchantCategoryIds: (ids: string[]) => void;

//   selectedMccCodes: string[];
//   setSelectedMccCodes: (codes: string[]) => void;

//   selectedMerchantIds: string[];
//   setSelectedMerchantIds: (ids: string[]) => void;

//   selectedCountryCodes: string[];
//   setSelectedCountryCodes: (codes: string[]) => void;

//   // ====== OPTIONS ======
//   merchantCategories: MerchantCategory[];
//   mccOptions: MccCodeOption[];
//   countryOptions: CountryOptionDTO[];

//   // ====== MERCHANT SEARCH ======
//   merchantSearchKeyword: string;
//   setMerchantSearchKeyword: (v: string) => void;
//   onSearchMerchant: () => void;
//   merchantSearchResults: Merchant[];
//   loadingMerchantSearch: boolean;

//   // ====== META LOADING ======
//   loadingMeta: boolean;
// }

// const disabledInputClass = (enabled: boolean) =>
//   enabled
//     ? "bg-white"
//     : "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200";

// const renderRuleModeToggle = (
//   mode: RuleMode,
//   setMode: (m: RuleMode) => void
// ) => (
//   <div className="inline-flex rounded-full bg-slate-100 p-0.5 text-[11px]">
//     <button
//       type="button"
//       className={`px-3 py-1 rounded-full ${
//         mode === "OFF"
//           ? "bg-white shadow-sm text-slate-900"
//           : "text-slate-500 hover:text-slate-700"
//       }`}
//       onClick={() => setMode("OFF")}
//     >
//       Off
//     </button>
//     <button
//       type="button"
//       className={`px-3 py-1 rounded-full ${
//         mode === "BLOCKED"
//           ? "bg-rose-500 text-white shadow-sm"
//           : "text-slate-500 hover:text-slate-700"
//       }`}
//       onClick={() => setMode("BLOCKED")}
//     >
//       Blocked
//     </button>
//     <button
//       type="button"
//       className={`px-3 py-1 rounded-full ${
//         mode === "ALLOWED"
//           ? "bg-emerald-500 text-white shadow-sm"
//           : "text-slate-500 hover:text-slate-700"
//       }`}
//       onClick={() => setMode("ALLOWED")}
//     >
//       Allowed
//     </button>
//   </div>
// );

// export const CardGroupLimitsSection: React.FC<CardGroupLimitsSectionProps> = ({
//   mode,
//   txnLimitOn,
//   setTxnLimitOn,
//   utilLimitOn,
//   setUtilLimitOn,
//   utilPreset,
//   setUtilPreset,
//   minTxnInput,
//   onMinTxnChange,
//   onMinTxnBlur,
//   maxTxnInput,
//   onMaxTxnChange,
//   onMaxTxnBlur,
//   dailyLimitInput,
//   onDailyLimitChange,
//   onDailyLimitBlur,
//   merchantCategoryMode,
//   setMerchantCategoryMode,
//   mccMode,
//   setMccMode,
//   merchantMode,
//   setMerchantMode,
//   countryMode,
//   setCountryMode,
//   selectedMerchantCategoryIds,
//   setSelectedMerchantCategoryIds,
//   selectedMccCodes,
//   setSelectedMccCodes,
//   selectedMerchantIds,
//   setSelectedMerchantIds,
//   selectedCountryCodes,
//   setSelectedCountryCodes,
//   merchantCategories,
//   mccOptions,
//   countryOptions,
//   merchantSearchKeyword,
//   setMerchantSearchKeyword,
//   onSearchMerchant,
//   merchantSearchResults,
//   loadingMerchantSearch,
//   loadingMeta,
// }) => {
//   const isCreate = mode === "create";

//   return (
//     <div className="grid grid-cols-1 md:grid-cols-[3fr,2fr] gap-6">
//       {/* LEFT: controls */}
//       <div className="space-y-4">
//         {/* Transaction Size Limit */}
//         <div className="rounded-2xl bg-white border border-slate-200/80 p-4 space-y-3">
//           <div className="flex items-center justify-between gap-3">
//             <div>
//               <div className="text-sm font-semibold text-slate-900">
//                 Transaction Size Limit
//               </div>
//               <p className="text-[11px] text-slate-500">
//                 Control minimum and maximum transaction size.
//               </p>
//             </div>
//             <div className="inline-flex rounded-full bg-slate-100 p-0.5 text-[11px]">
//               <button
//                 type="button"
//                 className={`px-3 py-1 rounded-full ${
//                   !txnLimitOn
//                     ? "bg-white shadow-sm text-slate-900"
//                     : "text-slate-500 hover:text-slate-700"
//                 }`}
//                 onClick={() => setTxnLimitOn(false)}
//               >
//                 Off
//               </button>
//               <button
//                 type="button"
//                 className={`px-3 py-1 rounded-full ${
//                   txnLimitOn
//                     ? "bg-emerald-500 text-white shadow-sm"
//                     : "text-slate-500 hover:text-slate-700"
//                 }`}
//                 onClick={() => setTxnLimitOn(true)}
//               >
//                 On
//               </button>
//             </div>
//           </div>

//           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//             <div className="space-y-1">
//               <span className="text-[11px] font-medium text-slate-600">
//                 Min
//               </span>
//               <input
//                 type="text"
//                 inputMode="decimal"
//                 className={`w-full rounded-xl border border-transparent px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 ${disabledInputClass(
//                   txnLimitOn
//                 )}`}
//                 value={minTxnInput}
//                 disabled={!txnLimitOn}
//                 onChange={(e) => onMinTxnChange(e.target.value)}
//                 onBlur={onMinTxnBlur}
//                 placeholder="No minimum"
//               />
//             </div>
//             <div className="space-y-1">
//               <span className="text-[11px] font-medium text-slate-600">
//                 Max
//               </span>
//               <input
//                 type="text"
//                 inputMode="decimal"
//                 className={`w-full rounded-xl border border-transparent px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 ${disabledInputClass(
//                   txnLimitOn
//                 )}`}
//                 value={maxTxnInput}
//                 disabled={!txnLimitOn}
//                 onChange={(e) => onMaxTxnChange(e.target.value)}
//                 onBlur={onMaxTxnBlur}
//                 placeholder="No maximum"
//               />
//             </div>
//           </div>
//         </div>

//         {/* Utilization Limit */}
//         <div className="rounded-2xl bg-white border border-slate-200/80 p-4 space-y-3">
//           <div className="flex items-center justify-between gap-3">
//             <div>
//               <div className="text-sm font-semibold text-slate-900">
//                 Utilization Limit
//               </div>
//               <p className="text-[11px] text-slate-500">
//                 Limit total spend for a given time frame.
//               </p>
//             </div>
//             <div className="inline-flex rounded-full bg-slate-100 p-0.5 text-[11px]">
//               <button
//                 type="button"
//                 className={`px-3 py-1 rounded-full ${
//                   !utilLimitOn
//                     ? "bg-white shadow-sm text-slate-900"
//                     : "text-slate-500 hover:text-slate-700"
//                 }`}
//                 onClick={() => setUtilLimitOn(false)}
//               >
//                 Off
//               </button>
//               <button
//                 type="button"
//                 className={`px-3 py-1 rounded-full ${
//                   utilLimitOn
//                     ? "bg-emerald-500 text-white shadow-sm"
//                     : "text-slate-500 hover:text-slate-700"
//                 }`}
//                 onClick={() => setUtilLimitOn(true)}
//               >
//                 On
//               </button>
//             </div>
//           </div>

//           <div className="grid grid-cols-1 sm:grid-cols-[2fr,2fr] gap-3">
//             <div className="space-y-1">
//               <span className="text-[11px] font-medium text-slate-600">
//                 Limit amount (USD)
//               </span>
//               <input
//                 type="text"
//                 inputMode="decimal"
//                 className={`w-full rounded-xl border border-transparent px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 ${disabledInputClass(
//                   utilLimitOn
//                 )}`}
//                 value={dailyLimitInput}
//                 disabled={!utilLimitOn}
//                 onChange={(e) => onDailyLimitChange(e.target.value)}
//                 onBlur={onDailyLimitBlur}
//                 placeholder="Enter amount..."
//               />
//             </div>

//             <div className="space-y-1">
//               <span className="text-[11px] font-medium text-slate-600">
//                 Timeframe
//               </span>
//               <select
//                 className={`w-full rounded-xl border border-transparent px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 ${disabledInputClass(
//                   utilLimitOn
//                 )}`}
//                 value={utilPreset}
//                 disabled={!utilLimitOn}
//                 onChange={(e) =>
//                   setUtilPreset(e.target.value as UtilizationPreset)
//                 }
//               >
//                 <option value="daily">Daily</option>
//                 <option value="weekly">Weekly</option>
//                 <option value="monthly">Monthly</option>
//               </select>
//             </div>
//           </div>
//         </div>

//         {/* Merchant Categories */}
//         <div className="rounded-2xl bg-white border border-slate-200/80 p-4 space-y-3">
//           <div className="flex items-center justify-between gap-3">
//             <div>
//               <div className="text-sm font-semibold text-slate-900">
//                 Merchant Categories
//               </div>
//               <p className="text-[11px] text-slate-500">
//                 Allow or block spending by merchant category.
//               </p>
//             </div>
//             {renderRuleModeToggle(
//               merchantCategoryMode,
//               setMerchantCategoryMode
//             )}
//           </div>

//           <select
//             multiple
//             className="w-full min-h-[80px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
//             value={selectedMerchantCategoryIds}
//             onChange={(e) => {
//               const values = Array.from(e.target.selectedOptions).map(
//                 (o) => o.value
//               );
//               setSelectedMerchantCategoryIds(values);
//             }}
//             disabled={merchantCategoryMode === "OFF" || loadingMeta}
//           >
//             {merchantCategories.map((mc) => (
//               <option key={mc.id} value={mc.id}>
//                 {mc.name}
//               </option>
//             ))}
//           </select>

//           <p className="text-[11px] text-slate-400">
//             Mode = Allowed nhưng không chọn category nào ⇒ sẽ chặn mọi giao
//             dịch theo category.
//           </p>
//         </div>

//         {/* MCCs */}
//         <div className="rounded-2xl bg-white border border-slate-200/80 p-4 space-y-3">
//           <div className="flex items-center justify-between gap-3">
//             <div>
//               <div className="text-sm font-semibold text-slate-900">
//                 Allowed MCCs
//               </div>
//               <p className="text-[11px] text-slate-500">
//                 Configure rules by merchant category code (MCC).
//               </p>
//             </div>
//             {renderRuleModeToggle(mccMode, setMccMode)}
//           </div>

//           <select
//             multiple
//             className="w-full min-h-[80px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
//             value={selectedMccCodes}
//             onChange={(e) => {
//               const values = Array.from(e.target.selectedOptions).map(
//                 (o) => o.value
//               );
//               setSelectedMccCodes(values);
//             }}
//             disabled={mccMode === "OFF" || loadingMeta}
//           >
//             {mccOptions.map((m) => (
//               <option key={m.code} value={m.code}>
//                 {m.code} – {m.name}
//               </option>
//             ))}
//           </select>

//           <p className="text-[11px] text-slate-400">
//             Mode = Allowed nhưng không chọn MCC nào ⇒ sẽ chặn mọi giao dịch
//             theo MCC.
//           </p>
//         </div>

//         {/* Merchants */}
//         <div className="rounded-2xl bg-white border border-slate-200/80 p-4 space-y-3">
//           <div className="flex items-center justify-between gap-3">
//             <div>
//               <div className="text-sm font-semibold text-slate-900">
//                 Merchants
//               </div>
//               <p className="text-[11px] text-slate-500">
//                 Allow or block specific merchants.
//               </p>
//             </div>
//             {renderRuleModeToggle(merchantMode, setMerchantMode)}
//           </div>

//           <div className="flex gap-2">
//             <input
//               className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
//               placeholder="Search merchant name..."
//               value={merchantSearchKeyword}
//               onChange={(e) => setMerchantSearchKeyword(e.target.value)}
//               disabled={merchantMode === "OFF"}
//             />
//             <button
//               type="button"
//               onClick={onSearchMerchant}
//               disabled={merchantMode === "OFF" || loadingMerchantSearch}
//               className="px-3 py-1.5 text-xs rounded-xl bg-slate-800 text-white disabled:opacity-50"
//             >
//               {loadingMerchantSearch ? "Searching..." : "Search"}
//             </button>
//           </div>

//           <select
//             multiple
//             className="w-full min-h-[80px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
//             value={selectedMerchantIds}
//             onChange={(e) => {
//               const values = Array.from(e.target.selectedOptions).map(
//                 (o) => o.value
//               );
//               setSelectedMerchantIds(values);
//             }}
//             disabled={merchantMode === "OFF"}
//           >
//             {merchantSearchResults.map((m) => (
//               <option key={m.id} value={m.id}>
//                 {m.name}
//               </option>
//             ))}
//           </select>

//           <p className="text-[11px] text-slate-400">
//             Chọn nhiều merchant bằng Ctrl / Cmd + click.
//           </p>
//         </div>

//         {/* Countries */}
//         <div className="rounded-2xl bg-white border border-slate-200/80 p-4 space-y-3">
//           <div className="flex items-center justify-between gap-3">
//             <div>
//               <div className="text-sm font-semibold text-slate-900">
//                 Countries
//               </div>
//               <p className="text-[11px] text-slate-500">
//                 Restrict where cards can be used geographically.
//               </p>
//             </div>
//             {renderRuleModeToggle(countryMode, setCountryMode)}
//           </div>

//           <select
//             multiple
//             className="w-full min-h-[80px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
//             value={selectedCountryCodes}
//             onChange={(e) => {
//               const values = Array.from(e.target.selectedOptions).map(
//                 (o) => o.value
//               );
//               setSelectedCountryCodes(values);
//             }}
//             disabled={countryMode === "OFF" || loadingMeta}
//           >
//             {countryOptions.map((c) => (
//               <option key={c.alpha2} value={c.alpha2}>
//                 {c.alpha2} – {c.name}
//               </option>
//             ))}
//           </select>

//           <p className="text-[11px] text-slate-400">
//             Mode = Blocked ⇒ chặn các nước được chọn. Mode = Allowed ⇒ chỉ cho
//             phép các nước được chọn.
//           </p>
//         </div>
//       </div>

//       {/* RIGHT: preview */}
//       <div className="hidden md:flex flex-col rounded-3xl bg-white border border-slate-200/80 p-5 space-y-3">
//         <div className="h-32 rounded-2xl bg-slate-50 flex items-center justify-center text-xs text-slate-400">
//           {isCreate ? "New card group preview" : "Existing card group preview"}
//         </div>
//         <div className="space-y-2 text-[11px] text-slate-500">
//           <div>
//             {txnLimitOn
//               ? "Custom transaction size limits applied."
//               : "No transaction size limits."}
//           </div>
//           <div>
//             {utilLimitOn
//               ? `Utilization limit is enabled (${utilPreset}).`
//               : "No utilization limits."}
//           </div>
//           <div>
//             {merchantCategoryMode === "OFF"
//               ? "No merchant category limits."
//               : `Merchant category rule: ${merchantCategoryMode.toLowerCase()}.`}
//           </div>
//           <div>
//             {mccMode === "OFF"
//               ? "No MCC-specific limits."
//               : `MCC rule: ${mccMode.toLowerCase()}.`}
//           </div>
//           <div>
//             {merchantMode === "OFF"
//               ? "No specific merchant rules."
//               : `Merchant rule: ${merchantMode.toLowerCase()}.`}
//           </div>
//           <div>
//             {countryMode === "OFF"
//               ? "No country restrictions."
//               : `Country rule: ${countryMode.toLowerCase()}.`}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };
