"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Star, MessageSquare, Store, Loader2, AlertTriangle, EyeOff, Eye } from "lucide-react";

const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

export default function ReviewsPage() {
    const [page, setPage] = React.useState(1);
    const [lowOnly, setLowOnly] = React.useState(false);
    const queryClient = useQueryClient();

    const { data, isLoading, isFetching } = useQuery({
        queryKey: ["admin-reviews", page, lowOnly],
        queryFn: async () => {
            const params = new URLSearchParams({ page: String(page), page_size: "30" });
            if (lowOnly) params.set("min_rating", "2");
            const res = await api.get(`/admin/reviews?${params}`);
            return res.data as {
                items: Array<{
                    id: string;
                    user_name?: string | null;
                    establishment_id: string;
                    establishment_name?: string | null;
                    staff_name?: string | null;
                    rating: number;
                    comment?: string | null;
                    created_at: string;
                    owner_response?: string | null;
                    is_hidden?: boolean;
                }>;
                total: number;
                page: number;
                page_size: number;
            };
        },
    });

    const toggleHide = useMutation({
        mutationFn: async ({ id, hidden }: { id: string; hidden: boolean }) => {
            const path = hidden ? `/admin/reviews/${id}/unhide` : `/admin/reviews/${id}/hide`;
            await api.patch(path);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-reviews"] }),
    });

    const items = data?.items ?? [];
    const total = data?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / (data?.page_size ?? 30)));

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <MessageSquare className="h-7 w-7 text-emerald-400" />
                        Avaliações
                    </h1>
                    <p className="text-slate-400 mt-1">Moderação de reviews em toda a plataforma</p>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={lowOnly}
                        onChange={(e) => {
                            setLowOnly(e.target.checked);
                            setPage(1);
                        }}
                        className="rounded border-slate-600 bg-slate-800"
                    />
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    Apenas notas baixas (≤2)
                </label>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                    <p className="text-slate-400 text-sm">Total</p>
                    <p className="text-2xl font-bold text-white">{total}</p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                    <p className="text-slate-400 text-sm">Média (página)</p>
                    <p className="text-2xl font-bold text-amber-400">
                        {items.length
                            ? (items.reduce((s, r) => s + r.rating, 0) / items.length).toFixed(1)
                            : "—"}
                    </p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 col-span-2 sm:col-span-1">
                    <p className="text-slate-400 text-sm">Baixas (≤2)</p>
                    <p className="text-2xl font-bold text-red-400">
                        {items.filter((r) => r.rating <= 2).length}
                    </p>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
                </div>
            ) : items.length === 0 ? (
                <div className="text-center py-16 text-slate-400">Nenhuma avaliação encontrada.</div>
            ) : (
                <div className="space-y-3">
                    {items.map((rev) => (
                        <div
                            key={rev.id}
                            className={`bg-slate-800/50 border rounded-xl p-4 hover:border-slate-600 transition-colors ${
                                rev.is_hidden ? "border-red-500/40 opacity-75" : "border-slate-700"
                            }`}
                        >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-medium text-white">{rev.user_name || "Anônimo"}</p>
                                        {rev.is_hidden && (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-300">
                                                Oculta
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                        <Store className="h-3 w-3" />
                                        {rev.establishment_name || `${rev.establishment_id.slice(0, 8)}…`}
                                        {rev.staff_name && (
                                            <span className="text-slate-600"> · {rev.staff_name}</span>
                                        )}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <Star
                                            key={i}
                                            className={`h-4 w-4 ${
                                                i < rev.rating ? "fill-amber-400 text-amber-400" : "text-slate-600"
                                            }`}
                                        />
                                    ))}
                                    <span className="text-sm text-slate-300 ml-1">{rev.rating}/5</span>
                                </div>
                            </div>
                            {rev.comment && (
                                <p className="text-slate-300 text-sm mt-3 leading-relaxed">{rev.comment}</p>
                            )}
                            {rev.owner_response && (
                                <div className="mt-3 pl-3 border-l-2 border-emerald-500/50">
                                    <p className="text-xs text-emerald-400 font-medium">Resposta do estabelecimento</p>
                                    <p className="text-slate-400 text-sm mt-1">{rev.owner_response}</p>
                                </div>
                            )}
                            <div className="flex items-center justify-between mt-3">
                                <p className="text-xs text-slate-500">{formatDate(rev.created_at)}</p>
                                <button
                                    type="button"
                                    disabled={toggleHide.isPending}
                                    onClick={() => toggleHide.mutate({ id: rev.id, hidden: !!rev.is_hidden })}
                                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200"
                                >
                                    {rev.is_hidden ? (
                                        <>
                                            <Eye className="h-3.5 w-3.5" /> Restaurar
                                        </>
                                    ) : (
                                        <>
                                            <EyeOff className="h-3.5 w-3.5" /> Ocultar
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 pt-4">
                    <button
                        type="button"
                        disabled={page <= 1 || isFetching}
                        onClick={() => setPage((p) => p - 1)}
                        className="px-4 py-2 rounded-lg bg-slate-700 text-white disabled:opacity-40"
                    >
                        Anterior
                    </button>
                    <span className="text-slate-400 text-sm">
                        Página {page} de {totalPages}
                    </span>
                    <button
                        type="button"
                        disabled={page >= totalPages || isFetching}
                        onClick={() => setPage((p) => p + 1)}
                        className="px-4 py-2 rounded-lg bg-slate-700 text-white disabled:opacity-40"
                    >
                        Próxima
                    </button>
                </div>
            )}
        </div>
    );
}
