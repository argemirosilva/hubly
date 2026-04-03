import { useState, useEffect, useCallback } from "react";

type SystemUser = {
  id: number;
  nome: string;
  email: string;
  empresaId: number;
};

type SystemAuthState = {
  user: SystemUser | null;
  loading: boolean;
  isAuthenticated: boolean;
};

export function useSystemAuth() {
  const [state, setState] = useState<SystemAuthState>({
    user: null,
    loading: true,
    isAuthenticated: false,
  });

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const user = await res.json();
        setState({ user, loading: false, isAuthenticated: true });
      } else {
        setState({ user: null, loading: false, isAuthenticated: false });
      }
    } catch {
      setState({ user: null, loading: false, isAuthenticated: false });
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(async (email: string, senha: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, senha }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setState({ user: data.user, loading: false, isAuthenticated: true });
        return { success: true };
      }
      return { success: false, error: data.error || "Erro ao fazer login" };
    } catch {
      return { success: false, error: "Erro de conexão. Tente novamente." };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {}
    setState({ user: null, loading: false, isAuthenticated: false });
  }, []);

  return {
    ...state,
    login,
    logout,
    refresh: checkAuth,
  };
}
