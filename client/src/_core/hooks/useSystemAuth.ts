import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

type SystemUser = {
  id: number;
  nome: string;
  email: string;
  empresaId: number;
  onboardingConcluido?: boolean;
};

type SystemAuthState = {
  user: SystemUser | null;
  loading: boolean;
  isAuthenticated: boolean;
};

export function useSystemAuth() {
  const queryClient = useQueryClient();
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
        queryClient.clear();
        setState({ user, loading: false, isAuthenticated: true });
      } else {
        setState({ user: null, loading: false, isAuthenticated: false });
      }
    } catch {
      setState({ user: null, loading: false, isAuthenticated: false });
    }
  }, [queryClient]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const register = useCallback(async (nome: string, email: string, senha: string): Promise<{ success: boolean; error?: string; onboardingPendente?: boolean }> => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ nome, email, senha }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        queryClient.clear();
        setState({ user: { ...data.user, onboardingConcluido: false }, loading: false, isAuthenticated: true });
        return { success: true, onboardingPendente: true };
      }
      return { success: false, error: data.error || "Erro ao criar conta" };
    } catch {
      return { success: false, error: "Erro de conexão. Tente novamente." };
    }
  }, [queryClient]);

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
        queryClient.clear();
        setState({ user: data.user, loading: false, isAuthenticated: true });
        return { success: true };
      }
      return { success: false, error: data.error || "Erro ao fazer login" };
    } catch {
      return { success: false, error: "Erro de conexão. Tente novamente." };
    }
  }, [queryClient]);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {}
    queryClient.clear();
    setState({ user: null, loading: false, isAuthenticated: false });
  }, [queryClient]);

  return {
    ...state,
    login,
    logout,
    register,
    refresh: checkAuth,
  };
}
