"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ProPageShell } from "@/components/ProPageShell";
import { ProPageHeader } from "@/components/ProPageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Store, Search, Loader2, CheckCircle, Star, Truck, ArrowRight } from "lucide-react";
import Link from "next/link";

type Supplier = {
  id: string;
  name: string;
  segment: string;
  description?: string;
  logo_url?: string;
  city?: string;
  state?: string;
  ships_nationwide: boolean;
  verified: boolean;
  rating?: number;
  total_reviews: number;
  total_orders: number;
};

type SupplierList = { items: Supplier[]; total: number };

const SEGMENTS = [
  { value: "", label: "Todos" },
  { value: "chemicals", label: "Insumos" },
  { value: "equipment", label: "Equipamentos" },
  { value: "disposables", label: "Descartáveis" },
  { value: "cosmetics", label: "Cosméticos" },
  { value: "furniture", label: "Mobiliário" },
  { value: "technology", label: "Tecnologia" },
  { value: "other", label: "Outros" },
];

const SEGMENT_LABELS: Record<string, string> = Object.fromEntries(
  SEGMENTS.filter((s) => s.value).map((s) => [s.value, s.label])
);

export default function FornecedoresPage() {
  const [segment, setSegment] = useState("");
  const [city, setCity] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery<SupplierList>({
    queryKey: ["suppliers", segment, city],
    queryFn: async () => {
      const params = new URLSearchParams({ page_size: "40" });
      if (segment) params.set("segment", segment);
      if (city) params.set("city", city);
      const res = await api.get(`/suppliers?${params}`);
      return res.data;
    },
  });

  const suppliers = (data?.items ?? []).filter((s) =>
    !search || s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ProPageShell maxWidth="full">
      <ProPageHeader
        title="Fornecedores"
        icon={Store}
        description={`${data?.total ?? 0} fornecedor(es) disponíveis`}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar fornecedor..."
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SEGMENTS.map((s) => (
            <button
              key={s.value}
              onClick={() => setSegment(s.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                segment === s.value
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Cidade..."
            className="w-36"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
        </div>
      ) : suppliers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <Store className="h-10 w-10 text-[var(--color-text-muted)]" />
            <p className="text-[var(--color-text-muted)]">Nenhum fornecedor encontrado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {suppliers.map((s) => (
            <Link href={`/fornecedores/${s.id}`} key={s.id}>
              <Card className="h-full hover:border-[var(--color-primary)]/30 transition-colors cursor-pointer">
                <CardContent className="p-4 flex flex-col gap-3 h-full">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-elevated)] overflow-hidden">
                      {s.logo_url ? (
                        <img src={s.logo_url} alt={s.name} className="h-full w-full object-cover" />
                      ) : (
                        <Store className="h-6 w-6 text-[var(--color-text-muted)]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-semibold text-[var(--color-text-primary)] truncate">{s.name}</p>
                        {s.verified && (
                          <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        <Badge variant="outline" className="text-xs">
                          {SEGMENT_LABELS[s.segment] ?? s.segment}
                        </Badge>
                        {s.ships_nationwide && (
                          <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                            <Truck className="h-3 w-3" /> Nacional
                          </span>
                        )}
                        {s.city && !s.ships_nationwide && (
                          <span className="text-xs text-[var(--color-text-muted)]">
                            {s.city}{s.state ? `, ${s.state}` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {s.description && (
                    <p className="text-xs text-[var(--color-text-muted)] line-clamp-2 flex-1">
                      {s.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-[var(--color-border)]/50">
                    <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
                      {s.rating && (
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          {Number(s.rating).toFixed(1)}
                          <span className="text-[var(--color-text-muted)]">({s.total_reviews})</span>
                        </span>
                      )}
                      {s.total_orders > 0 && (
                        <span>{s.total_orders} pedidos</span>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-[var(--color-text-muted)]" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </ProPageShell>
  );
}
