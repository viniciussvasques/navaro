"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useEstablishmentId, useEstablishmentLoading } from "@/contexts/EstablishmentContext";
import {
  QrCode,
  Smartphone,
  TrendingUp,
  Calendar,
  Eye,
  UserPlus,
  Heart,
  CalendarCheck,
  Loader2,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function QRCodePage() {
  const establishmentId = useEstablishmentId();
  const establishmentLoading = useEstablishmentLoading();

  // Fetch analytics
  const { data: analytics, isLoading, isError, error } = useQuery({
    queryKey: ["qr-analytics", establishmentId],
    queryFn: async () => {
      const res = await api.get(`/qr/analytics/${establishmentId}`);
      return res.data;
    },
    enabled: !!establishmentId && !establishmentLoading,
  });

  if (establishmentLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            QR Code &amp; Check-in
          </h1>
        </div>
        <Card className="border-amber-500/30 bg-amber-500/5 mt-6">
          <CardContent className="p-6">
            <p className="text-[var(--color-text-primary)] font-medium">
              Não foi possível carregar as estatísticas do QR Code. Tente novamente.
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
    <div className="p-6 lg:p-8 space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
          QR Code &amp; Check-in
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Acompanhe quantos clientes escanearam o QR Code do seu estabelecimento,
          baixaram o app e fizeram check-in.
        </p>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/20">
        <CardContent className="p-5">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                Como funciona o QR Code?
              </p>
              <ul className="text-xs text-[var(--color-text-muted)] space-y-1.5">
                <li>
                  A equipe Dunnaa imprime e entrega o cartaz com QR Code para o seu estabelecimento.
                </li>
                <li>
                  Coloque o cartaz no balcao ou na recepcao — acessivel para os clientes.
                </li>
                <li>
                  <strong>Clientes novos:</strong> escaneiam, baixam o app e seu estabelecimento ja fica favoritado.
                </li>
                <li>
                  <strong>Clientes com agendamento:</strong> escaneiam e o check-in e feito automaticamente.
                </li>
                <li>
                  <strong>Sem agendamento:</strong> podem entrar na fila ou agendar na hora.
                </li>
                <li>
                  E um unico QR que resolve tudo: download, favoritar, check-in e fila.
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/10">
                <Eye className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Total de Scans
                </p>
                <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                  {analytics?.total_scans || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-green-500/10">
                <UserPlus className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Novos Clientes
                </p>
                <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                  {analytics?.conversions_signup || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-pink-500/10">
                <Heart className="h-5 w-5 text-pink-500" />
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Favoritaram
                </p>
                <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                  {analytics?.conversions_favorite || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-500/10">
                <CalendarCheck className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Check-ins
                </p>
                <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                  {analytics?.conversions_appointment || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conversion + Time Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Rate */}
        <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10">
                  <TrendingUp className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Taxa de Conversao
                  </p>
                  <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                    {analytics?.conversion_rate || 0}%
                  </p>
                </div>
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">
                Scans &rarr; Cadastros
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Unique Users */}
        <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/10">
                <Smartphone className="h-5 w-5 text-indigo-500" />
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Usuarios Unicos
                </p>
                <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                  {analytics?.unique_users || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time-based stats */}
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2 text-[var(--color-text-primary)]">
            <Calendar className="h-4 w-4 text-[var(--color-primary)]" />
            Scans por Periodo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)]">
            <span className="text-sm text-[var(--color-text-muted)]">Hoje</span>
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">
              {analytics?.scans_today || 0}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)]">
            <span className="text-sm text-[var(--color-text-muted)]">Esta Semana</span>
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">
              {analytics?.scans_this_week || 0}
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-[var(--color-text-muted)]">Este Mes</span>
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">
              {analytics?.scans_this_month || 0}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Platform breakdown */}
      {analytics?.platform_breakdown &&
        Object.keys(analytics.platform_breakdown).length > 0 && (
          <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2 text-[var(--color-text-primary)]">
                <Smartphone className="h-4 w-4 text-[var(--color-primary)]" />
                Plataformas dos Clientes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(analytics.platform_breakdown).map(
                ([platform, count]) => (
                  <div
                    key={platform}
                    className="flex items-center justify-between py-2 border-b border-[var(--color-border)] last:border-0"
                  >
                    <span className="text-sm text-[var(--color-text-muted)]">
                      {platform === "ios"
                        ? "iPhone / iOS"
                        : platform === "android"
                          ? "Android"
                          : platform === "web"
                            ? "Computador"
                            : "Outro"}
                    </span>
                    <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                      {count as number}
                    </span>
                  </div>
                )
              )}
            </CardContent>
          </Card>
        )}
    </div>
  );
}
