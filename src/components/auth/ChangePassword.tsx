import React, { useMemo, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { AuthChangePassword } from "../../api/api.auth";

type FormState = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export default function ChangePasswordCard() {
  const [form, setForm] = useState<FormState>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [show, setShow] = useState({
    current: false,
    next: false,
    confirm: false,
  });

  const [submitting, setSubmitting] = useState(false);

  const error = useMemo(() => {
    const current = form.currentPassword.trim();
    const next = form.newPassword.trim();
    const confirm = form.confirmPassword.trim();

    if (!current) return "Please enter your current password.";
    if (!next) return "Please enter a new password.";
    if (next.length < 6)
      return "The new password must be at least 6 characters long.";
    if (!confirm) return "Please confirm your new password.";
    if (next !== confirm)
      return "The new password and confirmation do not match.";
    if (current === next)
      return "The new password must be different from the current password.";
    return null;
  }, [form]);

  const onChange =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
    };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (error) {
      toast.error(error);
      return;
    }

    setSubmitting(true);
    try {
      await AuthChangePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      });

      toast.success("Password updated successfully.");

      setForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setShow({ current: false, next: false, confirm: false });
    } catch (err: any) {
      console.error(err);
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update password.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow p-6 max-w-xl">
      <ToastContainer style={{ zIndex: 1000000 }} />

      <h3 className="text-lg font-semibold text-gray-800">
        Change Password
      </h3>
      <p className="text-sm text-gray-500 mt-1">
        Enter your current password and choose a new one.
      </p>

      <form onSubmit={submit} className="mt-5 space-y-4">
        {/* Current password */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Current Password
          </label>
          <div className="flex items-center gap-2">
            <input
              type={show.current ? "text" : "password"}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={form.currentPassword}
              onChange={onChange("currentPassword")}
              placeholder="Enter your current password"
              autoComplete="current-password"
            />
            <button
              type="button"
              className="px-3 py-2 text-xs rounded-md border hover:bg-gray-50"
              onClick={() =>
                setShow((prev) => ({ ...prev, current: !prev.current }))
              }
            >
              {show.current ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            New Password
          </label>
          <div className="flex items-center gap-2">
            <input
              type={show.next ? "text" : "password"}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={form.newPassword}
              onChange={onChange("newPassword")}
              placeholder="Enter a new password"
              autoComplete="new-password"
            />
            <button
              type="button"
              className="px-3 py-2 text-xs rounded-md border hover:bg-gray-50"
              onClick={() =>
                setShow((prev) => ({ ...prev, next: !prev.next }))
              }
            >
              {show.next ? "Hide" : "Show"}
            </button>
          </div>
          <p className="text-xs text-gray-400">
            Minimum 6 characters.
          </p>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Confirm New Password
          </label>
          <div className="flex items-center gap-2">
            <input
              type={show.confirm ? "text" : "password"}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={form.confirmPassword}
              onChange={onChange("confirmPassword")}
              placeholder="Re-enter the new password"
              autoComplete="new-password"
            />
            <button
              type="button"
              className="px-3 py-2 text-xs rounded-md border hover:bg-gray-50"
              onClick={() =>
                setShow((prev) => ({ ...prev, confirm: !prev.confirm }))
              }
            >
              {show.confirm ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {error && (
          <div className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => {
              setForm({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
              });
              setShow({ current: false, next: false, confirm: false });
            }}
            className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100"
            disabled={submitting}
          >
            Clear
          </button>

          <button
            type="submit"
            disabled={submitting || !!error}
            className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? "Saving..." : "Update Password"}
          </button>
        </div>
      </form>
    </div>
  );
}
