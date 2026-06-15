"use client";

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useEstablishmentId } from "@/contexts/EstablishmentContext";
import { Crown, Loader2, QrCode, Wallet } from "lucide-react";

type MonetizationSummary = {
  subscription_tier: string;
  platform_subscription_expires_at?: string | null;
  platform_saas_monthly_price: number;
  is_platform_subscription_active: boolean;
  platform_auto_renew: boolean;
};

type PayIntent = {
  amount: number;
  provider_payment_id: string;
  qr_code?: string;
  qr_code_base64?: string;
};

export function PlatformSubscriptionCard() {
  const establishmentId = useEstablishmentId();
  const queryClient = useQueryClient();
  const [pixData, setPixData] = useState<PayIntent | null>(null);
  const [polling, setPolling] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["platform-subscription", establishmentId],
    enabled: !!establishmentId,
    queryFn: async () => {
      const res = await api.get(`/establishments/${establishmentId}/platform-subscription`);
      return res.data as MonetizationSummary;
    },
  });

  const payWallet = useMutation({
    mutationFn: async () => {
      await api.post(`/establishments/${establishmentId}/platform-subscription/pay`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-subscription"] });
    },
  });

  const payPix = useMutation({
    mutationFn: async () => {
      const res = await api.post(
        `/establishments/${establishmentId}/platform-subscription/pay-intent`,
        { provider: "mercadopago" }
      );
      return res.data as PayIntent;
    },
    onSuccess: (intent) => {
      setPixData(intent);
      setPolling(true);
    },
  });

  React.useEffect(() => {
    if (!polling || !pixData?.provider_payment_id) return;
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/payments/status/${pixData.provider_payment_id}`);
        if (res.data.status === "succeeded") {
          setPolling(false);
          setPixData(null);
          queryClient.invalidateQueries({ queryKey: ["platform-subscription"] });
        }
      } catch {
        /* ignore */
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [polling, pixData, queryClient]);

  if (!establishmentId || isLoading || !data) return null;

  const expires = data.platform_subscription_expires_at
    ? new Date(data.platform_subscription_expires_at).toLocaleDateString("pt-BR")
    : null;

  const formatBrl = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  return (
    <Card className="border-[var(--color-border)]">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Crown className="h-4 w-4 text-amber-500" />
          Plano DUNNAA Pro — {data.subscription_tier}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4 text-sm">
          <div>
            <p className="text-[var(--color-text-muted)]">Status</p>
            <p className={data.is_platform_subscription_active ? "text-emerald-600 font-medium" : "text-red-500 font-medium"}>
              {data.is_platform_subscription_active ? "Ativo" : "Expirado / pendente"}
            </p>
          </div>
          {expires && (
            <div>
              <p className="text-[var(--color-text-muted)]">Válido até</p>
              <p className="font-medium">{expires}</p>
            </div>
          )}
          <div>
            <p className="text-[var(--color-text-muted)]">Mensalidade</p>
            <p className="font-medium">{formatBrl(data.platform_saas_monthly_price)}</p>
          </div>
        </div>

        {!data.is_platform_subscription_active && !pixData && (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={payWallet.isPending}
              onClick={() => payWallet.mutate()}
            >
              {payWallet.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Wallet className="h-4 w-4 mr-1" />}
              Pagar com carteira
            </Button>
            <Button
              size="sm"
              className="bg-[var(--color-primary)] text-white"
              disabled={payPix.isPending}
              onClick={() => payPix.mutate()}
            >
              {payPix.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <QrCode className="h-4 w-4 mr-1" />}
              Pagar com PIX (Mercado Pago)
            </Button>
          </div>
        )}

        {pixData && (
          <div className="rounded-xl border border-[var(--color-border)] p-4 space-y-3 bg-[var(--color-background)]">
            <p className="text-sm font-medium">PIX Mercado Pago — {formatBrl(pixData.amount)}</p>
            {pixData.qr_code_base64 && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`data:image/png;base64,${pixData.qr_code_base64}`}
                alt="QR Code PIX"
                className="mx-auto w-48 h-48"
              />
            )}
            {pixData.qr_code && (
              <p className="text-xs break-all text-[var(--color-text-muted)] font-mono">{pixData.qr_code}</p>
            )}
            <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-2">
              {polling && <Loader2 className="h-3 w-3 animate-spin" />}
              Aguardando confirmação do pagamento...
            </p>
          </div>
        )}

        {payWallet.isError && (
          <p className="text-xs text-red-500">Saldo insuficiente na carteira ou erro ao pagar.</p>
        )}
      </CardContent>
    </Card>
  );
}
