import React from "react";

interface SelectAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: { id: string | number; name: string }[];
  selectedId: string | number | null;
  onChange: (id: string | number) => void;
  onSave: () => void;
}

export default function SelectAccountModal({
  isOpen,
  onClose,
  accounts,
  selectedId,
  onChange,
  onSave,
}: SelectAccountModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[400px] rounded-2xl bg-custom p-6 shadow-xl dark:bg-gray-900">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            Select Account
          </h2>

          <button onClick={onClose}>
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              className="text-red-500 hover:text-red-600 transition"
            >
              <path
                fill="currentColor"
                d="M18.3 5.71L12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.29 19.71 2.88 18.3 9.17 12 2.88 5.71 4.29 4.29 10.59 10.6l6.29-6.31z"
              />
            </svg>
          </button>
        </div>

        <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
          Account:
        </label>

        <select
          value={selectedId ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-gray-300 px-3 py-3 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
        >
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.name}
            </option>
          ))}
        </select>

        <button
          onClick={onSave}
          className="mt-6 w-full rounded-xl bg-[#5A21FF] px-4 py-3 font-medium text-white hover:bg-[#4b1bd8] transition"
        >
          Save Selection
        </button>
      </div>
    </div>
  );
}
