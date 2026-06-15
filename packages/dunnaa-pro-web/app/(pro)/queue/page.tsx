"use client";

import React, { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useEstablishmentId, useEstablishmentLoading } from "@/contexts/EstablishmentContext";
import { ListOrdered, User, Clock, AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { ProPageHeader } from "@/components/ProPageHeader";
import { ProPageShell } from "@/components/ProPageShell";

type QueueStatus = "waiting" | "called" | "serving" | "completed" | "left";

type QueueEntry = {
  id: string;
  position: number;
  status: QueueStatus;
  entered_at: string;
  user_name?: string | null;
  service_name?: string | null;
  staff_name?: string | null;
  estimated_wait_minutes?: number | null;
};

type QueueListResponse = {
  items: QueueEntry[];
  total_waiting: number;
  current_serving: number;
};

const STATUS_LABEL: Record<QueueStatus, string> = {
  waiting: "Aguardando",
  called: "Chamado",
  serving: "Sendo atendido",
  completed: "Concluído",
  left: "Saiu da fila",
};

const STATUS_COLOR: Record<QueueStatus, string> = {
  waiting: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  called: "bg-blue-500/10 text-blue-300 border-blue-500/30",
  serving: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  completed: "bg-slate-600/20 text-slate-200 border-slate-500/40",
  left: "bg-red-500/10 text-red-300 border-red-500/30",
};

export default function QueuePage() {
  const queryClient = useQueryClient();
  const establishmentId = useEstablishmentId();
  const establishmentLoading = useEstablishmentLoading();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["queue", establishmentId],
    queryFn: async () => {
      if (!establishmentId) return null as QueueListResponse | null;
      const res = await api.get(`/queue/establishments/${establishmentId}`);
      return res.data as QueueListResponse;
    },
    enabled: !!establishmentId && !establishmentLoading,
  });

  const mutateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: QueueStatus }) => {
      await api.patch(`/queue/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue"] });
    },
  });

  const removeEntry = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/queue/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue"] });
    },
  });

  const waiting = useMemo(
    () => data?.items.filter((i) => i.status === "waiting") ?? [],
    [data]
  );
  const others = useMemo(
    () => data?.items.filter((i) => i.status !== "waiting") ?? [],
    [data]
  );

  const handleCallNext = () => {
    if (!waiting.length || mutateStatus.isPending) return;
    const next = waiting[0];
    mutateStatus.mutate({ id: next.id, status: "called" });
  };

  return (
    <ProPageShell>
      <ProPageHeader
        title="Fila de espera"
        description="Veja quem está aguardando e chame o próximo cliente."
        icon={ListOrdered}
        actions={
          <>
            <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm text-[var(--color-text-muted)]">
              <ListOrdered className="h-4 w-4" />
              <span>
                Aguardando:{" "}
                <span className="font-semibold text-[var(--color-text-primary)]">
                  {data?.total_waiting ?? 0}
                </span>
              </span>
            </div>
            <Button
              type="button"
              onClick={handleCallNext}
              disabled={!waiting.length || mutateStatus.isPending}
              className="inline-flex items-center gap-2"
            >
              {mutateStatus.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              Chamar próximo
            </Button>
          </>
        }
      />

      {establishmentLoading || isLoading ? (
        <div className="space-y-4">
          <div className="h-8 w-40 rounded-lg bg-[var(--color-surface)] animate-pulse" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-[var(--color-surface)] animate-pulse" />
            ))}
          </div>
        </div>
      ) : !data || data.items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <AlertCircle className="h-8 w-8 mx-auto text-[var(--color-text-muted)]" />
            <p className="text-sm text-[var(--color-text-muted)]">
              Nenhum cliente na fila no momento. Quando alguém fizer check-in ou entrar pela fila, aparecerá aqui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-[1.3fr_minmax(0,1fr)]">
          <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <ListOrdered className="h-4 w-4" />
                Em espera
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {waiting.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start justify-between gap-3 rounded-xl bg-[var(--color-surface-elevated)] px-4 py-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
                      <span className="inline-flex h-6 min-w-[1.75rem] items-center justify-center rounded-full bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-xs font-semibold">
                        #{entry.position}
                      </span>
                      <User className="h-4 w-4 text-[var(--color-text-muted)]" />
                      <span>{entry.user_name || "Cliente"}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
                      {entry.service_name && (
                        <span className="inline-flex items-center gap-1">
                          <span>Serviço:</span>
                          <span className="font-medium text-[var(--color-text-primary)]">
                            {entry.service_name}
                          </span>
                        </span>
                      )}
                      {entry.staff_name && (
                        <>
                          <span className="mx-1">•</span>
                          <span>Prof: {entry.staff_name}</span>
                        </>
                      )}
                      <span className="mx-1">•</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(entry.entered_at).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {typeof entry.estimated_wait_minutes === "number" && (
                        <>
                          <span className="mx-1">•</span>
                          <span>~{entry.estimated_wait_minutes} min</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_COLOR[entry.status]}`}
                    >
                      {STATUS_LABEL[entry.status]}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-xs"
                        title="Remover da fila"
                        onClick={() => removeEntry.mutate(entry.id)}
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {waiting.length === 0 && (
                <p className="text-sm text-[var(--color-text-muted)]">
                  Ninguém aguardando. Quando alguém entrar na fila, aparecerá aqui.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Em atendimento / histórico recente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {others.slice(0, 5).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-[var(--color-surface-elevated)] px-4 py-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
                      <User className="h-4 w-4 text-[var(--color-text-muted)]" />
                      <span>{entry.user_name || "Cliente"}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(entry.entered_at).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="mx-1">•</span>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 ${STATUS_COLOR[entry.status]} text-[10px] font-semibold uppercase tracking-wide`}>
                        {STATUS_LABEL[entry.status]}
                      </span>
                    </div>
                  </div>

                  {entry.status === "called" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => mutateStatus.mutate({ id: entry.id, status: "serving" })}
                    >
                      Iniciar atendimento
                    </Button>
                  )}
                  {entry.status === "serving" && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => mutateStatus.mutate({ id: entry.id, status: "completed" })}
                    >
                      Concluir
                    </Button>
                  )}
                </div>
              ))}

              {others.length === 0 && (
                <p className="text-sm text-[var(--color-text-muted)]">
                  Nenhum atendimento recente listado.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {isFetching && !isLoading && (
        <p className="text-xs text-[var(--color-text-muted)]">Atualizando fila…</p>
      )}
    </ProPageShell>
  );
}
