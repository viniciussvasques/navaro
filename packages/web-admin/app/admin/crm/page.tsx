"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Users, Loader2, Phone, Mail, Calendar } from "lucide-react";

const formatDate = (dateStr: string | null) =>
    dateStr
        ? new Date(dateStr).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "short",
              year: "numeric",
          })
        : "—";

export default function CrmPage() {
    const [weeks, setWeeks] = React.useState(4);
    const [page, setPage] = React.useState(1);

    const { data, isLoading, isFetching } = useQuery({
        queryKey: ["admin-crm-retention", weeks, page],
        queryFn: async () => {
            const params = new URLSearchParams({
                weeks: String(weeks),
                page: String(page),
                page_size: "50",
            });
            const res = await api.get(`/admin/crm/retention?${params}`);
            return res.data as {
                items: Array<{
                    user_id: string;
                    user_name?: string | null;
                    phone: string;
                    email?: string | null;
                    last_appointment_at?: string | null;
                    weeks_since_visit?: number | null;
                    total_appointments: number;
                }>;
                total: number;
                weeks_threshold: number;
            };
        },
    });

    const items = data?.items ?? [];
    const total = data?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / 50));

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Users className="h-7 w-7 text-emerald-400" />
                        CRM — Retenção
                    </h1>
                    <p className="text-slate-400 mt-1">
                        Clientes sem visita concluída há várias semanas
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-400">Sem visita há</label>
                    <select
                        value={weeks}
                        onChange={(e) => {
                            setWeeks(Number(e.target.value));
                            setPage(1);
                        }}
                        className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                    >
                        {[2, 4, 6, 8, 12, 26, 52].map((w) => (
                            <option key={w} value={w}>
                                {w} semanas
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <p className="text-slate-400 text-sm">Candidatos à reengajamento</p>
                <p className="text-2xl font-bold text-white">{total}</p>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
                </div>
            ) : items.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                    Nenhum cliente inativo neste período.
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-700">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-800/80 text-slate-400">
                            <tr>
                                <th className="text-left p-3">Cliente</th>
                                <th className="text-left p-3">Contato</th>
                                <th className="text-left p-3">Última visita</th>
                                <th className="text-left p-3">Semanas</th>
                                <th className="text-right p-3">Total visitas</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((row) => (
                                <tr
                                    key={row.user_id}
                                    className="border-t border-slate-700/80 hover:bg-slate-800/40"
                                >
                                    <td className="p-3 text-white font-medium">
                                        {row.user_name || "Sem nome"}
                                    </td>
                                    <td className="p-3 text-slate-300">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="flex items-center gap-1">
                                                <Phone className="h-3 w-3" />
                                                {row.phone}
                                            </span>
                                            {row.email && (
                                                <span className="flex items-center gap-1 text-slate-500">
                                                    <Mail className="h-3 w-3" />
                                                    {row.email}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-3 text-slate-300 flex items-center gap-1">
                                        <Calendar className="h-3 w-3 text-slate-500" />
                                        {formatDate(row.last_appointment_at ?? null)}
                                    </td>
                                    <td className="p-3">
                                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs">
                                            {row.weeks_since_visit ?? "—"} sem
                                        </span>
                                    </td>
                                    <td className="p-3 text-right text-slate-300">
                                        {row.total_appointments}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
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
