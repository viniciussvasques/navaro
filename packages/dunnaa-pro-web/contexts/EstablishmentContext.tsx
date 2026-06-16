"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { setCookie } from "cookies-next";
import { api } from "@/lib/api";
import { getThemeFromCategory, type EstablishmentCategory } from "@/lib/theme";
import { ProLoadingScreen } from "@/components/ProLoadingScreen";
import { isUnauthorized } from "@/lib/errors";

/** Rotas que NÃO exigem um estabelecimento (área do fornecedor B2B). */
const SUPPLIER_ONLY_PREFIXES = ["/fornecedor"];

function isSupplierOnlyRoute(path: string | null): boolean {
  if (!path) return false;
  // /fornecedor* (painel do vendedor) não exige establishment.
  // /fornecedores* (descoberta) e /pedidos-fornecedor* são do comprador (exigem establishment).
  return path === "/fornecedor" || path.startsWith("/fornecedor/");
}

type Establishment = { id: string; name?: string; category?: string };

type ContextValue = {
  establishmentId: string | null;
  establishment: Establishment | null;
  isLoading: boolean;
};

const EstablishmentContext = createContext<ContextValue>({
  establishmentId: null,
  establishment: null,
  isLoading: true,
});

export function EstablishmentProvider({
  children,
  setCategory,
}: {
  children: React.ReactNode;
  setCategory?: (cat: EstablishmentCategory | null) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const loadedRef = useRef(false);
  const setCategoryRef = useRef(setCategory);
  setCategoryRef.current = setCategory;
  const supplierOnly = isSupplierOnlyRoute(pathname);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    api
      .get("/establishments/my")
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        const est = list[0];
        if (!est) {
          // Usuário sem estabelecimento: se estiver no painel do fornecedor,
          // permite seguir sem establishment; senão direciona para escolha.
          if (!isSupplierOnlyRoute(window.location.pathname)) {
            router.replace("/escolha");
          }
          return;
        }
        const id = est.id ? String(est.id) : null;
        if (id) {
          setCookie("pro_establishment_id", id, { path: "/", maxAge: 60 * 60 * 24 * 365 });
        }
        const cat = (est.category ?? "default") as EstablishmentCategory;
        setCookie("pro_establishment_category", cat, { path: "/", maxAge: 60 * 60 * 24 * 365 });
        setCategoryRef.current?.(cat);
        document.documentElement.setAttribute("data-theme", getThemeFromCategory(cat));
        setEstablishment(est);
      })
      .catch((err) => {
        if (isUnauthorized(err)) {
          router.replace("/login");
        }
      })
      .finally(() => setIsLoading(false));
  }, [router]);

  const value: ContextValue = {
    establishmentId: establishment?.id ?? null,
    establishment,
    isLoading,
  };

  if (isLoading) {
    return <ProLoadingScreen message="Preparando seu painel..." />;
  }

  return (
    <EstablishmentContext.Provider value={value}>{children}</EstablishmentContext.Provider>
  );
}

export function useEstablishmentId(): string | null {
  return useContext(EstablishmentContext).establishmentId;
}

export function useEstablishment(): Establishment | null {
  return useContext(EstablishmentContext).establishment;
}

export function useEstablishmentLoading(): boolean {
  return useContext(EstablishmentContext).isLoading;
}
