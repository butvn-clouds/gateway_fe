import React, { createContext, useState, useEffect, useContext } from "react";
import { AuthLogin, AuthCheck, AuthLogout } from "../api/api.auth";
import { Auth, AuthContextTypes } from "../types/Auth";

export const AuthContext = createContext<AuthContextTypes | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Auth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    AuthCheck()
      .then((res) => setUser(res.user))
      .catch(() => {
        localStorage.removeItem("token");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string) => {
    const res = await AuthLogin({ username, password });
    setUser(res.user);
  };

  const logout = async () => {
    await AuthLogout();
    setUser(null);
  };

  const checkAuth = async () => {
    const res = await AuthCheck();
    setUser(res.user);
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