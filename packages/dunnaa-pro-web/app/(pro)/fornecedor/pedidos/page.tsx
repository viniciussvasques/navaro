"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ProPageShell } from "@/components/ProPageShell";
import { ProPageHeader } from "@/components/ProPageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Loader2, ChevronDown, ChevronUp, Truck } from "lucide-react";
import { getApiErrorMessage } from "@/lib/errors";

type Order = {
  id: string;
  establishment_name?: string;
  status: string;
  total: number;
  notes?: string;
  tracking_code?: string;
  created_at: string;
  items: Array<{ id: string; product_name?: string; quantity: number; unit_price: number; subtotal: number }>;
};

type OrderList = { items: Order[]; total: number };

const STATUS_LABELS: Record<string, string> = {
  pending: "Aguardando",
  confirmed: "Confirmado",
  preparing: "Preparando",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  confirmed: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  preparing: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  shipped: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  delivered: "bg-green-500/15 text-green-400 border-green-500/30",
  cancelled: "bg-red-500/15 text-red-400 border-red-500/30",
};

const TRANSITIONS: Record<string, { next: string; label: string }> = {
  pending: { next: "confirmed", label: "Confirmar" },
  confirmed: { next: "preparing", label: "Iniciar Preparo" },
  preparing: { next: "shipped", label: "Marcar Enviado" },
  shipped: { next: "delivered", label: "Confirmar Entrega" },
};

export default function SupplierOrdersPage() {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [trackingInput, setTrackingInput] = useState<Record<string, string>>({});
  const [statusError, setStatusError] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery<OrderList>({
    queryKey: ["supplier-incoming-orders"],
    queryFn: async () => (await api.get("/supplier-orders/incoming")).data,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status, tracking_code }: { id: string; status: string; tracking_code?: string }) =>
      api.patch(`/supplier-orders/${id}/status`, { status, tracking_code }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["supplier-incoming-orders"] }),
    onError: (err, vars) => setStatusError((prev) => ({ ...prev, [vars.id]: getApiErrorMessage(err) })),
  });

  const orders = data?.items ?? [];

  return (
    <ProPageShell>
      <ProPageHeader
        title="Pedidos Recebidos"
        icon={ShoppingCart}
        description={`${data?.total ?? 0} pedido(s) no total`}
      />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
        </div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <ShoppingCart className="h-10 w-10 text-[var(--color-text-muted)]" />
            <p className="text-[var(--color-text-muted)]">Nenhum pedido recebido ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const isOpen = expanded === order.id;
            const transition = TRANSITIONS[order.status];
            return (
              <Card key={order.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-[var(--color-text-primary)] truncate">
                          {order.establishment_name ?? "Estabelecimento"}
                        </p>
                        <Badge className={`text-xs ${STATUS_COLORS[order.status] ?? ""}`}>
                          {STATUS_LABELS[order.status] ?? order.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {new Date(order.created_at).toLocaleDateString("pt-BR")} · R$ {Number(order.total).toFixed(2).replace(".", ",")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {transition && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setStatusError({});
                            statusMutation.mutate({
                              id: order.id,
                              status: transition.next,
                              tracking_code: trackingInput[order.id],
                            });
                          }}
                          disabled={statusMutation.isPending}
                        >
                          {transition.label}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpanded(isOpen ? null : order.id)}
                      >
                        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {order.status === "confirmed" && (
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-[var(--color-text-muted)] shrink-0" />
                      <input
                        type="text"
                        value={trackingInput[order.id] ?? ""}
                        onChange={(e) => setTrackingInput((prev) => ({ ...prev, [order.id]: e.target.value }))}
                        placeholder="Código de rastreio (opcional)"
                        className="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50"
                      />
                    </div>
                  )}

                  {statusError[order.id] && (
                    <p className="text-xs text-red-400">{statusError[order.id]}</p>
                  )}

                  {isOpen && (
                    <div className="border-t border-[var(--color-border)] pt-3 space-y-1.5">
                      {order.notes && (
                        <p className="text-xs text-[var(--color-text-muted)] italic mb-2">
                          &ldquo;{order.notes}&rdquo;
                        </p>
                      )}
                      {order.tracking_code && (
                        <p className="text-xs text-[var(--color-text-muted)]">
                          Rastreio: <span className="font-mono text-[var(--color-text-primary)]">{order.tracking_code}</span>
                        </p>
                      )}
                      <table className="w-full text-xs mt-2">
                        <thead>
                          <tr className="text-[var(--color-text-muted)]">
                            <th className="text-left pb-1.5">Produto</th>
                            <th className="text-right pb-1.5">Qtd.</th>
                            <th className="text-right pb-1.5">Unitário</th>
                            <th className="text-right pb-1.5">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)]/50">
                          {order.items.map((item) => (
                            <tr key={item.id}>
                              <td className="py-1.5 text-[var(--color-text-secondary)]">{item.product_name ?? "Produto"}</td>
                              <td className="py-1.5 text-right text-[var(--color-text-secondary)]">{item.quantity}</td>
                              <td className="py-1.5 text-right text-[var(--color-text-secondary)]">R$ {Number(item.unit_price).toFixed(2).replace(".", ",")}</td>
                              <td className="py-1.5 text-right font-medium text-[var(--color-text-primary)]">R$ {Number(item.subtotal).toFixed(2).replace(".", ",")}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan={3} className="pt-2 text-right font-semibold text-[var(--color-text-muted)]">Total</td>
                            <td className="pt-2 text-right font-bold text-[var(--color-primary)]">R$ {Number(order.total).toFixed(2).replace(".", ",")}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </ProPageShell>
  );
}
