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
import { Package, Plus, Loader2, Pencil, X, Boxes } from "lucide-react";
import { getApiErrorMessage } from "@/lib/errors";

type Supplier = { id: string; name: string };
type Product = {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  unit: string;
  price: number;
  moq: number;
  active: boolean;
  stock_qty?: number;
};

const UNITS = ["unit", "box", "pack", "liter", "kg", "meter"];
const UNIT_LABELS: Record<string, string> = {
  unit: "Unidade", box: "Caixa", pack: "Pacote",
  liter: "Litro", kg: "Kg", meter: "Metro",
};

const empty = () => ({ name: "", description: "", sku: "", unit: "unit", price: "", moq: "1", active: true });

export default function SupplierCatalogPage() {
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty());

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

  const createMutation = useMutation({
    mutationFn: (data: object) => api.post(`/suppliers/${supplier!.id}/products`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["supplier-products"] }); resetForm(); },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) =>
      api.patch(`/suppliers/${supplier!.id}/products/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["supplier-products"] }); resetForm(); },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/suppliers/${supplier!.id}/products/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["supplier-products"] }),
  });

  function resetForm() { setForm(empty()); setEditId(null); setShowForm(false); setError(""); }

  function startEdit(p: Product) {
    setForm({ name: p.name, description: p.description ?? "", sku: p.sku ?? "", unit: p.unit, price: String(p.price), moq: String(p.moq), active: p.active });
    setEditId(p.id);
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const payload = { ...form, price: parseFloat(form.price as string), moq: parseInt(form.moq as string) };
    if (editId) {
      updateMutation.mutate({ id: editId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  if (!supplier) {
    return (
      <ProPageShell>
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <Boxes className="h-12 w-12 text-[var(--color-text-muted)]" />
          <p className="text-[var(--color-text-muted)]">Nenhum perfil de fornecedor encontrado.</p>
          <Button onClick={() => window.location.href = "/fornecedor"}>Criar Perfil</Button>
        </div>
      </ProPageShell>
    );
  }

  return (
    <ProPageShell>
      <ProPageHeader
        title="Catálogo de Produtos"
        icon={Package}
        description={`${products.length} produto(s) cadastrado(s)`}
        actions={
          <Button onClick={() => { resetForm(); setShowForm(true); }} size="sm">
            <Plus className="h-4 w-4 mr-1.5" /> Novo Produto
          </Button>
        }
      />

      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">{editId ? "Editar Produto" : "Novo Produto"}</CardTitle>
            <button onClick={resetForm} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
              <X className="h-4 w-4" />
            </button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--color-text-muted)]">Nome *</label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome do produto" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--color-text-muted)]">SKU</label>
                  <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="Código interno" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--color-text-muted)]">Descrição</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 resize-none"
                  placeholder="Descrição opcional"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--color-text-muted)]">Preço (R$) *</label>
                  <Input type="number" step="0.01" min="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0,00" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--color-text-muted)]">Unidade</label>
                  <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50">
                    {UNITS.map((u) => <option key={u} value={u}>{UNIT_LABELS[u]}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--color-text-muted)]">Qtd. Mínima</label>
                  <Input type="number" min="1" value={form.moq} onChange={(e) => setForm({ ...form, moq: e.target.value })} />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="active" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="h-4 w-4 rounded accent-[var(--color-primary)]" />
                <label htmlFor="active" className="text-sm text-[var(--color-text-secondary)]">Produto ativo no catálogo</label>
              </div>

              {error && <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}

              <div className="flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={resetForm}>Cancelar</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editId ? "Salvar" : "Adicionar"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" /></div>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <Package className="h-10 w-10 text-[var(--color-text-muted)]" />
            <p className="text-[var(--color-text-muted)]">Nenhum produto cadastrado. Adicione seu primeiro produto.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <Card key={p.id} className={!p.active ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="font-medium text-[var(--color-text-primary)] truncate">{p.name}</p>
                    {p.sku && <p className="text-xs text-[var(--color-text-muted)]">SKU: {p.sku}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => startEdit(p)} className="p-1.5 rounded-lg hover:bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)]">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => deleteMutation.mutate(p.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold text-[var(--color-primary)]">
                    R$ {Number(p.price).toFixed(2).replace(".", ",")}
                  </p>
                  <div className="flex gap-1.5">
                    <Badge variant="outline" className="text-xs">{UNIT_LABELS[p.unit] ?? p.unit}</Badge>
                    {p.stock_qty !== undefined && (
                      <Badge variant="outline" className={`text-xs ${p.stock_qty === 0 ? "text-red-400 border-red-400/30" : ""}`}>
                        {p.stock_qty} em estoque
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">Mín: {p.moq} {UNIT_LABELS[p.unit]}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </ProPageShell>
  );
}
