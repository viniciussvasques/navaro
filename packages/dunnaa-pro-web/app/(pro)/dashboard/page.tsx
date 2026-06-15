"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardGuide } from "@/components/DashboardGuide";
import { PlatformSubscriptionCard } from "@/components/PlatformSubscriptionCard";
import { ProPageHeader } from "@/components/ProPageHeader";
import { ProPageShell } from "@/components/ProPageShell";
import { Calendar, ListOrdered, DollarSign, ArrowRight, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useEstablishmentId } from "@/contexts/EstablishmentContext";

export default function DashboardPage() {
  const [showGuide, setShowGuide] = useState(false);
  const establishmentId = useEstablishmentId();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats", establishmentId],
    queryFn: async () => {
      if (!establishmentId) return { appointmentsToday: 0, queueCount: 0, revenueToday: 0 };
      const today = new Date().toISOString().slice(0, 10);
      const [appRes, queueRes] = await Promise.all([
        api.get("/appointments/establishments/" + establishmentId + "?date=" + today).catch(() => ({ data: [] })),
        api.get("/queue/establishments/" + establishmentId).catch(() => ({ data: { items: [] } })),
      ]);
      const appointments = Array.isArray(appRes.data) ? appRes.data : appRes.data?.items ?? [];
      const queueData = queueRes.data as { items?: unknown[] };
      const entries = queueData?.items ?? [];
      const completedToday = appointments.filter(
        (a: { status: string; scheduled_at?: string }) =>
          a.status === "completed" && (a.scheduled_at || "").startsWith(today)
      );
      const revenueToday = completedToday.reduce(
        (s: number, a: { total_price?: number }) => s + (Number(a.total_price) || 0),
        0
      );
      return {
        appointmentsToday: appointments.length,
        queueCount: entries.length,
        revenueToday,
      };
    },
    enabled: !!establishmentId,
  });

  if (isLoading) {
    return (
      <ProPageShell>
        <div className="h-10 w-56 animate-pulse rounded-xl bg-[var(--color-surface)]" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl bg-[var(--color-surface)]" />
          ))}
        </div>
      </ProPageShell>
    );
  }

  const appointmentsToday = stats?.appointmentsToday ?? 0;
  const queueCount = stats?.queueCount ?? 0;
  const revenueToday = stats?.revenueToday ?? 0;

  return (
    <ProPageShell>
      <DashboardGuide forceOpen={showGuide} />
      <ProPageHeader
        title="Início"
        description="Visão geral do seu estabelecimento hoje."
        icon={LayoutDashboard}
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[var(--color-text-muted)]">
              Agendamentos hoje
            </CardTitle>
            <Calendar className="h-5 w-5 text-[var(--color-primary)]" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
              {appointmentsToday}
            </p>
            <Link href="/agenda">
              <Button variant="ghost" size="sm" className="mt-3 gap-1 px-0">
                Ver agenda <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[var(--color-text-muted)]">
              Fila agora
            </CardTitle>
            <ListOrdered className="h-5 w-5 text-[var(--color-primary)]" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
              {queueCount}
            </p>
            <Link href="/queue">
              <Button variant="ghost" size="sm" className="mt-3 gap-1 px-0">
                Ver fila <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[var(--color-text-muted)]">
              Receita hoje
            </CardTitle>
            <DollarSign className="h-5 w-5 text-[var(--color-success)]" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(revenueToday)}
            </p>
            <Link href="/finance">
              <Button variant="ghost" size="sm" className="mt-3 gap-1 px-0">
                Ver financeiro <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <PlatformSubscriptionCard />

      <Card>
        <CardHeader>
          <CardTitle>Bem-vindo ao DUNNAA Pro</CardTitle>
          <p className="text-sm text-[var(--color-text-muted)]">
            Use o menu ao lado para acessar Agenda, Fila, Check-in e mais.
          </p>
          <button
            type="button"
            onClick={() => setShowGuide(true)}
            className="mt-2 self-start text-xs text-[var(--color-primary)] hover:underline"
          >
            Ver guia de início novamente
          </button>
        </CardHeader>
      </Card>
    </ProPageShell>
  );
}
