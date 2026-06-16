"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

export type UserRole = "customer" | "owner" | "staff" | "admin" | "support" | "supplier";

export type CurrentUser = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string;
  avatar_url: string | null;
  role: UserRole;
};

type ContextValue = {
  user: CurrentUser | null;
  role: UserRole | null;
  /** Tem perfil de fornecedor cadastrado (pode vender). */
  hasSupplierProfile: boolean;
  /** É admin da plataforma. */
  isAdmin: boolean;
  isLoading: boolean;
  refetch: () => void;
};

const UserContext = createContext<ContextValue>({
  user: null,
  role: null,
  hasSupplierProfile: false,
  isAdmin: false,
  isLoading: true,
  refetch: () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [hasSupplierProfile, setHasSupplierProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const tick = useRef(0);

  function load() {
    const current = ++tick.current;
    setIsLoading(true);

    Promise.allSettled([api.get("/users/me"), api.get("/suppliers/my")])
      .then(([meRes, supRes]) => {
        if (current !== tick.current) return;
        if (meRes.status === "fulfilled") {
          setUser(meRes.value.data as CurrentUser);
        }
        // 404 em /suppliers/my = não tem perfil de fornecedor (esperado)
        setHasSupplierProfile(supRes.status === "fulfilled" && !!supRes.value.data?.id);
      })
      .finally(() => {
        if (current === tick.current) setIsLoading(false);
      });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: ContextValue = {
    user,
    role: user?.role ?? null,
    hasSupplierProfile,
    isAdmin: user?.role === "admin",
    isLoading,
    refetch: load,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): ContextValue {
  return useContext(UserContext);
}

export function useUserRole(): UserRole | null {
  return useContext(UserContext).role;
}
