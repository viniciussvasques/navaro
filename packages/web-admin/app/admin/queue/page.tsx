"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ListOrdered, Store, User, Clock, Loader2, RefreshCw } from "lucide-react";

type QueueStatus = "waiting" | "called" | "serving" | "completed" | "left";

type QueueEntry = {
    id: string;
    position: number;
    status: QueueStatus;
    user_name?: string | null;
    service_name?: string | null;
    staff_name?: string | null;
    estimated_wait_minutes?: number | null;
    entered_at: string;
};

type OverviewItem = {
    establishment_id: string;
    establishment_name: string;
    total_waiting: number;
    current_serving: number;
    items: QueueEntry[];
};

const STATUS_LABEL: Record<QueueStatus, string> = {
    waiting: "Aguardando",
    called: "Chamado",
    serving: "Atendendo",
    completed: "Concluído",
    left: "Saiu",
};

const STATUS_COLOR: Record<QueueStatus, string> = {
    waiting: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    called: "bg-blue-500/10 text-blue-300 border-blue-500/30",
    serving: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    completed: "bg-slate-600/20 text-slate-200 border-slate-500/40",
    left: "bg-red-500/10 text-red-300 border-red-500/30",
};

export default function QueuePage() {
    const { data, isLoading, isFetching, refetch } = useQuery({
        queryKey: ["admin-queue"],
        queryFn: async () => {
            const res = await api.get("/admin/queue");
            return res.data as { establishments: OverviewItem[]; total_waiting: number };
        },
        refetchInterval: 30000,
        refetchIntervalInBackground: false,
    });

    const establishments = data?.establishments ?? [];
    const totalWaiting = data?.total_waiting ?? 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <ListOrdered className="h-7 w-7 text-blue-400" />
                        Filas Ativas
                    </h1>
                    <p className="text-slate-400 mt-1">Monitoramento em tempo real de todas as filas</p>
                </div>
                <button
                    type="button"
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600 disabled:opacity-50"
                >
                    <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                    Atualizar
                </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                    <p className="text-slate-400 text-sm">Estabelecimentos com fila</p>
                    <p className="text-2xl font-bold text-white">{establishments.length}</p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                    <p className="text-slate-400 text-sm">Total aguardando</p>
                    <p className="text-2xl font-bold text-amber-400">{totalWaiting}</p>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                </div>
            ) : establishments.length === 0 ? (
                <div className="text-center py-16 text-slate-400">Nenhuma fila ativa no momento.</div>
            ) : (
                <div className="space-y-6">
                    {establishments.map((est) => (
                        <div
                            key={est.establishment_id}
                            className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden"
                        >
                            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-700">
                                <div className="flex items-center gap-2">
                                    <Store className="h-5 w-5 text-emerald-400" />
                                    <h2 className="font-semibold text-white">{est.establishment_name}</h2>
                                </div>
                                <div className="flex gap-3 text-sm">
                                    <span className="text-amber-400">{est.total_waiting} aguardando</span>
                                    <span className="text-emerald-400">{est.current_serving} atendendo</span>
                                </div>
                            </div>
                            <div className="divide-y divide-slate-700/50">
                                {est.items.map((entry) => (
                                    <div
                                        key={entry.id}
                                        className="flex flex-wrap items-center gap-4 px-5 py-3 hover:bg-slate-700/20"
                                    >
                                        <span className="text-slate-500 font-mono text-sm w-8">#{entry.position}</span>
                                        <span
                                            className={`text-xs px-2 py-0.5 rounded border ${STATUS_COLOR[entry.status]}`}
                                        >
                                            {STATUS_LABEL[entry.status]}
                                        </span>
                                        <span className="flex items-center gap-1 text-white text-sm">
                                            <User className="h-3.5 w-3.5 text-slate-400" />
                                            {entry.user_name || "Cliente"}
                                        </span>
                                        {entry.service_name && (
                                            <span className="text-slate-400 text-sm">{entry.service_name}</span>
                                        )}
                                        {entry.staff_name && (
                                            <span className="text-slate-500 text-xs">→ {entry.staff_name}</span>
                                        )}
                                        {entry.estimated_wait_minutes != null && entry.status === "waiting" && (
                                            <span className="flex items-center gap-1 text-xs text-slate-500 ml-auto">
                                                <Clock className="h-3 w-3" />~{entry.estimated_wait_minutes} min
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
