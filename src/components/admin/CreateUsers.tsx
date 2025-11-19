import { useState, useEffect } from "react";
import { ToastContainer, toast } from "react-toastify";
import { IoAddOutline } from "react-icons/io5";
import { MdDeleteOutline } from "react-icons/md";
import "react-toastify/dist/ReactToastify.css";

import AddEditModal from "../common/AddEditModal";
import ConfirmModal from "../common/ConfirmModal";

import { useAuth } from "../../context/AuthContextProvider";
import {
  AuthCreateUser,
  AuthGetUsers,
  AuthDeleteUser,
  AuthUpdateUser,
} from "../../api/api.auth";
import {
  ApiCreateUserParam,
  ApiUpdateUserParam,
  Auth,
  ApiUserPage,
  Account,
  VirtualAccount,
} from "../../types/Types";

import { AccountGetAll } from "../../api/api.account";

export default function CreateUserAdmin() {
  const { user: currentUser } = useAuth();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [users, setUsers] = useState<Auth[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Auth | null>(null);
  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const isAdmin = currentUser?.role === "ROLE_ADMIN";

  const [accounts, setAccounts] = useState<Account[]>([]);

  const loadUsers = async (pageNumber = 0) => {
    try {
      setLoading(true);
      const res: ApiUserPage = await AuthGetUsers(pageNumber, size);
      setUsers(res.content || []);
      setPage(res.page);
      setTotalPages(res.totalPages || 1);
      setTotalElements(res.totalElements || 0);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load user list!");
    } finally {
      setLoading(false);
    }
  };

  const loadAccounts = async () => {
    try {
      const res = await AccountGetAll();
      setAccounts(res?.content || []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load accounts!");
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    loadUsers(0);
    loadAccounts();
  }, [isAdmin]);

  const allVirtualAccounts: { id: number; label: string }[] = accounts.flatMap(
    (acc) =>
      (acc.virtualAccounts || []).map((va: VirtualAccount) => ({
        id: va.id,
        label: `${acc.name} - ${va.name || va.slashId}`,
      }))
  );

  const toNumberArray = (value: any): number[] => {
    if (!value) return [];
    if (!Array.isArray(value)) return [Number(value)];
    return value
      .map((v) => Number(v))
      .filter((v) => !Number.isNaN(v));
  };

  const handleAdd = async (data: any) => {
    const accountIds = toNumberArray(data.accountIds);
    const virtualAccountIds = toNumberArray(data.virtualAccountIds);

    const payload: ApiCreateUserParam = {
      username: (data.username || "").trim(),
      password: data.password || "",
      name: data.name?.trim() || undefined,
      role: data.role as ApiCreateUserParam["role"],
      accountIds,
      virtualAccountIds,
    };

    if (!payload.username) {
      toast.error("Username must not be empty!");
      return;
    }
    if (!payload.password) {
      toast.error("Password must not be empty!");
      return;
    }
    if (!payload.role) {
      toast.error("Role must not be empty!");
      return;
    }
    if (payload.role !== "ROLE_ADMIN" && payload.role !== "ROLE_USER") {
      toast.error("Role must be either ADMIN or USER!");
      return;
    }

    try {
      await AuthCreateUser(payload);
      toast.success("User created successfully!");
      setAddModalOpen(false);
      setEditingUser(null);
      await loadUsers(0);
    } catch (e) {
      console.error(e);
      toast.error("Create user failed!");
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editingUser) return;

    const accountIds = toNumberArray(data.accountIds);
    const virtualAccountIds = toNumberArray(data.virtualAccountIds);

    const payload: ApiUpdateUserParam = {
      name: data.name?.trim() || undefined,
      role: data.role as ApiUpdateUserParam["role"],
      accountIds,
      virtualAccountIds,
    };

    if (!payload.role) {
      toast.error("Role must not be empty!");
      return;
    }
    if (payload.role !== "ROLE_ADMIN" && payload.role !== "ROLE_USER") {
      toast.error("Role must be either ADMIN or USER!");
      return;
    }

    try {
      await AuthUpdateUser(editingUser.id, payload);
      toast.success("User updated successfully!");
      setAddModalOpen(false);
      setEditingUser(null);
      await loadUsers(page);
    } catch (e) {
      console.error(e);
      toast.error("Update user failed!");
    }
  };

  const handleDelete = async () => {
    if (deleteId == null) return;

    try {
      await AuthDeleteUser(deleteId);
      toast.success("User deleted successfully!");
      setConfirmOpen(false);
      setDeleteId(null);

      const newTotal = totalElements - 1;
      const newTotalPages = Math.max(1, Math.ceil(newTotal / size));
      const targetPage = Math.min(page, newTotalPages - 1);

      setTotalElements(newTotal);
      setTotalPages(newTotalPages);

      await loadUsers(targetPage);
    } catch (e) {
      console.error(e);
      toast.error("Delete user failed!");
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-2xl shadow p-6">
        <ToastContainer style={{ zIndex: 1000000 }} />
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          User Management
        </h3>
        <p className="text-sm text-red-500">
          You do not have permission to access this feature (admin only).
        </p>
      </div>
    );
  }

  const isEditing = !!editingUser;

  const handlePrevPage = () => {
    if (page <= 0) return;
    const newPage = page - 1;
    loadUsers(newPage);
  };

  const handleNextPage = () => {
    if (page >= totalPages - 1) return;
    const newPage = page + 1;
    loadUsers(newPage);
  };

  const editingAccountIds =
    editingUser?.accounts?.map((acc) => acc.id) ?? [];

  const editingVirtualAccountIds =
    editingUser?.virtualAccounts?.map((va) => va.id) ?? [];

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <ToastContainer style={{ zIndex: 1000000 }} />

      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            User Management
          </h3>
        </div>

        <button
          onClick={() => {
            setEditingUser(null);
            setAddModalOpen(true);
          }}
          className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <IoAddOutline /> Add User
        </button>
      </div>

      <div className="mt-4 border rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="w-10 h-10 border-4 border-t-blue-500 border-gray-300 rounded-full animate-spin"></div>
          </div>
        ) : users.length === 0 ? (
          <div className="py-6 text-center text-gray-400 italic">
            No users found
          </div>
        ) : (
          <>
            <table className="min-w-full text-sm text-gray-700">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3 px-4 text-left font-semibold">
                    Username
                  </th>
                  <th className="py-3 px-4 text-left font-semibold">Role</th>
                  <th className="py-3 px-4 text-left font-semibold">Date</th>
                  <th className="py-3 px-4 text-center font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="border-t hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-4">{u.username}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          u.role === "ROLE_ADMIN"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {u.createdAt
                        ? new Date(u.createdAt).toLocaleString("vi-VN")
                        : "-"}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setEditingUser(u);
                            setAddModalOpen(true);
                          }}
                          className="inline-flex items-center justify-center px-2 py-1 text-xs rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100"
                        >
                          Edit
                        </button>

                        <button
                          disabled={currentUser?.id === u.id}
                          onClick={() => {
                            setDeleteId(u.id);
                            setConfirmOpen(true);
                          }}
                          className="inline-flex items-center justify-center text-red-500 hover:text-red-700 transition disabled:text-gray-300 disabled:cursor-not-allowed"
                          title={
                            currentUser?.id === u.id
                              ? "Unable to delete account login information"
                              : "Delete user"
                          }
                        >
                          <MdDeleteOutline size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex items-center justify-between px-4 py-3 border-t bg_white">
              <p className="text-xs text-gray-500">
                Page {page + 1} of {Math.max(totalPages, 1)} •{" "}
                {totalElements} users
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 0}
                  onClick={handlePrevPage}
                  className="px-3 py-1 text-sm rounded-md border disabled:text-gray-300 disabled:border-gray-200 hover:bg-gray-50"
                >
                  Prev
                </button>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={handleNextPage}
                  className="px-3 py-1 text-sm rounded-md border disabled:text-gray-300 disabled:border-gray-200 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <ConfirmModal
        show={confirmOpen}
        title="Confirm user deletion"
        message="Are you sure you want to delete this user?"
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />

      <AddEditModal
        show={addModalOpen}
        title={isEditing ? "Edit User" : "Add New User"}
        fields={
          isEditing
            ? [
                {
                  name: "name",
                  label: "Display Name",
                  type: "text",
                  placeholder: "",
                  defaultValue: editingUser?.name || "",
                },
                {
                  name: "role",
                  label: "Role",
                  type: "select",
                  placeholder: "Select role",
                  defaultValue: editingUser?.role,
                  options: [
                    { label: "USER", value: "ROLE_USER" },
                    { label: "ADMIN", value: "ROLE_ADMIN" },
                  ],
                },
                {
                  name: "accountIds",
                  label: "Slash Accounts",
                  type: "multiselect",
                  defaultValue: editingAccountIds,
                  options: accounts.map((acc) => ({
                    label: acc.name,
                    value: acc.id,
                  })),
                },
                {
                  name: "virtualAccountIds",
                  label: "Virtual Accounts",
                  type: "multiselect",
                  defaultValue: editingVirtualAccountIds,
                  options: allVirtualAccounts.map((va) => ({
                    label: va.label,
                    value: va.id,
                  })),
                },
              ]
            : [
                {
                  name: "username",
                  label: "Username",
                  type: "text",
                },
                {
                  name: "password",
                  label: "Password",
                  type: "password",
                },
                {
                  name: "role",
                  label: "Role",
                  type: "select",
                  placeholder: "Select role",
                  options: [
                    { label: "USER", value: "ROLE_USER" },
                    { label: "ADMIN", value: "ROLE_ADMIN" },
                  ],
                },
                {
                  name: "accountIds",
                  label: "Slash Accounts",
                  type: "multiselect",
                  defaultValue: [],
                  options: accounts.map((acc) => ({
                    label: acc.name,
                    value: acc.id,
                  })),
                },
                {
                  name: "virtualAccountIds",
                  label: "Virtual Accounts",
                  type: "multiselect",
                  defaultValue: [],
                  options: allVirtualAccounts.map((va) => ({
                    label: va.label,
                    value: va.id,
                  })),
                },
              ]
        }
        onSubmit={isEditing ? handleUpdate : handleAdd}
        onCancel={() => {
          setAddModalOpen(false);
          setEditingUser(null);
        }}
      />
    </div>
  );
}
