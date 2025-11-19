import api from "../config/api.config";
import { Account, AccountPage } from "../types/Types";

export interface ApiCreateAccountParam {
  name: string;
  apiKey: string;
}

export interface ApiUpdateAccountParam {
  name?: string;
  apiKey?: string;
}

// Lấy toàn bộ accounts (kèm virtualAccounts)
// export async function AccountGetAll(pageParam: number, sizeParam: number): Promise<Account[]> {
//   const res = await api.get<{
//     content: Account[];
//     page: number;
//     size: number;
//     totalElements: number;
//     totalPages: number;
//   }>("/api/accounts", {
//     params: { page: 0, size: 10 }, 
//   });

//   return res.data.content;
// }

export const AccountGetAll = async (
  page = 0,
  size = 10
): Promise<AccountPage> => {
//   const token = localStorage.getItem("token");
  const res = await api.get<AccountPage>("/api/accounts", {
    params: { page, size },
    // headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export async function AccountGetOne(id: number): Promise<Account> {
  const res = await api.get<Account>(`/api/accounts/${id}`);
  return res.data;
}

// Tạo account mới
export async function AccountCreate(
  payload: ApiCreateAccountParam
): Promise<Account> {
  const res = await api.post<Account>("/api/accounts", payload);
  return res.data;
}

// Update account
export async function AccountUpdate(
  id: number,
  payload: ApiUpdateAccountParam
): Promise<Account> {
  const res = await api.put<Account>(`/api/accounts/${id}`, payload);
  return res.data;
}

// Xóa account
export async function AccountDelete(id: number): Promise<void> {
  await api.delete(`/api/accounts/${id}`);
}
