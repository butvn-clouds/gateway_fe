import React, { createContext, useContext, useEffect, useState } from "react";
import { Account } from "../types/Types";
import {
  AccountGetAll,
  AccountCreate,
  AccountUpdate,
  AccountDelete,
  ApiCreateAccountParam,
  ApiUpdateAccountParam,
} from "../api/api.account";
import { toast } from "react-toastify";

export interface AccountContextTypes {
  accounts: Account[];
  loading: boolean;
  reload: () => Promise<void>;
  createAccount: (data: ApiCreateAccountParam) => Promise<Account | null>;
  updateAccount: (id: number, data: ApiUpdateAccountParam) => Promise<Account | null>;
  deleteAccount: (id: number) => Promise<boolean>;
}

export const AccountContext = createContext<AccountContextTypes | null>(null);

export const AccountProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const reload = async () => {
    try {
      setLoading(true);
      const data = await AccountGetAll(0, 10);
      setAccounts(data.content || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const createAccount = async (
    data: ApiCreateAccountParam
  ): Promise<Account | null> => {
    try {
      const acc = await AccountCreate(data);
      setAccounts((prev) => [...prev, acc]);
      toast.success("Account created");
      return acc;
    } catch (err) {
      console.error(err);
      toast.error("Create account failed");
      return null;
    }
  };

  const updateAccount = async (
    id: number,
    data: ApiUpdateAccountParam
  ): Promise<Account | null> => {
    try {
      const updated = await AccountUpdate(id, data);
      setAccounts((prev) =>
        prev.map((a) => (a.id === id ? updated : a))
      );
      toast.success("Account updated");
      return updated;
    } catch (err) {
      console.error(err);
      toast.error("Update account failed");
      return null;
    }
  };

  const deleteAccount = async (id: number): Promise<boolean> => {
    try {
      await AccountDelete(id);
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      toast.success("Account deleted");
      return true;
    } catch (err) {
      console.error(err);
      toast.error("Delete account failed");
      return false;
    }
  };

  return (
    <AccountContext.Provider
      value={{ accounts, loading, reload, createAccount, updateAccount, deleteAccount }}
    >
      {children}
    </AccountContext.Provider>
  );
};

export const useAccount = () => {
  const ctx = useContext(AccountContext);
  if (!ctx) {
    throw new Error("useAccount must be used within <AccountProvider>");
  }
  return ctx;
};
