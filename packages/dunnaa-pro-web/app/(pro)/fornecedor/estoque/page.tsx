"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ProPageShell } from "@/components/ProPageShell";
import { ProPageHeader } from "@/components/ProPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Boxes, AlertTriangle, Loader2, Save } from "lucide-react";
import { getApiErrorMessage } from "@/lib/errors";

type Supplier = { id: string };
type Product = {
  id: string;
  name: string;
  unit: string;
  stock_qty?: number;
};
type StockEdit = { quantity: string; min_threshold: string };

const UNIT_LABELS: Record<string, string> = {
  unit: "un", box: "cx", pack: "pct", liter: "L", kg: "kg", meter: "m",
};

export default function SupplierStockPage() {
  const queryClient = useQueryClient();
  const [edits, setEdits] = useState<Record<string, StockEdit>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: supplier } = useQuery<Supplier | null>({
    queryKey: ["my-supplier"],
    queryFn: async () => {
      try { return (await api.get("/suppliers/my")).data; } catch { return null; }
    },
  });

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["supplier-products", supplier?.id],
    enabled: !!supplier?.id,
    queryFn: async () => (await api.get(`/suppliers/${supplier!.id}/products?active_only=false`)).data,
  });

  const { data: lowStock = [] } = useQuery<Product[]>({
    queryKey: ["supplier-low-stock", supplier?.id],
    enabled: !!supplier?.id,
    queryFn: async () => (await api.get(`/suppliers/${supplier!.id}/stock/low`)).data,
  });

  async function saveStock(productId: string) {
    if (!supplier) return;
    const edit = edits[productId];
    if (!edit) return;
    setSaving((prev) => ({ ...prev, [productId]: true }));
    setErrors((prev) => ({ ...prev, [productId]: "" }));
    try {
      await api.patch(`/suppliers/${supplier.id}/products/${productId}/stock`, {
        quantity: parseInt(edit.quantity),
        min_threshold: parseInt(edit.min_threshold),
      });
      queryClient.invalidateQueries({ queryKey: ["supplier-products"] });
      queryClient.invalidateQueries({ queryKey: ["supplier-low-stock"] });
      setEdits((prev) => { const n = { ...prev }; delete n[productId]; return n; });
    } catch (err) {
      setErrors((prev) => ({ ...prev, [productId]: getApiErrorMessage(err) }));
    } finally {
      setSaving((prev) => ({ ...prev, [productId]: false }));
    }
  }

  function getEdit(p: Product): StockEdit {
    return edits[p.id] ?? {
      quantity: String(p.stock_qty ?? 0),
      min_threshold: "5",
    };
  }

  return (
    <ProPageShell>
      <ProPageHeader
        title="Controle de Estoque"
        icon={Boxes}
        description="Gerencie a quantidade disponível de cada produto"
      />

      {lowStock.length > 0 && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-300">
                {lowStock.length} produto(s) com estoque baixo
              </p>
              <p className="text-xs text-yellow-400/80 mt-0.5">
                {lowStock.map((p) => p.name).join(", ")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
        </div>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <Boxes className="h-10 w-10 text-[var(--color-text-muted)]" />
            <p className="text-[var(--color-text-muted)]">Nenhum produto no catálogo ainda.</p>
            <Button size="sm" onClick={() => window.location.href = "/fornecedor/catalogo"}>Adicionar Produtos</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Estoque por produto</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-[var(--color-border)]">
              {products.map((p) => {
                const edit = getEdit(p);
                const isLow = lowStock.some((l) => l.id === p.id);
                return (
                  <div key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{p.name}</p>
                        {isLow && (
                          <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/30 text-xs shrink-0">
                            Baixo
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)]">{UNIT_LABELS[p.unit] ?? p.unit}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="space-y-1">
                        <label className="text-xs text-[var(--color-text-muted)]">Qtd.</label>
                        <Input
                          type="number"
                          min="0"
                          value={edit.quantity}
                          onChange={(e) => setEdits((prev) => ({ ...prev, [p.id]: { ...getEdit(p), quantity: e.target.value } }))}
                          className="w-20 h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-[var(--color-text-muted)]">Alerta</label>
                        <Input
                          type="number"
                          min="0"
                          value={edit.min_threshold}
                          onChange={(e) => setEdits((prev) => ({ ...prev, [p.id]: { ...getEdit(p), min_threshold: e.target.value } }))}
                          className="w-20 h-8 text-sm"
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="mt-5 h-8 px-2"
                        onClick={() => saveStock(p.id)}
                        disabled={saving[p.id]}
                      >
                        {saving[p.id] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                    {errors[p.id] && <p className="w-full text-xs text-red-400">{errors[p.id]}</p>}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </ProPageShell>
  );
}
