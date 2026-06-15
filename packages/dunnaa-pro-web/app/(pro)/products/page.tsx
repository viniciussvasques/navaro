"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEstablishmentId, useEstablishmentLoading } from "@/contexts/EstablishmentContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  Loader2,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type Product = {
  id: string;
  establishment_id: string;
  name: string;
  description?: string | null;
  price: number;
  cost_price?: number | null;
  markup_percentage?: number | null;
  stock_quantity?: number;
  stock?: number;
  active: boolean;
  image_url?: string | null;
  created_at?: string;
  updated_at?: string;
};

type ProductForm = {
  name: string;
  description: string;
  price: string;
  cost_price: string;
  markup_percentage: string;
  stock_quantity: string;
  active: boolean;
};

const emptyForm: ProductForm = {
  name: "",
  description: "",
  price: "",
  cost_price: "",
  markup_percentage: "",
  stock_quantity: "0",
  active: true,
};

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const establishmentId = useEstablishmentId();
  const establishmentLoading = useEstablishmentLoading();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: products = [], isLoading, isError, error } = useQuery({
    queryKey: ["products", establishmentId],
    queryFn: async () => {
      const res = await api.get(`/establishments/${establishmentId}/products?active_only=false`);
      return (Array.isArray(res.data) ? res.data : []) as Product[];
    },
    enabled: !!establishmentId && !establishmentLoading,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: ProductForm) => {
      const body = {
        name: payload.name.trim(),
        description: payload.description.trim() || undefined,
        price: parseFloat(payload.price) || 0,
        cost_price: payload.cost_price ? parseFloat(payload.cost_price) : undefined,
        markup_percentage: payload.markup_percentage ? parseFloat(payload.markup_percentage) : undefined,
        stock_quantity: parseInt(payload.stock_quantity, 10) || 0,
        active: payload.active,
      };
      await api.post(`/establishments/${establishmentId}/products`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<ProductForm> }) => {
      const body: Record<string, unknown> = {};
      if (payload.name !== undefined) body.name = payload.name.trim();
      if (payload.description !== undefined) body.description = payload.description.trim() || null;
      if (payload.price !== undefined) body.price = parseFloat(payload.price) || 0;
      if (payload.cost_price !== undefined) body.cost_price = payload.cost_price ? parseFloat(payload.cost_price) : null;
      if (payload.markup_percentage !== undefined) body.markup_percentage = payload.markup_percentage ? parseFloat(payload.markup_percentage) : null;
      if (payload.stock_quantity !== undefined) body.stock_quantity = parseInt(payload.stock_quantity, 10) || 0;
      if (payload.active !== undefined) body.active = payload.active;
      await api.patch(`/establishments/${establishmentId}/products/${id}`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/establishments/${establishmentId}/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setDeleteConfirm(null);
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      description: p.description ?? "",
      price: String(p.price),
      cost_price: p.cost_price != null ? String(p.cost_price) : "",
      markup_percentage: p.markup_percentage != null ? String(p.markup_percentage) : "",
      stock_quantity: String(p.stock_quantity ?? p.stock ?? 0),
      active: p.active,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, payload: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const activeList = products.filter((p) => p.active);
  const inactiveList = products.filter((p) => !p.active);
  const searchLower = search.trim().toLowerCase();
  const filterBySearch = (list: Product[]) =>
    searchLower
      ? list.filter(
          (p) =>
            p.name.toLowerCase().includes(searchLower) ||
            (p.description ?? "").toLowerCase().includes(searchLower)
        )
      : list;
  const filteredActive = filterBySearch(activeList);
  const filteredInactive = filterBySearch(inactiveList);

  if (!establishmentId) {
    return (
      <div className="p-8">
        <p className="text-[var(--color-text-muted)]">Selecione um estabelecimento.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8">
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-6">
            <p className="text-[var(--color-text-primary)]">
              Não foi possível carregar os produtos. Tente novamente.
            </p>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              {(error as { message?: string })?.message}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Produtos</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Produtos à venda no seu estabelecimento (ex.: shampoo, creme).
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Novo produto
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
        <Input
          type="search"
          placeholder="Buscar por nome ou descrição..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 max-w-md"
        />
      </div>

      {/* Form modal */}
      {(showForm || editingId) && (
        <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{editingId ? "Editar produto" : "Novo produto"}</CardTitle>
            <Button variant="ghost" size="sm" onClick={resetForm}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">Nome</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ex.: Shampoo Anticaspa"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">Descrição (opcional)</label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Breve descrição"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">Preço (R$)</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    placeholder="0,00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">Custo (opcional)</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.cost_price}
                    onChange={(e) => setForm((f) => ({ ...f, cost_price: e.target.value }))}
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">Estoque</label>
                  <Input
                    type="number"
                    min="0"
                    value={form.stock_quantity}
                    onChange={(e) => setForm((f) => ({ ...f, stock_quantity: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              </div>
              {!editingId && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={form.active}
                    onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                    className="rounded border-[var(--color-border)]"
                  />
                  <label htmlFor="active" className="text-sm text-[var(--color-text-muted)]">Ativo</label>
                </div>
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                  {editingId ? "Salvar" : "Criar"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Active products */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Produtos ativos</h2>
        {filteredActive.length === 0 ? (
          <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
            <CardContent className="py-8 text-center text-[var(--color-text-muted)]">
              Nenhum produto ativo. Adicione um produto acima.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredActive.map((p) => (
              <Card key={p.id} className="border-[var(--color-border)] bg-[var(--color-surface)]">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-[var(--color-text-primary)] truncate">{p.name}</p>
                      {p.description && (
                        <p className="text-sm text-[var(--color-text-muted)] line-clamp-2 mt-0.5">{p.description}</p>
                      )}
                      <p className="text-sm font-semibold text-[var(--color-primary)] mt-2">
                        {formatCurrency(p.price)}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        Estoque: {p.stock_quantity ?? p.stock ?? 0}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => startEdit(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirm(p.id)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Inactive products (collapsible) */}
      {inactiveList.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowInactive((v) => !v)}
            className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          >
            {showInactive ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Produtos inativos ({inactiveList.length})
          </button>
          {showInactive && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredInactive.map((p) => (
                <Card key={p.id} className="border-[var(--color-border)] bg-[var(--color-surface)] opacity-80">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-[var(--color-text-primary)] truncate">{p.name}</p>
                        <p className="text-sm font-semibold text-[var(--color-primary)] mt-2">
                          {formatCurrency(p.price)}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => startEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <Card className="w-full max-w-sm border-[var(--color-border)] bg-[var(--color-surface)]">
            <CardHeader>
              <CardTitle>Excluir produto?</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate(deleteConfirm)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Excluir"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
