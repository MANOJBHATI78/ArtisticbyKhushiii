"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { AdminUser } from "./admin-utils";

// ============================================================
// Auth hook for the Studio Console.
// login POSTs /api/admin/login then refreshes the "me" query;
// logout POSTs /api/admin/logout then clears it.
// ============================================================

export function useAdminAuth() {
  const qc = useQueryClient();

  const login = useMutation({
    mutationFn: (creds: { email: string; password: string }) =>
      api.post<{ user: AdminUser }>("/api/admin/login", creds),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "me"] });
    },
  });

  const logout = useMutation({
    mutationFn: () => api.post<{ success: boolean }>("/api/admin/logout"),
    onSuccess: () => {
      qc.setQueryData(["admin", "me"], null);
      void qc.invalidateQueries({ queryKey: ["admin"], exact: false });
    },
  });

  return {
    login: async (email: string, password: string) => {
      const res = await login.mutateAsync({ email, password });
      return res.user;
    },
    loginPending: login.isPending,
    logout: async () => {
      await logout.mutateAsync();
    },
    logoutPending: logout.isPending,
  };
}
