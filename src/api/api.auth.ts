import { ApiLoginParam, ApiLoginResponse, ApiCreateUserParam, Auth, ApiUpdateUserParam, ApiUserPage } from "../types/Auth";
import api from "../config/api.config";

export const AuthLogin = async (data: ApiLoginParam): Promise<ApiLoginResponse> => {
  const res = await api.post("/api/auth/login", data);
  localStorage.setItem("token", res.data.token);
  return res.data;
};

export const AuthCheck = async (): Promise<{ user: ApiLoginResponse["user"] }> => {
  const res = await api.get("/api/auth/check");
  return res.data;
};

export const AuthLogout = async (): Promise<{ message: string }> => {
  localStorage.removeItem("token");
  return { message: "Logout successful" };
};

export const AuthCreateUser = async (
  data: ApiCreateUserParam
): Promise<ApiLoginResponse> => {
  const token = localStorage.getItem("token");
  const res = await api.post<ApiLoginResponse>("/api/auth/register", data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const AuthGetUsers = async (
  page = 0,
  size = 10
): Promise<ApiUserPage> => {
  const token = localStorage.getItem("token");
  const res = await api.get<ApiUserPage>("/api/auth/users", {
    params: { page, size },
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const AuthUpdateUser = async (
  id: number,
  data: ApiUpdateUserParam
): Promise<Auth> => {
  const token = localStorage.getItem("token");
  const res = await api.put<Auth>(`/api/auth/users/${id}`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const AuthDeleteUser = async (id: number): Promise<void> => {
  const token = localStorage.getItem("token");
  await api.delete(`/api/auth/users/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};
