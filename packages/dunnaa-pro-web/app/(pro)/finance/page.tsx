"use client";

import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEstablishmentId, useEstablishmentLoading } from "@/contexts/EstablishmentContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { DollarSign, TrendingUp, Receipt, Loader2, Wallet, ArrowDownToLine, AlertCircle } from "lucide-react";

type PaymentStatus = "pending" | "processing" | "succeeded" | "failed" | "refunded"; // from model

type Payment = {
  id: string;
  amount: number;
  platform_fee: number;
  net_amount: number;
  status: PaymentStatus;
  created_at: string;
  purpose: string;
};

type Payout = {
  id: string;
  establishment_id: string;
  amount: number;
  status: string;
  created_at: string;
};

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

export default function FinancePage() {
  const queryClient = useQueryClient();
  const establishmentId = useEstablishmentId();
  const establishmentLoading = useEstablishmentLoading();
  const [payoutAmount, setPayoutAmount] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["finance", establishmentId],
    queryFn: async () => {
      if (!establishmentId) return [] as Payment[];
      const res = await api.get(`/payments/establishments/${establishmentId}`);
      return (Array.isArray(res.data) ? res.data : []) as Payment[];
    },
    enabled: !!establishmentId && !establishmentLoading,
  });

  const { data: balanceData } = useQuery({
    queryKey: ["payout-balance", establishmentId],
    queryFn: async () => {
      const res = await api.get<{ available_balance: number }>(
        `/payouts/establishments/${establishmentId}/balance`
      );
      return res.data;
    },
    enabled: !!establishmentId && !establishmentLoading,
  });

  const { data: payoutHistory = [] } = useQuery({
    queryKey: ["payout-history", establishmentId],
    queryFn: async () => {
      const res = await api.get(`/payouts/establishments/${establishmentId}/history`);
      return (Array.isArray(res.data) ? res.data : []) as Payout[];
    },
    enabled: !!establishmentId && !establishmentLoading,
  });

  const requestPayoutMutation = useMutation({
    mutationFn: async (amount: number) => {
      await api.post(`/payouts/establishments/${establishmentId}/requests`, { amount });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payout-balance"] });
      queryClient.invalidateQueries({ queryKey: ["payout-history"] });
      setPayoutAmount("");
    },
  });

  const payments = data ?? [];
  const availableBalance = balanceData?.available_balance ?? 0;

  const stats = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const successful = payments.filter((p) => p.status === "succeeded");

    const sumSince = (d: Date) =>
      successful
        .filter((p) => new Date(p.created_at) >= d)
        .reduce(
          (acc, p) => ({
            gross: acc.gross + p.amount,
            net: acc.net + p.net_amount,
            fee: acc.fee + p.platform_fee,
          }),
          { gross: 0, net: 0, fee: 0 }
        );

    return {
      today: sumSince(startOfDay),
      week: sumSince(startOfWeek),
      month: sumSince(startOfMonth),
      total: sumSince(new Date(0)),
    };
  }, [payments]);

  if (isError) {
    return (
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Financeiro</h1>
        </div>
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[var(--color-text-primary)] font-medium">
                Não foi possível carregar os dados financeiros. Tente novamente.
              </p>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">
                {(error as { message?: string })?.message}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Financeiro</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Acompanhe a receita do seu estabelecimento por período.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-8 w-40 rounded-lg bg-[var(--color-surface)] animate-pulse" />
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-[var(--color-surface)] animate-pulse" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryCard
              label="Receita hoje"
              value={stats.today.net}
              subtitle="Líquido após taxas"
              icon={DollarSign}
            />
            <SummaryCard
              label="Semana"
              value={stats.week.net}
              subtitle="Receita líquida da semana"
              icon={TrendingUp}
            />
            <SummaryCard
              label="Mês"
              value={stats.month.net}
              subtitle="Receita líquida do mês"
              icon={Receipt}
            />
          </div>

          <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm">Movimentações recentes</CardTitle>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Pagamentos concluídos dos últimos atendimentos.
                </p>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {payments.length === 0 ? (
                <div className="py-10 text-center text-sm text-[var(--color-text-muted)]">
                  Nenhuma movimentação financeira registrada ainda.
                </div>
              ) : (
                <table className="w-full text-sm min-w-[560px]">
                  <thead className="text-xs text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                    <tr>
                      <th className="py-2 pr-4 text-left font-normal">Data</th>
                      <th className="py-2 pr-4 text-left font-normal">Tipo</th>
                      <th className="py-2 pr-4 text-right font-normal">Bruto</th>
                      <th className="py-2 pr-4 text-right font-normal">Taxa app</th>
                      <th className="py-2 pr-4 text-right font-normal">Líquido</th>
                      <th className="py-2 text-right font-normal">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {payments
                      .slice()
                      .sort(
                        (a, b) =>
                          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                      )
                      .slice(0, 30)
                      .map((p) => (
                        <tr key={p.id} className="hover:bg-[var(--color-surface-elevated)]/60">
                          <td className="py-2 pr-4 align-middle">
                            <div className="flex flex-col">
                              <span>
                                {new Date(p.created_at).toLocaleDateString("pt-BR", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "2-digit",
                                })}
                              </span>
                              <span className="text-[10px] text-[var(--color-text-muted)]">
                                {new Date(p.created_at).toLocaleTimeString("pt-BR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          </td>
                          <td className="py-2 pr-4 align-middle text-[var(--color-text-muted)] capitalize">
                            {p.purpose?.toLowerCase() || "pagamento"}
                          </td>
                          <td className="py-2 pr-4 align-middle text-right">
                            {formatCurrency(p.amount)}
                          </td>
                          <td className="py-2 pr-4 align-middle text-right text-[var(--color-text-muted)]">
                            {formatCurrency(p.platform_fee)}
                          </td>
                          <td className="py-2 pr-4 align-middle text-right font-medium">
                            {formatCurrency(p.net_amount)}
                          </td>
                          <td className="py-2 align-middle text-right">
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                p.status === "succeeded"
                                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                                  : p.status === "pending" || p.status === "processing"
                                  ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                                  : "bg-red-500/10 text-red-300 border-red-500/30"
                              }`}
                            >
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* Saques */}
          <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="h-5 w-5" />
                Saques
              </CardTitle>
              <p className="text-xs text-[var(--color-text-muted)]">
                Saldo disponível para saque e histórico de solicitações.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <p className="text-xs text-[var(--color-text-muted)] mb-1">Saldo disponível</p>
                  <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                    {formatCurrency(availableBalance)}
                  </p>
                </div>
                <div className="flex gap-2 items-end">
                  <div>
                    <label className="block text-xs text-[var(--color-text-muted)] mb-1">Valor (R$)</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                      className="w-32"
                    />
                  </div>
                  <Button
                    onClick={() => {
                      const val = parseFloat(payoutAmount.replace(",", "."));
                      if (!Number.isNaN(val) && val > 0) requestPayoutMutation.mutate(val);
                    }}
                    disabled={
                      !payoutAmount ||
                      parseFloat(payoutAmount.replace(",", ".")) <= 0 ||
                      requestPayoutMutation.isPending
                    }
                  >
                    {requestPayoutMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <ArrowDownToLine className="h-4 w-4 mr-2" />
                        Solicitar saque
                      </>
                    )}
                  </Button>
                </div>
              </div>
              {payoutHistory.length > 0 && (
                <div>
                  <p className="text-xs text-[var(--color-text-muted)] mb-2">Histórico de saques</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {payoutHistory.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between py-2 border-b border-[var(--color-border)] last:border-0 text-sm"
                      >
                        <span>
                          {new Date(p.created_at).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        <span className="font-medium">{formatCurrency(p.amount)}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            p.status === "succeeded"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : p.status === "pending" || p.status === "processing"
                              ? "bg-amber-500/10 text-amber-600"
                              : "bg-red-500/10 text-red-600"
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  subtitle,
  icon: Icon,
}: {
  label: string;
  value: number;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
            {label}
          </p>
          <p className="mt-2 text-xl font-bold text-[var(--color-text-primary)]">
            {formatCurrency(value)}
          </p>
        </div>
        <div className="p-2 rounded-xl bg-[var(--color-primary)]/15 text-[var(--color-primary)]">
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-[var(--color-text-muted)]">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
