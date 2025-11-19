import {
  ApiLoginParam,
  ApiLoginResponse,
  ApiCreateUserParam,
  Auth,
  ApiUpdateUserParam,
  ApiUserPage,
} from "../types/Types";
import api from "../config/api.config";

// alias cho type Account từ trong user
type AccountType = ApiLoginResponse["user"]["accounts"][number];

export const AuthLogin = async (
  data: ApiLoginParam
): Promise<ApiLoginResponse> => {
  const res = await api.post<ApiLoginResponse>("/api/auth/login", data);

  // lưu token
  localStorage.setItem("token", res.data.token);

  return res.data;
};

// check token + lấy user + activeAccount (nếu có)
export const AuthCheck = async (): Promise<{
  user: ApiLoginResponse["user"];
  token: string;
  activeAccount?: AccountType;
}> => {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("No token found");
  }

  const res = await api.get("/api/auth/check", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data;
};

// chọn account đang active cho user
export const AuthSetActiveAccount = async (
  accountId: number
): Promise<{
  message: string;
  activeAccount: AccountType;
  user: ApiLoginResponse["user"];
}> => {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("No token found");
  }

  const res = await api.post(
    "/api/auth/active-account",
    { accountId },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return res.data;
};

export const AuthLogout = async (): Promise<{ message: string }> => {
  const token = localStorage.getItem("token");

  try {
    if (token) {
      await api.post(
        "/api/auth/logout",
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    }
  } catch {
    // ignore error, vẫn cho logout local
  }

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

// BE đang trả { message, user }, nên type nên match
export const AuthUpdateUser = async (
  id: number,
  data: ApiUpdateUserParam
): Promise<{ message: string; user: Auth }> => {
  const token = localStorage.getItem("token");
  const res = await api.put<{ message: string; user: Auth }>(
    `/api/auth/users/${id}`,
    data,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return res.data;
};

export const AuthDeleteUser = async (id: number): Promise<void> => {
  const token = localStorage.getItem("token");
  await api.delete(`/api/auth/users/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};
