"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ProPageShell } from "@/components/ProPageShell";
import { ProPageHeader } from "@/components/ProPageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";

type Order = {
  id: string; supplier_name?: string; status: string; total: number;
  tracking_code?: string; created_at: string;
  items: Array<{ id: string; product_name?: string; quantity: number; subtotal: number }>;
};
type OrderList = { items: Order[]; total: number };

const STATUS_LABELS: Record<string, string> = {
  pending: "Aguardando", confirmed: "Confirmado", preparing: "Preparando",
  shipped: "Enviado", delivered: "Entregue", cancelled: "Cancelado",
};
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  confirmed: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  preparing: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  shipped: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  delivered: "bg-green-500/15 text-green-400 border-green-500/30",
  cancelled: "bg-red-500/15 text-red-400 border-red-500/30",
};

export default function MySupplierOrdersPage() {
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery<OrderList>({
    queryKey: ["my-supplier-orders"],
    queryFn: async () => (await api.get("/supplier-orders")).data,
  });

  const orders = data?.items ?? [];

  return (
    <ProPageShell>
      <ProPageHeader
        title="Meus Pedidos"
        icon={ShoppingBag}
        description={`${data?.total ?? 0} pedido(s) realizados`}
        actions={
          <Link href="/fornecedores">
            <Button size="sm" variant="outline">Buscar Fornecedores</Button>
          </Link>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
        </div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <ShoppingBag className="h-10 w-10 text-[var(--color-text-muted)]" />
            <p className="text-[var(--color-text-muted)]">Nenhum pedido realizado ainda.</p>
            <Link href="/fornecedores"><Button size="sm">Explorar Fornecedores</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const isOpen = expanded === order.id;
            return (
              <Card key={order.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-[var(--color-text-primary)]">
                          {order.supplier_name ?? "Fornecedor"}
                        </p>
                        <Badge className={`text-xs ${STATUS_COLORS[order.status] ?? ""}`}>
                          {STATUS_LABELS[order.status] ?? order.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {new Date(order.created_at).toLocaleDateString("pt-BR")} ·
                        R$ {Number(order.total).toFixed(2).replace(".", ",")}
                      </p>
                      {order.tracking_code && (
                        <p className="text-xs text-[var(--color-text-muted)]">
                          Rastreio: <span className="font-mono text-[var(--color-text-primary)]">{order.tracking_code}</span>
                        </p>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setExpanded(isOpen ? null : order.id)}>
                      {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>

                  {isOpen && (
                    <div className="border-t border-[var(--color-border)] pt-3">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-[var(--color-text-muted)]">
                            <th className="text-left pb-1.5">Produto</th>
                            <th className="text-right pb-1.5">Qtd.</th>
                            <th className="text-right pb-1.5">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)]/50">
                          {order.items.map((item) => (
                            <tr key={item.id}>
                              <td className="py-1.5 text-[var(--color-text-secondary)]">{item.product_name ?? "Produto"}</td>
                              <td className="py-1.5 text-right text-[var(--color-text-secondary)]">{item.quantity}</td>
                              <td className="py-1.5 text-right font-medium text-[var(--color-text-primary)]">
                                R$ {Number(item.subtotal).toFixed(2).replace(".", ",")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan={2} className="pt-2 text-right font-semibold text-[var(--color-text-muted)]">Total</td>
                            <td className="pt-2 text-right font-bold text-[var(--color-primary)]">
                              R$ {Number(order.total).toFixed(2).replace(".", ",")}
                            </td>
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
