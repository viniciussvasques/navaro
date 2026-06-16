"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ProPageShell } from "@/components/ProPageShell";
import { ProPageHeader } from "@/components/ProPageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Loader2, MessageSquare } from "lucide-react";
import { getApiErrorMessage } from "@/lib/errors";

type Supplier = { id: string; rating: number | null; total_reviews: number };
type Review = {
  id: string;
  establishment_name?: string;
  rating: number;
  comment?: string;
  owner_response?: string;
  created_at: string;
};

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i <= rating ? "fill-yellow-400 text-yellow-400" : "text-[var(--color-text-muted)]"}`}
        />
      ))}
    </div>
  );
}

export default function SupplierReviewsPage() {
  const queryClient = useQueryClient();
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [response, setResponse] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: supplier } = useQuery<Supplier | null>({
    queryKey: ["my-supplier"],
    queryFn: async () => {
      try { return (await api.get("/suppliers/my")).data; } catch { return null; }
    },
  });

  const { data: reviews = [], isLoading } = useQuery<Review[]>({
    queryKey: ["supplier-reviews", supplier?.id],
    enabled: !!supplier?.id,
    queryFn: async () => (await api.get(`/suppliers/${supplier!.id}/reviews`)).data,
  });

  const respondMutation = useMutation({
    mutationFn: ({ reviewId, text }: { reviewId: string; text: string }) =>
      api.patch(`/suppliers/${supplier!.id}/reviews/${reviewId}/respond`, { response: text }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-reviews"] });
      setRespondingId(null);
      setResponse("");
    },
    onError: (err, vars) => setErrors((prev) => ({ ...prev, [vars.reviewId]: getApiErrorMessage(err) })),
  });

  return (
    <ProPageShell>
      <ProPageHeader
        title="Avaliações"
        icon={Star}
        description={
          supplier
            ? `Nota média: ${supplier.rating ? Number(supplier.rating).toFixed(1) : "—"} · ${supplier.total_reviews} avaliação(ões)`
            : undefined
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" /></div>
      ) : reviews.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <Star className="h-10 w-10 text-[var(--color-text-muted)]" />
            <p className="text-[var(--color-text-muted)]">Nenhuma avaliação recebida ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-[var(--color-text-primary)]">
                        {r.establishment_name ?? "Estabelecimento"}
                      </p>
                      <Stars rating={r.rating} />
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {new Date(r.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>

                {r.comment && (
                  <p className="text-sm text-[var(--color-text-secondary)] italic">
                    &ldquo;{r.comment}&rdquo;
                  </p>
                )}

                {r.owner_response ? (
                  <div className="border-l-2 border-[var(--color-primary)]/40 pl-3 space-y-0.5">
                    <p className="text-xs font-medium text-[var(--color-primary)]">Sua resposta</p>
                    <p className="text-sm text-[var(--color-text-secondary)]">{r.owner_response}</p>
                  </div>
                ) : (
                  <>
                    {respondingId === r.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={response}
                          onChange={(e) => setResponse(e.target.value)}
                          rows={2}
                          maxLength={1000}
                          placeholder="Escreva sua resposta..."
                          className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 resize-none"
                        />
                        {errors[r.id] && <p className="text-xs text-red-400">{errors[r.id]}</p>}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => respondMutation.mutate({ reviewId: r.id, text: response })}
                            disabled={!response.trim() || respondMutation.isPending}
                          >
                            {respondMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                            Enviar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setRespondingId(null)}>Cancelar</Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => { setRespondingId(r.id); setResponse(""); }}
                      >
                        <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Responder
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </ProPageShell>
  );
}
