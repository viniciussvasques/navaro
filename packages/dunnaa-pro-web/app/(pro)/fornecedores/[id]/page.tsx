"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ProPageShell } from "@/components/ProPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Store, Star, CheckCircle, Truck, Package, ShoppingCart,
  Loader2, Plus, Minus, ArrowLeft, Globe, Phone, Mail,
} from "lucide-react";
import { getApiErrorMessage } from "@/lib/errors";

type Supplier = {
  id: string; name: string; description?: string; logo_url?: string;
  segment: string; phone?: string; email?: string; website?: string;
  city?: string; state?: string; ships_nationwide: boolean;
  verified: boolean; rating?: number; total_reviews: number;
};
type Product = {
  id: string; name: string; description?: string; unit: string;
  price: number; moq: number; stock_qty?: number;
};
type CartItem = { product: Product; quantity: number };

const SEGMENT_LABELS: Record<string, string> = {
  chemicals: "Insumos Químicos", equipment: "Equipamentos", disposables: "Descartáveis",
  cosmetics: "Cosméticos", furniture: "Mobiliário", technology: "Tecnologia", other: "Outros",
};
const UNIT_LABELS: Record<string, string> = {
  unit: "un", box: "cx", pack: "pct", liter: "L", kg: "kg", meter: "m",
};

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`h-3.5 w-3.5 ${i <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-[var(--color-text-muted)]"}`} />
      ))}
    </div>
  );
}

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [notes, setNotes] = useState("");
  const [orderError, setOrderError] = useState("");
  const [orderSuccess, setOrderSuccess] = useState(false);

  const { data: supplier, isLoading: loadingSupplier } = useQuery<Supplier>({
    queryKey: ["supplier", id],
    queryFn: async () => (await api.get(`/suppliers/${id}`)).data,
  });

  const { data: products = [], isLoading: loadingProducts } = useQuery<Product[]>({
    queryKey: ["supplier-products-public", id],
    queryFn: async () => (await api.get(`/suppliers/${id}/products`)).data,
  });

  const orderMutation = useMutation({
    mutationFn: (data: object) => api.post("/supplier-orders", data),
    onSuccess: () => {
      setCart({}); setNotes(""); setOrderSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
    },
    onError: (err) => setOrderError(getApiErrorMessage(err)),
  });

  function addToCart(product: Product) {
    setCart((prev) => ({
      ...prev,
      [product.id]: { product, quantity: (prev[product.id]?.quantity ?? 0) + product.moq },
    }));
  }

  function changeQty(productId: string, delta: number) {
    setCart((prev) => {
      const item = prev[productId];
      if (!item) return prev;
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        const n = { ...prev }; delete n[productId]; return n;
      }
      return { ...prev, [productId]: { ...item, quantity: newQty } };
    });
  }

  const cartItems = Object.values(cart);
  const cartTotal = cartItems.reduce((sum, i) => sum + Number(i.product.price) * i.quantity, 0);

  function placeOrder() {
    if (!supplier || cartItems.length === 0) return;
    setOrderError("");
    orderMutation.mutate({
      supplier_id: supplier.id,
      items: cartItems.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
      notes: notes || undefined,
    });
  }

  if (loadingSupplier) {
    return (
      <ProPageShell>
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" /></div>
      </ProPageShell>
    );
  }

  if (!supplier) {
    return (
      <ProPageShell>
        <p className="text-[var(--color-text-muted)] text-center py-12">Fornecedor não encontrado.</p>
      </ProPageShell>
    );
  }

  return (
    <ProPageShell maxWidth="full">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-1.5" /> Voltar
      </Button>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main content */}
        <div className="space-y-6">
          {/* Supplier header */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-surface-elevated)]">
                  {supplier.logo_url ? (
                    <img src={supplier.logo_url} alt={supplier.name} className="h-full w-full object-cover rounded-2xl" />
                  ) : (
                    <Store className="h-8 w-8 text-[var(--color-text-muted)]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl font-bold text-[var(--color-text-primary)]">{supplier.name}</h1>
                    {supplier.verified && <CheckCircle className="h-5 w-5 text-green-400" />}
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <Badge variant="outline">{SEGMENT_LABELS[supplier.segment] ?? supplier.segment}</Badge>
                    {supplier.ships_nationwide && (
                      <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                        <Truck className="h-3.5 w-3.5" /> Entrega nacional
                      </span>
                    )}
                    {supplier.city && (
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {supplier.city}{supplier.state ? `, ${supplier.state}` : ""}
                      </span>
                    )}
                    {supplier.rating && (
                      <span className="flex items-center gap-1.5">
                        <Stars rating={supplier.rating} />
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {Number(supplier.rating).toFixed(1)} ({supplier.total_reviews})
                        </span>
                      </span>
                    )}
                  </div>
                  {supplier.description && (
                    <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{supplier.description}</p>
                  )}
                  <div className="flex flex-wrap gap-4 mt-3">
                    {supplier.phone && (
                      <a href={`tel:${supplier.phone}`} className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
                        <Phone className="h-3.5 w-3.5" /> {supplier.phone}
                      </a>
                    )}
                    {supplier.email && (
                      <a href={`mailto:${supplier.email}`} className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
                        <Mail className="h-3.5 w-3.5" /> {supplier.email}
                      </a>
                    )}
                    {supplier.website && (
                      <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
                        <Globe className="h-3.5 w-3.5" /> Site
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Products */}
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-3 flex items-center gap-2">
              <Package className="h-4 w-4 text-[var(--color-primary)]" /> Catálogo de Produtos
            </h2>
            {loadingProducts ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" /></div>
            ) : products.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-sm text-[var(--color-text-muted)]">Nenhum produto disponível.</CardContent></Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {products.map((p) => {
                  const cartItem = cart[p.id];
                  return (
                    <Card key={p.id}>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-[var(--color-text-primary)] truncate">{p.name}</p>
                            {p.description && <p className="text-xs text-[var(--color-text-muted)] line-clamp-1">{p.description}</p>}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-lg font-bold text-[var(--color-primary)]">
                              R$ {Number(p.price).toFixed(2).replace(".", ",")}
                            </p>
                            <p className="text-xs text-[var(--color-text-muted)]">
                              Mín: {p.moq} {UNIT_LABELS[p.unit] ?? p.unit}
                              {p.stock_qty !== undefined && ` · Estoque: ${p.stock_qty}`}
                            </p>
                          </div>
                          {cartItem ? (
                            <div className="flex items-center gap-2">
                              <button onClick={() => changeQty(p.id, -p.moq)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-surface-elevated)] hover:bg-[var(--color-primary)]/10 text-[var(--color-text-primary)]">
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="text-sm font-medium text-[var(--color-text-primary)] w-8 text-center">{cartItem.quantity}</span>
                              <button onClick={() => changeQty(p.id, p.moq)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-surface-elevated)] hover:bg-[var(--color-primary)]/10 text-[var(--color-text-primary)]">
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => addToCart(p)}>
                              <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Cart sidebar */}
        <div className="space-y-4">
          <Card className="sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-[var(--color-primary)]" /> Seu Pedido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {orderSuccess ? (
                <div className="flex flex-col items-center gap-3 py-4 text-center">
                  <CheckCircle className="h-10 w-10 text-green-400" />
                  <p className="font-medium text-[var(--color-text-primary)]">Pedido enviado!</p>
                  <p className="text-sm text-[var(--color-text-muted)]">O fornecedor receberá seu pedido em breve.</p>
                  <Button size="sm" onClick={() => router.push("/pedidos-fornecedor")}>Ver Pedidos</Button>
                </div>
              ) : cartItems.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)] text-center py-4">
                  Adicione produtos ao carrinho
                </p>
              ) : (
                <>
                  <div className="divide-y divide-[var(--color-border)]/50">
                    {cartItems.map((item) => (
                      <div key={item.product.id} className="py-2 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[var(--color-text-primary)] truncate">{item.product.name}</p>
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {item.quantity} × R$ {Number(item.product.price).toFixed(2).replace(".", ",")}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-[var(--color-text-primary)] shrink-0">
                          R$ {(Number(item.product.price) * item.quantity).toFixed(2).replace(".", ",")}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]">
                    <p className="text-sm font-semibold text-[var(--color-text-muted)]">Total</p>
                    <p className="text-lg font-bold text-[var(--color-primary)]">
                      R$ {cartTotal.toFixed(2).replace(".", ",")}
                    </p>
                  </div>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Observações (opcional)"
                    className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 resize-none"
                  />
                  {orderError && <p className="text-xs text-red-400">{orderError}</p>}
                  <Button
                    className="w-full"
                    onClick={placeOrder}
                    disabled={orderMutation.isPending}
                  >
                    {orderMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Fazer Pedido
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProPageShell>
  );
}
