"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useEstablishmentId, useEstablishmentLoading } from "@/contexts/EstablishmentContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  QrCode,
  CheckCircle,
  Clock,
  User,
  Loader2,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { ProPageHeader } from "@/components/ProPageHeader";
import { ProPageShell } from "@/components/ProPageShell";

export default function CheckInPage() {
  const establishmentId = useEstablishmentId();
  const establishmentLoading = useEstablishmentLoading();
  const [qrKey, setQrKey] = useState(0);

  // QR Code de check-in e fila (JWT) — cliente escaneia no app e faz check-in ou entra na fila
  const { data: qrData, isLoading: qrLoading } = useQuery({
    queryKey: ["checkin-qr", establishmentId, qrKey],
    queryFn: async () => {
      const res = await api.get(
        `/checkins/establishments/${establishmentId}/qr`
      );
      return res.data as {
        qr_token: string;
        qr_image_base64: string;
        expires_at: string;
      };
    },
    enabled: !!establishmentId && !establishmentLoading,
    refetchInterval: 14 * 60 * 1000, // Refresh 1 min before 15 min expiry
  });

  // Fetch today's appointments to show check-in status
  const { data, isLoading } = useQuery({
    queryKey: ["checkins-today", establishmentId],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const res = await api.get(
        `/appointments/establishments/${establishmentId}?date=${today}`
      );
      return res.data;
    },
    enabled: !!establishmentId && !establishmentLoading,
    refetchInterval: 30000, // Refresh every 30 seconds to catch new check-ins
  });

  const appointments = Array.isArray(data) ? data : data?.items || [];

  const checkedIn = appointments.filter(
    (a: any) => a.status === "checked_in" || a.status === "in_progress"
  );
  const waiting = appointments.filter(
    (a: any) => a.status === "confirmed" || a.status === "pending"
  );
  const completed = appointments.filter(
    (a: any) => a.status === "completed"
  );

  return (
    <ProPageShell maxWidth="lg">
      <ProPageHeader
        title="Check-in"
        description="Acompanhe os check-ins dos clientes que escanearam o QR Code no balcão."
        icon={QrCode}
      />

      {/* QR Code para Check-in e Fila — exibir no balcão */}
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2 text-[var(--color-text-primary)]">
            <QrCode className="h-4 w-4 text-[var(--color-primary)]" />
            QR Code para Check-in e Fila
          </CardTitle>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Exiba este QR no balcao. O cliente escaneia com o app Dunnaa: quem tem agendamento faz check-in; quem nao tem entra na fila (se ativada).
          </p>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-center gap-6">
          {qrLoading ? (
            <div className="flex items-center justify-center w-52 h-52 rounded-xl bg-[var(--color-background)]">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
            </div>
          ) : qrData?.qr_image_base64 ? (
            <div className="flex flex-col items-center gap-2">
              <img
                src={qrData.qr_image_base64}
                alt="QR Code check-in"
                className="w-52 h-52 rounded-xl border border-[var(--color-border)]"
              />
              <p className="text-xs text-[var(--color-text-muted)]">
                Expira em ~15 min. Atualize se precisar.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQrKey((k) => k + 1)}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Atualizar QR
              </Button>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">
              Nao foi possivel carregar o QR Code.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/20">
        <CardContent className="p-4">
          <div className="flex gap-3 items-start">
            <QrCode className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-[var(--color-text-primary)]">
                O check-in e feito quando o cliente escaneia o QR Code acima pelo app Dunnaa.
                Com agendamento hoje, o check-in e confirmado na hora. Sem agendamento, entra na fila (se ativada).
              </p>
              <Link
                href="/qr-code"
                className="inline-flex items-center gap-1 text-xs text-blue-500 mt-2 hover:underline"
              >
                Ver estatisticas do QR Code
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
          <CardContent className="p-4 text-center">
            <div className="inline-flex p-2 rounded-xl bg-amber-500/10 mb-2">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-[var(--color-text-primary)]">
              {isLoading ? "-" : waiting.length}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              Aguardando
            </p>
          </CardContent>
        </Card>

        <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
          <CardContent className="p-4 text-center">
            <div className="inline-flex p-2 rounded-xl bg-green-500/10 mb-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-[var(--color-text-primary)]">
              {isLoading ? "-" : checkedIn.length}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              Check-in feito
            </p>
          </CardContent>
        </Card>

        <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
          <CardContent className="p-4 text-center">
            <div className="inline-flex p-2 rounded-xl bg-blue-500/10 mb-2">
              <User className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-[var(--color-text-primary)]">
              {isLoading ? "-" : completed.length}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              Concluidos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Check-in List */}
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2 text-[var(--color-text-primary)]">
            <CheckCircle className="h-4 w-4 text-[var(--color-primary)]" />
            Agendamentos de Hoje
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
            </div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-10 w-10 text-[var(--color-text-muted)] mx-auto mb-3 opacity-50" />
              <p className="text-sm text-[var(--color-text-muted)]">
                Nenhum agendamento para hoje.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {appointments.map((apt: any) => (
                <div
                  key={apt.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-background)] hover:bg-[var(--color-border)]/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        apt.status === "checked_in" || apt.status === "in_progress"
                          ? "bg-green-500"
                          : apt.status === "completed"
                            ? "bg-blue-500"
                            : apt.status === "cancelled" || apt.status === "no_show"
                              ? "bg-red-500"
                              : "bg-amber-500"
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">
                        {apt.user?.name || apt.customer_name || "Cliente"}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {apt.service?.name || apt.service_name || "Servico"} &middot;{" "}
                        {new Date(apt.start_time || apt.scheduled_at).toLocaleTimeString(
                          "pt-BR",
                          { hour: "2-digit", minute: "2-digit" }
                        )}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      apt.status === "checked_in" || apt.status === "in_progress"
                        ? "bg-green-500/10 text-green-600"
                        : apt.status === "completed"
                          ? "bg-blue-500/10 text-blue-600"
                          : apt.status === "cancelled" || apt.status === "no_show"
                            ? "bg-red-500/10 text-red-600"
                            : "bg-amber-500/10 text-amber-600"
                    }`}
                  >
                    {apt.status === "checked_in"
                      ? "Check-in OK"
                      : apt.status === "in_progress"
                        ? "Em atendimento"
                        : apt.status === "completed"
                          ? "Concluido"
                          : apt.status === "confirmed"
                            ? "Confirmado"
                            : apt.status === "cancelled"
                              ? "Cancelado"
                              : apt.status === "no_show"
                                ? "Nao compareceu"
                                : "Pendente"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </ProPageShell>
  );
}
