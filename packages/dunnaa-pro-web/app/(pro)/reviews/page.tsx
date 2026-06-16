"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEstablishmentId, useEstablishmentLoading } from "@/contexts/EstablishmentContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { Star, MessageSquare, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { ProPageHeader } from "@/components/ProPageHeader";
import { ProPageShell } from "@/components/ProPageShell";

type Review = {
  id: string;
  user_id: string;
  establishment_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user_name?: string | null;
  owner_response: string | null;
  owner_responded_at: string | null;
};

type ReviewListResponse = {
  items: Review[];
  total: number;
  page: number;
  page_size: number;
};

const PAGE_SIZE = 10;

export default function ReviewsPage() {
  const queryClient = useQueryClient();
  const establishmentId = useEstablishmentId();
  const establishmentLoading = useEstablishmentLoading();
  const [page, setPage] = useState(1);
  const [respondReviewId, setRespondReviewId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["reviews", establishmentId, page],
    queryFn: async () => {
      const res = await api.get<ReviewListResponse>(
        `/reviews/establishments/${establishmentId}?page=${page}&page_size=${PAGE_SIZE}`
      );
      return res.data;
    },
    enabled: !!establishmentId && !establishmentLoading,
  });

  const respondMutation = useMutation({
    mutationFn: async ({ reviewId, response }: { reviewId: string; response: string }) => {
      await api.patch(`/reviews/${reviewId}/respond`, { response });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      setRespondReviewId(null);
      setResponseText("");
    },
  });

  const handleRespond = () => {
    if (!respondReviewId || !responseText.trim()) return;
    respondMutation.mutate({ reviewId: respondReviewId, response: responseText.trim() });
  };

  if (!establishmentId) {
    return (
      <ProPageShell>
        <p className="text-[var(--color-text-muted)]">Selecione um estabelecimento.</p>
      </ProPageShell>
    );
  }

  if (isLoading) {
    return (
      <ProPageShell>
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
        </div>
      </ProPageShell>
    );
  }

  if (isError) {
    return (
      <ProPageShell>
        <ProPageHeader title="Avaliações" icon={Star} />
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-6">
            <p className="text-[var(--color-text-primary)]">
              Não foi possível carregar as avaliações. Tente novamente.
            </p>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              {(error as { message?: string })?.message}
            </p>
          </CardContent>
        </Card>
      </ProPageShell>
    );
  }

  const list = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <ProPageShell>
      <ProPageHeader
        title="Avaliações"
        description="Avaliações dos clientes sobre seu estabelecimento. Responda para engajar."
        icon={Star}
      />

      {list.length === 0 ? (
        <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
          <CardContent className="py-12 text-center">
            <Star className="h-12 w-12 mx-auto text-[var(--color-text-muted)]/50 mb-4" />
            <p className="text-[var(--color-text-muted)]">Nenhuma avaliação ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {list.map((review) => (
              <Card key={review.id} className="border-[var(--color-border)] bg-[var(--color-surface)]">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-[var(--color-text-primary)]">
                          {review.user_name ?? "Cliente"}
                        </span>
                        <span className="flex items-center gap-1 text-amber-500">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${i < review.rating ? "fill-current" : "opacity-30"}`}
                            />
                          ))}
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {new Date(review.created_at).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="mt-2 text-sm text-[var(--color-text-primary)]">{review.comment}</p>
                      )}
                      {review.owner_response && (
                        <div className="mt-3 pl-3 border-l-2 border-[var(--color-primary)]/30">
                          <p className="text-xs text-[var(--color-text-muted)] mb-0.5">Sua resposta</p>
                          <p className="text-sm text-[var(--color-text-primary)]">{review.owner_response}</p>
                        </div>
                      )}
                    </div>
                    {!review.owner_response && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setRespondReviewId(review.id);
                          setResponseText("");
                        }}
                        className="shrink-0"
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Responder
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
                {total} avaliação(ões) · Página {page} de {totalPages}
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

      {/* Modal Responder */}
      {respondReviewId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <Card className="w-full max-w-md border-[var(--color-border)] bg-[var(--color-surface)]">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Responder avaliação</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setRespondReviewId(null); setResponseText(""); }}>
                Fechar
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <textarea
                className="w-full min-h-[100px] rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                placeholder="Sua resposta ao cliente..."
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                maxLength={1000}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setRespondReviewId(null); setResponseText(""); }}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleRespond}
                  disabled={!responseText.trim() || respondMutation.isPending}
                >
                  {respondMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </ProPageShell>
  );
}
