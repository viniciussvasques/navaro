"use client";

import React, { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useEstablishmentId } from "@/contexts/EstablishmentContext";
import { CheckCircle2, ExternalLink, Loader2, Unlink } from "lucide-react";
import { useSearchParams } from "next/navigation";

type MpStatus = {
  connected: boolean;
  mercadopago_user_id?: string | null;
  connected_at?: string | null;
  split_enabled: boolean;
};

export function MercadoPagoConnectCard() {
  const establishmentId = useEstablishmentId();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  useEffect(() => {
    const mp = searchParams.get("mp");
    if (mp === "connected" || mp === "error") {
      queryClient.invalidateQueries({ queryKey: ["mp-oauth-status"] });
    }
  }, [searchParams, queryClient]);

  const { data, isLoading } = useQuery({
    queryKey: ["mp-oauth-status", establishmentId],
    enabled: !!establishmentId,
    queryFn: async () => {
      const res = await api.get(
        `/mercadopago/establishments/${establishmentId}/status`
      );
      return res.data as MpStatus;
    },
  });

  const connect = useMutation({
    mutationFn: async () => {
      const res = await api.get(
        `/mercadopago/establishments/${establishmentId}/oauth/url`
      );
      return res.data as { authorize_url: string };
    },
    onSuccess: (payload) => {
      window.location.href = payload.authorize_url;
    },
  });

  const disconnect = useMutation({
    mutationFn: async () => {
      await api.delete(`/mercadopago/establishments/${establishmentId}/disconnect`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mp-oauth-status"] });
    },
  });

  if (!establishmentId) return null;

  const mpParam = searchParams.get("mp");
  const mpError = searchParams.get("message");

  return (
    <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <ExternalLink className="h-4 w-4 text-sky-500" />
          Mercado Pago — Split automático
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
          Conecte a conta Mercado Pago do estabelecimento para receber pagamentos PIX/cartão
          diretamente, com a taxa DUNNAA descontada automaticamente (marketplace OAuth).
        </p>

        {mpParam === "connected" && (
          <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg px-3 py-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Conta Mercado Pago conectada com sucesso!
          </div>
        )}
        {mpParam === "error" && mpError && (
          <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">
            {decodeURIComponent(mpError)}
          </div>
        )}

        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-[var(--color-primary)]" />
        ) : data?.connected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              Conectado — split ativo
            </div>
            {data.mercadopago_user_id && (
              <p className="text-xs text-[var(--color-text-muted)]">
                ID vendedor: {data.mercadopago_user_id}
              </p>
            )}
            {data.connected_at && (
              <p className="text-xs text-[var(--color-text-muted)]">
                Desde {new Date(data.connected_at).toLocaleDateString("pt-BR")}
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={disconnect.isPending}
              onClick={() => disconnect.mutate()}
              className="gap-2"
            >
              {disconnect.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Unlink className="h-4 w-4" />
              )}
              Desconectar
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Sem conexão OAuth, repasses usam chave PIX manual (se configurada).
            </p>
            <Button
              size="sm"
              className="bg-sky-600 hover:bg-sky-500 text-white gap-2"
              disabled={connect.isPending}
              onClick={() => connect.mutate()}
            >
              {connect.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              Conectar Mercado Pago
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
