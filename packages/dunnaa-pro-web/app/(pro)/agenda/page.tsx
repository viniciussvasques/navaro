"use client";

import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  Clock,
  User,
  Scissors,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Phone,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useEstablishmentId, useEstablishmentLoading } from "@/contexts/EstablishmentContext";
import { ProPageHeader } from "@/components/ProPageHeader";
import { ProPageShell } from "@/components/ProPageShell";

type AppointmentStatus =
  | "pending"
  | "awaiting_deposit"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show"
  | "checked_in"
  | "in_progress";

type Appointment = {
  id: string;
  user_id: string;
  establishment_id: string;
  service_id: string;
  staff_id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: AppointmentStatus;
  total_price?: number | null;
  notes?: string | null;
};

type StaffMember = { id: string; name: string; role: string };
type Service = { id: string; name: string; price: number; duration_minutes: number };
type UserInfo = { id: string; name: string | null; phone: string };

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  awaiting_deposit: "Aguardando sinal",
  confirmed: "Confirmado",
  completed: "Concluido",
  cancelled: "Cancelado",
  no_show: "Nao compareceu",
  checked_in: "Check-in",
  in_progress: "Em atendimento",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-300",
  awaiting_deposit: "bg-blue-500/10 text-blue-600 border-blue-300",
  confirmed: "bg-emerald-500/10 text-emerald-600 border-emerald-300",
  completed: "bg-slate-500/10 text-slate-500 border-slate-300",
  cancelled: "bg-red-500/10 text-red-600 border-red-300",
  no_show: "bg-orange-500/10 text-orange-600 border-orange-300",
  checked_in: "bg-green-500/10 text-green-600 border-green-300",
  in_progress: "bg-purple-500/10 text-purple-600 border-purple-300",
};

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

export default function AgendaPage() {
  const queryClient = useQueryClient();
  const establishmentId = useEstablishmentId();
  const establishmentLoading = useEstablishmentLoading();

  const [selectedDate, setSelectedDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );

  // Fetch appointments
  const { data: appointments = [], isLoading, isFetching } = useQuery({
    queryKey: ["agenda", selectedDate, establishmentId],
    queryFn: async () => {
      if (!establishmentId) return [];
      const res = await api.get(
        `/appointments/establishments/${establishmentId}?date=${selectedDate}`
      );
      const raw = Array.isArray(res.data) ? res.data : res.data?.items ?? [];
      return raw as Appointment[];
    },
    enabled: !!establishmentId && !establishmentLoading,
  });

  // Fetch staff for name lookup
  const { data: staffList = [] } = useQuery({
    queryKey: ["staff-lookup", establishmentId],
    queryFn: async () => {
      if (!establishmentId) return [];
      const res = await api.get(`/establishments/${establishmentId}/staff?active_only=false`);
      return (Array.isArray(res.data) ? res.data : []) as StaffMember[];
    },
    enabled: !!establishmentId && !establishmentLoading,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch services for name lookup
  const { data: serviceList = [] } = useQuery({
    queryKey: ["services-lookup", establishmentId],
    queryFn: async () => {
      if (!establishmentId) return [];
      const res = await api.get(`/establishments/${establishmentId}/services`);
      return (Array.isArray(res.data) ? res.data : []) as Service[];
    },
    enabled: !!establishmentId && !establishmentLoading,
    staleTime: 5 * 60 * 1000,
  });

  const staffMap = useMemo(() => {
    const m = new Map<string, StaffMember>();
    staffList.forEach((s) => m.set(s.id, s));
    return m;
  }, [staffList]);

  const serviceMap = useMemo(() => {
    const m = new Map<string, Service>();
    serviceList.forEach((s) => m.set(s.id, s));
    return m;
  }, [serviceList]);

  // Status update mutation
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await api.patch(`/appointments/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agenda"] });
    },
  });

  // Group by hour
  const groupedByHour = useMemo(() => {
    const groups: Record<string, Appointment[]> = {};
    for (const appt of appointments) {
      const d = new Date(appt.scheduled_at);
      const key = d.toTimeString().slice(0, 5);
      if (!groups[key]) groups[key] = [];
      groups[key].push(appt);
    }
    return Object.entries(groups).sort(([a], [b]) => (a < b ? -1 : 1));
  }, [appointments]);

  // Stats
  const stats = useMemo(() => {
    const total = appointments.length;
    const confirmed = appointments.filter(
      (a) => a.status === "confirmed" || a.status === "pending"
    ).length;
    const completed = appointments.filter((a) => a.status === "completed").length;
    const cancelled = appointments.filter(
      (a) => a.status === "cancelled" || a.status === "no_show"
    ).length;
    const revenue = appointments
      .filter((a) => a.status === "completed")
      .reduce((sum, a) => sum + (a.total_price || 0), 0);
    return { total, confirmed, completed, cancelled, revenue };
  }, [appointments]);

  const dateLabel = useMemo(() => {
    const d = new Date(selectedDate + "T12:00:00");
    return d.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    });
  }, [selectedDate]);

  const changeDate = (delta: number) => {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const isToday = selectedDate === new Date().toISOString().slice(0, 10);

  return (
    <ProPageShell>
      <ProPageHeader
        title="Agenda"
        description="Agendamentos do dia com detalhes de cliente, serviço e profissional."
        icon={Calendar}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => changeDate(-1)}
              className="rounded-lg p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
              <Calendar className="h-4 w-4 text-[var(--color-text-muted)]" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-sm text-[var(--color-text-primary)] outline-none"
              />
            </div>
            <button
              onClick={() => changeDate(1)}
              className="rounded-lg p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            {!isToday && (
              <button
                onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
                className="ml-1 text-xs text-[var(--color-primary)] hover:underline"
              >
                Hoje
              </button>
            )}
          </div>
        }
      />

      {/* Date Label + Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-[var(--color-text-muted)] capitalize">{dateLabel}</p>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-[var(--color-text-muted)]">
            {stats.total} agendamentos
          </span>
          {stats.completed > 0 && (
            <span className="text-emerald-600">{stats.completed} concluidos</span>
          )}
          {stats.revenue > 0 && (
            <span className="text-[var(--color-primary)] font-medium">
              {formatCurrency(stats.revenue)} faturado
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      {establishmentLoading ? (
        <div className="space-y-4">
          <div className="h-12 rounded-2xl bg-[var(--color-surface)] animate-pulse" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-[var(--color-surface)] animate-pulse" />
          ))}
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-[var(--color-surface)] animate-pulse" />
          ))}
        </div>
      ) : appointments.length === 0 ? (
      <Card>
          <CardContent className="py-12 text-center space-y-3">
            <Calendar className="h-10 w-10 mx-auto text-[var(--color-text-muted)] opacity-50" />
            <p className="text-sm text-[var(--color-text-muted)]">
              Nenhum agendamento para este dia.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groupedByHour.map(([time, list]) => (
            <Card key={time} className="border-[var(--color-border)] bg-[var(--color-surface)]">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[var(--color-primary)]" />
                  <CardTitle className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {time}
          </CardTitle>
                </div>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {list.length} {list.length === 1 ? "agendamento" : "agendamentos"}
                </span>
        </CardHeader>
              <CardContent className="space-y-2">
                {list.map((appt) => {
                  const d = new Date(appt.scheduled_at);
                  const end = new Date(d.getTime() + appt.duration_minutes * 60000);
                  const range = `${d.toTimeString().slice(0, 5)} - ${end.toTimeString().slice(0, 5)}`;
                  const staff = staffMap.get(appt.staff_id);
                  const service = serviceMap.get(appt.service_id);
                  const canComplete =
                    appt.status === "confirmed" ||
                    appt.status === "checked_in" ||
                    appt.status === "in_progress";
                  const canCancel =
                    appt.status === "pending" || appt.status === "confirmed";

                  return (
                    <div
                      key={appt.id}
                      className="rounded-xl bg-[var(--color-background)] px-4 py-3 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          {/* Service Name */}
                          <div className="flex items-center gap-2">
                            <Scissors className="h-4 w-4 text-[var(--color-primary)] flex-shrink-0" />
                            <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                              {service?.name || "Servico"}
                            </span>
                            {typeof appt.total_price === "number" && (
                              <span className="text-xs font-semibold text-[var(--color-primary)]">
                                {formatCurrency(appt.total_price)}
                              </span>
                            )}
                          </div>

                          {/* Staff */}
                          <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                            <User className="h-3 w-3 flex-shrink-0" />
                            <span>
                              Profissional: <strong className="text-[var(--color-text-primary)]">{staff?.name || "Nao atribuido"}</strong>
                            </span>
                          </div>

                          {/* Time + Duration */}
                          <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                            <Clock className="h-3 w-3 flex-shrink-0" />
                            <span>{range}</span>
                            <span>({appt.duration_minutes} min)</span>
                          </div>

                          {/* Notes */}
                          {appt.notes && (
                            <p className="text-xs text-[var(--color-text-muted)] italic">
                              &quot;{appt.notes}&quot;
                            </p>
                          )}
                        </div>

                        {/* Status + Actions */}
                        <div className="flex flex-col items-end gap-2">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${STATUS_COLOR[appt.status] || "bg-gray-100 text-gray-500 border-gray-300"}`}
                          >
                            {STATUS_LABEL[appt.status] || appt.status}
                          </span>

                          <div className="flex items-center gap-1">
                            {canComplete && (
                              <button
                                onClick={() =>
                                  statusMutation.mutate({
                                    id: appt.id,
                                    status: "completed",
                                  })
                                }
                                disabled={statusMutation.isPending}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Marcar como concluido"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                            )}
                            {canCancel && (
                              <button
                                onClick={() =>
                                  statusMutation.mutate({
                                    id: appt.id,
                                    status: "cancelled",
                                  })
                                }
                                disabled={statusMutation.isPending}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Cancelar"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            )}
                            {canComplete && (
                              <button
                                onClick={() =>
                                  statusMutation.mutate({
                                    id: appt.id,
                                    status: "no_show",
                                  })
                                }
                                disabled={statusMutation.isPending}
                                className="p-1.5 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                                title="Nao compareceu"
                              >
                                <AlertTriangle className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
        </CardContent>
      </Card>
          ))}
        </div>
      )}
    </ProPageShell>
  );
}
