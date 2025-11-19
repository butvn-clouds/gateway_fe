import { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import { IoAddOutline } from "react-icons/io5";
import { MdDeleteOutline } from "react-icons/md";
import "react-toastify/dist/ReactToastify.css";

import {
  AccountGetAll,
  AccountCreate,
  AccountUpdate,
  AccountDelete,
  ApiCreateAccountParam,
  ApiUpdateAccountParam,
} from "../../api/api.account";
import { Account, VirtualAccount, AccountPage } from "../../types/Types";

import AddEditModal from "../common/AddEditModal";
import ConfirmModal from "../common/ConfirmModal";

type ActiveMap = Record<number, boolean>;

export default function AccountManagement() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(6);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const [addEditOpen, setAddEditOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [detailsAccount, setDetailsAccount] = useState<Account | null>(null);

  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);

  const [activeMap, setActiveMap] = useState<ActiveMap>({});

  // state cho nút Copy
  const [copied, setCopied] = useState(false);

  // ================== LOAD ACCOUNTS (PAGINATION) ==================
  const loadAccounts = async (pageParam = page, sizeParam = size) => {
    try {
      setLoading(true);
      const res: AccountPage = await AccountGetAll(pageParam, sizeParam);

      setAccounts(res.content || []);
      setPage(res.page);
      setSize(res.size);
      setTotalPages(res.totalPages);
      setTotalElements(res.totalElements);

      setActiveMap((prev) => {
        const next: ActiveMap = { ...prev };
        (res.content || []).forEach((acc) => {
          if (next[acc.id] === undefined) next[acc.id] = true;
        });
        return next;
      });
    } catch (e: any) {
      console.error("Load accounts error:", e);
      console.error("Response:", e?.response?.status, e?.response?.data);
      toast.error("Failed to load accounts!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts(page, size);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, size]);

  // ================== CREATE ==================
  const handleCreate = async (data: any) => {
    const payload: ApiCreateAccountParam = {
      name: (data.name || "").trim(),
      apiKey: (data.apiKey || "").trim(),
    };

    if (!payload.name) {
      toast.error("Account name must not be empty!");
      return;
    }
    if (!payload.apiKey) {
      toast.error("API key must not be empty!");
      return;
    }

    try {
      await AccountCreate(payload);
      toast.success("Account created successfully!");
      setAddEditOpen(false);
      setEditingAccount(null);
      setPage(0);
      await loadAccounts(0, size);
    } catch (e: any) {
      console.error("Create account error:", e);
      toast.error("Create account failed!");
    }
  };

  // ================== UPDATE ==================
  const handleUpdate = async (data: any) => {
    if (!editingAccount) return;

    const payload: ApiUpdateAccountParam = {
      name: data.name?.trim() || undefined,
      apiKey: data.apiKey?.trim() || undefined,
    };

    if (!payload.name && !payload.apiKey) {
      toast.error("Nothing to update!");
      return;
    }

    try {
      await AccountUpdate(editingAccount.id, payload);
      toast.success("Account updated successfully!");
      setAddEditOpen(false);
      setEditingAccount(null);
      await loadAccounts(page, size);
    } catch (e: any) {
      console.error("Update account error:", e);
      toast.error("Update account failed!");
    }
  };

  // ================== DELETE ==================
  const handleDelete = async () => {
    if (deleteId == null) return;
    try {
      await AccountDelete(deleteId);
      toast.success("Account deleted successfully!");
      setConfirmOpen(false);
      setDeleteId(null);

      const newPage = page > 0 && accounts.length === 1 ? page - 1 : page;
      setPage(newPage);
      await loadAccounts(newPage, size);
    } catch (e: any) {
      console.error("Delete account error:", e);
      toast.error("Delete account failed!");
    }
  };

  // ================== ACTIVE TOGGLE (UI only) ==================
  const toggleActive = (id: number) => {
    setActiveMap((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const isEditing = !!editingAccount;

  const modalFields = isEditing
    ? [
        {
          name: "name",
          label: "Account Name",
          type: "text",
          placeholder: "Slash account name",
          defaultValue: editingAccount?.name || "",
        },
        {
          name: "apiKey",
          label: "API Key (optional - leave blank to keep current)",
          type: "text",
          placeholder: "",
          defaultValue: "",
        },
      ]
    : [
        {
          name: "name",
          label: "Account Name",
          type: "text",
          placeholder: "Slash account name",
        },
        {
          name: "apiKey",
          label: "API Key",
          type: "text",
          placeholder: "Paste your Slash API key",
        },
      ];

  // ================== HELPERS ==================
  const maskApiKey = (apiKey: string | undefined) => {
    if (!apiKey) return "-";
    if (apiKey.length <= 10) return "********";
    const prefix = apiKey.slice(0, 7); // ví dụ sk_live_
    const suffix = apiKey.slice(-4); // 4 số cuối
    return `${prefix}********${suffix}`;
  };

  const handleCopyApiKey = async (apiKey?: string) => {
    if (!apiKey) {
      toast.error("API key is empty!");
      return;
    }
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      toast.success("Copied API key!");
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.error(e);
      toast.error("Failed to copy API key!");
    }
  };

  const handleRegenerateKey = () => {
    // TODO: nối với API regenerate real
    toast.info("Regenerate API key is not implemented yet.");
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = Array.from({ length: totalPages }, (_, i) => i);

    return (
      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Showing <span className="font-medium">{page * size + 1}</span> –{" "}
          <span className="font-medium">
            {Math.min((page + 1) * size, totalElements)}
          </span>{" "}
          of <span className="font-medium">{totalElements}</span> accounts
        </p>

        <div className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-1 py-1">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(p - 1, 0))}
            className={`px-3 py-1 text-sm rounded-md ${
              page === 0
                ? "text-gray-300 cursor-not-allowed"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            Prev
          </button>

          {pages.map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`px-3 py-1 text-sm rounded-md ${
                p === page
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {p + 1}
            </button>
          ))}

          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))}
            className={`px-3 py-1 text-sm rounded-md ${
              page >= totalPages - 1
                ? "text-gray-300 cursor-not-allowed"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  // ================== RENDER ==================
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <ToastContainer style={{ zIndex: 1000000 }} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            Slash Accounts
          </h3>
        </div>

        <button
          onClick={() => {
            setEditingAccount(null);
            setAddEditOpen(true);
          }}
          className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <IoAddOutline />
          Add Account
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="w-10 h-10 border-4 border-t-blue-500 border-gray-300 rounded-full animate-spin" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="border rounded-2xl py-12 text-center text-gray-400 italic">
          No accounts found. Click &quot;Add Account&quot; to create one.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-2">
            {accounts.map((acc) => {
              const isActive = activeMap[acc.id] ?? true;
              const vaCount = acc.virtualAccounts?.length || 0;

              return (
                <article
                  key={acc.id}
                  className="rounded-2xl border border-gray-200 bg-white"
                >
                  {/* TOP */}
                  <div className="relative p-5 pb-9">
                    <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 font-semibold">
                      {acc.name?.charAt(0)?.toUpperCase() || "A"}
                    </div>

                    <h3 className="mb-1 text-lg font-semibold text-gray-800">
                      {acc.name}
                    </h3>

                    <p className="max-w-xs text-sm text-gray-500">
                      <span className="block mb-1 font-medium">API Key:</span>
                      <div className="flex items-center gap-3">
                        {/* Input + Copy button */}
                        <div className="relative">
                          <input
                            value={maskApiKey(acc.apiKey)}
                            type="text"
                            id="api"
                            readOnly
                            className="dark:bg-dark-900 shadow-theme-xs focus:border-brand-300 focus:ring-brand-500/10 dark:focus:border-brand-800 h-11 w-full min-w-[290px] sm:min-w-[320px] rounded-lg border border-gray-300 bg-transparent py-3 pr-[90px] pl-4 text-sm text-gray-800 placeholder:text-gray-400 focus:ring-3 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                          />
                          <button
                            type="button"
                            onClick={() => handleCopyApiKey(acc.apiKey)}
                            className="copy-btn absolute top-1/2 right-0 inline-flex h-11 -translate-y-1/2 cursor-pointer items-center gap-1 rounded-r-lg border border-gray-300 py-3 pr-3 pl-3.5 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                          >
                            <span className="copy-icon">
                              {!copied ? (
                                <svg
                                  className="fill-current"
                                  width="20"
                                  height="20"
                                  viewBox="0 0 20 20"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    fillRule="evenodd"
                                    clipRule="evenodd"
                                    d="M6.58822 4.58398C6.58822 4.30784 6.81207 4.08398 7.08822 4.08398H15.4154C15.6915 4.08398 15.9154 4.30784 15.9154 4.58398L15.9154 12.9128C15.9154 13.189 15.6916 13.4128 15.4154 13.4128H7.08821C6.81207 13.4128 6.58822 13.189 6.58822 12.9128V4.58398ZM7.08822 2.58398C5.98365 2.58398 5.08822 3.47942 5.08822 4.58398V5.09416H4.58496C3.48039 5.09416 2.58496 5.98959 2.58496 7.09416V15.4161C2.58496 16.5207 3.48039 17.4161 4.58496 17.4161H12.9069C14.0115 17.4161 14.9069 16.5207 14.9069 15.4161L14.9069 14.9128H15.4154C16.52 14.9128 17.4154 14.0174 17.4154 12.9128L17.4154 4.58398C17.4154 3.47941 16.52 2.58398 15.4154 2.58398H7.08822ZM13.4069 14.9128H7.08821C5.98364 14.9128 5.08822 14.0174 5.08822 12.9128V6.59416H4.58496C4.30882 6.59416 4.08496 6.81801 4.08496 7.09416V15.4161C4.08496 15.6922 4.30882 15.9161 4.58496 15.9161H12.9069C13.183 15.9161 13.4069 15.6922 13.4069 15.4161L13.4069 14.9128Z"
                                    fill=""
                                  ></path>
                                </svg>
                              ) : (
                                <svg
                                  className="fill-current"
                                  width="20"
                                  height="20"
                                  viewBox="0 0 20 20"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    fillRule="evenodd"
                                    clipRule="evenodd"
                                    d="M16.707 6.293a1 1 0 00-1.414 0L9 12.586l-2.293-2.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l7-7a1 1 0 000-1.414z"
                                    fill="currentColor"
                                  ></path>
                                </svg>
                              )}
                            </span>
                            <div className="copy-text">
                              {copied ? "Copied" : "Copy"}
                            </div>
                          </button>
                        </div>
                      </div>
                    </p>

                    {/* Nếu muốn show VA count thì mở ra */}
                    {/* <p className="mt-1 text-xs text-gray-400">
                      Virtual accounts:{" "}
                      <span className="font-semibold text-gray-600">
                        {vaCount}
                      </span>
                    </p> */}

                    {/* Dropdown menu */}
                    <div className="absolute top-5 right-5 h-fit">
                      <button
                        onClick={() =>
                          setOpenDropdownId((cur) =>
                            cur === acc.id ? null : acc.id
                          )
                        }
                        className={`text-gray-400 hover:text-gray-700 ${
                          openDropdownId === acc.id
                            ? "text-gray-700"
                            : "text-gray-400"
                        }`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="none"
                        >
                          <path
                            d="M5 10.0044L5 9.99609M15 10.0044V9.99609M10 10.0044V9.99609"
                            stroke="currentColor"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>

                      {openDropdownId === acc.id && (
                        <div
                          className="shadow-theme-lg absolute top-full right-0 z-40 mt-2 w-40 space-y-1 rounded-2xl border border-gray-200 bg-white p-2"
                          onMouseLeave={() => setOpenDropdownId(null)}
                        >
                          <button
                            onClick={() => {
                              setDetailsAccount(acc);
                              setOpenDropdownId(null);
                            }}
                            className="text-xs flex w-full rounded-lg px-3 py-2 text-left font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                          >
                            Details
                          </button>
                          <button
                            onClick={() => {
                              setEditingAccount(acc);
                              setAddEditOpen(true);
                              setOpenDropdownId(null);
                            }}
                            className="text-xs flex w-full rounded-lg px-3 py-2 text-left font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setDeleteId(acc.id);
                              setConfirmOpen(true);
                              setOpenDropdownId(null);
                            }}
                            className="text-xs flex w-full items-center gap-1 rounded-lg px-3 py-2 text-left font-medium text-red-500 hover:bg-red-50 hover:text-red-600"
                          >
                            <MdDeleteOutline size={14} /> Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* BOTTOM */}
                  <div className="flex items-center justify-between border-t border-gray-200 p-5">
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setEditingAccount(acc);
                          setAddEditOpen(true);
                        }}
                        className="text-xs flex w-full items-center gap-1 rounded-lg px-3 py-2 text-left font-medium text-green-500 hover:bg-green-50 hover:text-green-600"
                        title="Edit account"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => setDetailsAccount(acc)}
                        className="text-xs flex w-full items-center gap-1 rounded-lg px-3 py-2 text-left font-medium text-blue-500 hover:bg-blue-50 hover:text-blue-600"
                      >
                        Details
                      </button>

                      <button
                        onClick={() => {
                          setDeleteId(acc.id);
                          setConfirmOpen(true);
                          setOpenDropdownId(null);
                        }}
                        className="text-xs flex w-full items-center gap-1 rounded-lg px-3 py-2 text-left font-medium text-red-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <MdDeleteOutline size={14} /> Remove
                      </button>
                    </div>

                    <div>
                      {/* Toggle active (UI only) – nếu muốn dùng lại thì mở comment */}
                      {/* <label className="cursor-pointer">
                        <div className="relative">
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={isActive}
                            onChange={() => toggleActive(acc.id)}
                          />
                          <div
                            className={`block h-6 w-11 rounded-full ${
                              isActive ? "bg-blue-500" : "bg-gray-200"
                            }`}
                          />
                          <div
                            className={`shadow-theme-sm absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white duration-200 ease-linear ${
                              isActive ? "translate-x-full" : "translate-x-0"
                            }`}
                          />
                        </div>
                      </label> */}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {renderPagination()}
        </>
      )}

      {/* DELETE CONFIRM */}
      <ConfirmModal
        show={confirmOpen}
        title="Delete account"
        message="Are you sure you want to delete this account?"
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />

      {/* ADD / EDIT MODAL */}
      <AddEditModal
        show={addEditOpen}
        title={isEditing ? "Edit Account" : "Add New Account"}
        fields={modalFields as any}
        onSubmit={isEditing ? handleUpdate : handleCreate}
        onCancel={() => {
          setAddEditOpen(false);
          setEditingAccount(null);
        }}
      />

      {/* DETAILS MODAL */}
      {detailsAccount && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Account details
            </h3>

            <div className="space-y-3 text-sm text-gray-700">
              <p>
                <span className="font-medium">ID:</span> {detailsAccount.id}
              </p>
              <p>
                <span className="font-medium">Name:</span> {detailsAccount.name}
              </p>

              {/* API KEY FIELD */}
              <div>
                <span className="block mb-1 font-medium">API Key:</span>

                <div className="flex items-center gap-3">
                  {/* Input + Copy button */}
                  <div className="relative">
                    <input
                      value={maskApiKey(detailsAccount.apiKey)}
                      type="text"
                      id="api"
                      readOnly
                      className="dark:bg-dark-900 shadow-theme-xs focus:border-brand-300 focus:ring-brand-500/10 dark:focus:border-brand-800 h-11 w-full min-w-[260px] sm:min-w-[360px] rounded-lg border border-gray-300 bg-transparent py-3 pr-[90px] pl-4 text-sm text-gray-800 placeholder:text-gray-400 focus:ring-3 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopyApiKey(detailsAccount.apiKey)}
                      className="copy-btn absolute top-1/2 right-0 inline-flex h-11 -translate-y-1/2 cursor-pointer items-center gap-1 rounded-r-lg border border-gray-300 py-3 pr-3 pl-3.5 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                    >
                      <span className="copy-icon">
                        {!copied ? (
                          <svg
                            className="fill-current"
                            width="20"
                            height="20"
                            viewBox="0 0 20 20"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              fillRule="evenodd"
                              clipRule="evenodd"
                              d="M6.58822 4.58398C6.58822 4.30784 6.81207 4.08398 7.08822 4.08398H15.4154C15.6915 4.08398 15.9154 4.30784 15.9154 4.58398L15.9154 12.9128C15.9154 13.189 15.6916 13.4128 15.4154 13.4128H7.08821C6.81207 13.4128 6.58822 13.189 6.58822 12.9128V4.58398ZM7.08822 2.58398C5.98365 2.58398 5.08822 3.47942 5.08822 4.58398V5.09416H4.58496C3.48039 5.09416 2.58496 5.98959 2.58496 7.09416V15.4161C2.58496 16.5207 3.48039 17.4161 4.58496 17.4161H12.9069C14.0115 17.4161 14.9069 16.5207 14.9069 15.4161L14.9069 14.9128H15.4154C16.52 14.9128 17.4154 14.0174 17.4154 12.9128L17.4154 4.58398C17.4154 3.47941 16.52 2.58398 15.4154 2.58398H7.08822ZM13.4069 14.9128H7.08821C5.98364 14.9128 5.08822 14.0174 5.08822 12.9128V6.59416H4.58496C4.30882 6.59416 4.08496 6.81801 4.08496 7.09416V15.4161C4.08496 15.6922 4.30882 15.9161 4.58496 15.9161H12.9069C13.183 15.9161 13.4069 15.6922 13.4069 15.4161L13.4069 14.9128Z"
                              fill=""
                            ></path>
                          </svg>
                        ) : (
                          <svg
                            className="fill-current"
                            width="20"
                            height="20"
                            viewBox="0 0 20 20"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              fillRule="evenodd"
                              clipRule="evenodd"
                              d="M16.707 6.293a1 1 0 00-1.414 0L9 12.586l-2.293-2.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l7-7a1 1 0 000-1.414z"
                              fill="currentColor"
                            ></path>
                          </svg>
                        )}
                      </span>
                      <div className="copy-text">
                        {copied ? "Copied" : "Copy"}
                      </div>
                    </button>
                  </div>
                </div>
              </div>
              <p>
                <span className="font-medium">Virtual Accounts:</span>{" "}
                {detailsAccount.virtualAccounts?.length || 0}
              </p>

              {detailsAccount.virtualAccounts &&
                detailsAccount.virtualAccounts.length > 0 && (
                  <div className="mt-3">
                    <p className="font-medium mb-1">Virtual account list:</p>
                    <ul className="max-h-40 overflow-auto space-y-1 text-xs text-gray-600">
                      {detailsAccount.virtualAccounts.map(
                        (va: VirtualAccount) => (
                          <li
                            key={va.id}
                            className="flex items-center justify-between rounded-md bg-gray-50 px-2 py-1"
                          >
                            <span>
                              #{va.id} – {va.name || va.slashId}
                            </span>
                            <span className="font-mono text-[10px] text-gray-400">
                              {va.slashId}
                            </span>
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setDetailsAccount(null)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setEditingAccount(detailsAccount);
                  setAddEditOpen(true);
                  setDetailsAccount(null);
                }}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
