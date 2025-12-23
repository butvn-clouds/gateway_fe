import React, { createContext, useEffect, useContext, useState } from "react";
import { AuthLogin, AuthCheck, AuthLogout } from "../api/api.auth";
import { Auth, AuthContextTypes } from "../types/Types";

export const AuthContext = createContext<AuthContextTypes | null>(null);

type AuthCheckResponse = {
  user: Auth;
  token?: string;
  activeAccount?: any; 
};

const mergeActiveAccount = (res: AuthCheckResponse): Auth => {
  const u: any = res.user;

  if (res.activeAccount) {
    u.activeAccount = res.activeAccount;
  } else if (!u.activeAccount && (u as any).activeAccountId) {
  }

  return u as Auth;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<Auth | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ load session on mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    AuthCheck()
      .then((res: AuthCheckResponse) => {
        if (res?.token) localStorage.setItem("token", res.token);
        setUser(mergeActiveAccount(res));
      })
      .catch(() => {
        localStorage.removeItem("token");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string) => {
    const res: any = await AuthLogin({ username, password });

    if (res?.token) localStorage.setItem("token", res.token);

    if (res?.activeAccount) {
      const u: any = res.user;
      u.activeAccount = res.activeAccount;
      setUser(u);
      return;
    }

    const chk: AuthCheckResponse = await AuthCheck();
    if (chk?.token) localStorage.setItem("token", chk.token);
    setUser(mergeActiveAccount(chk));
  };

  const logout = async () => {
    try {
      await AuthLogout();
    } finally {
      localStorage.removeItem("token");
      setUser(null);
    }
  };

  const checkAuth = async (): Promise<void> => {
    const res: AuthCheckResponse = await AuthCheck();
    if (res?.token) localStorage.setItem("token", res.token);
    setUser(mergeActiveAccount(res));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, checkAuth, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context)
    throw new Error("❌ useAuth phải được sử dụng bên trong <AuthProvider>");
  return context;
};
