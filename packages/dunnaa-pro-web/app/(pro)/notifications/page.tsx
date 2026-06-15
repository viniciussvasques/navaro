"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { Bell, Loader2, CheckCheck, ChevronLeft, ChevronRight } from "lucide-react";

type Notification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  data?: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
  updated_at: string;
};

type NotificationListResponse = {
  items: Notification[];
  total: number;
  page: number;
  page_size: number;
  unread_count: number;
};

const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["notifications", page],
    queryFn: async () => {
      const res = await api.get<NotificationListResponse>(
        `/notifications?page=${page}&page_size=${PAGE_SIZE}`
      );
      return res.data;
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.patch("/notifications/read-all", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const list = data?.items ?? [];
  const total = data?.total ?? 0;
  const unreadCount = data?.unread_count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8">
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-6">
            <p className="text-[var(--color-text-primary)]">
              Não foi possível carregar as notificações. Tente novamente.
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
    <div className="p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Notificações</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            {unreadCount > 0 ? `${unreadCount} não lida(s)` : "Todas lidas"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Marcar todas como lidas
          </Button>
        )}
      </div>

      {list.length === 0 ? (
        <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
          <CardContent className="py-12 text-center">
            <Bell className="h-12 w-12 mx-auto text-[var(--color-text-muted)]/50 mb-4" />
            <p className="text-[var(--color-text-muted)]">Nenhuma notificação.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            {list.map((n) => (
              <Card
                key={n.id}
                className={`border-[var(--color-border)] transition-colors ${
                  n.is_read ? "bg-[var(--color-surface)]" : "bg-[var(--color-primary)]/5 border-[var(--color-primary)]/20"
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className={`font-medium ${n.is_read ? "text-[var(--color-text-muted)]" : "text-[var(--color-text-primary)]"}`}>
                        {n.title}
                      </p>
                      <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{n.message}</p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-2">
                        {new Date(n.created_at).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {!n.is_read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markReadMutation.mutate(n.id)}
                        disabled={markReadMutation.isPending}
                      >
                        Marcar lida
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-[var(--color-text-muted)]">
                {total} notificação(ões) · Página {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
