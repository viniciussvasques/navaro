"use client";

import React from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
    Store,
    CheckCircle,
    XCircle,
    MapPin,
    Phone,
    Clock,
    ExternalLink,
    MoreVertical,
    Loader2,
    AlertCircle,
    Banknote,
    Zap,
    Download,
} from 'lucide-react';
import { downloadAdminCsv } from '@/lib/exportCsv';

export default function EstablishmentsPage() {
    const queryClient = useQueryClient();
    const [statusFilter, setStatusFilter] = React.useState<string>('');

    const { data, isLoading } = useQuery({
        queryKey: ['admin-establishments', statusFilter],
        queryFn: async () => {
            const params: Record<string, string | number> = { page_size: 100 };
            if (statusFilter) params.status = statusFilter;
            const res = await api.get('/admin/establishments', { params });
            return res.data;
        }
    });

    const approveMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.patch(`/admin/establishments/${id}/approve`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-establishments'] });
        }
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
        );
    }

    const establishments = data?.items || [];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold">Estabelecimentos</h2>
                    <p className="text-gray-400 mt-1">Gerencie e modere os negócios da plataforma.</p>
                </div>
                <div className="flex gap-3 items-center flex-wrap">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white"
                    >
                        <option value="">Todos os status</option>
                        <option value="pending">Pendentes</option>
                        <option value="active">Ativos</option>
                        <option value="suspended">Suspensos</option>
                    </select>
                    <button
                        type="button"
                        onClick={() => downloadAdminCsv('/admin/exports/establishments.csv', 'dunnaa-estabelecimentos.csv')}
                        className="flex items-center gap-2 px-3 py-2 bg-emerald-600/20 border border-emerald-500/30 rounded-xl text-emerald-300 hover:bg-emerald-600/30 text-sm"
                    >
                        <Download size={16} />
                        CSV
                    </button>
                    <Badge variant="outline">{establishments.length} Total</Badge>
                    <Badge variant="warning">{establishments.filter((e: any) => e.status === 'pending').length} Pendentes</Badge>
                </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm">
                <table className="w-full text-left">
                    <thead className="bg-white/5 border-b border-white/10 text-gray-400 text-xs uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4 font-medium">Negócio</th>
                            <th className="px-6 py-4 font-medium">Localização</th>
                            <th className="px-6 py-4 font-medium">Status</th>
                            <th className="px-6 py-4 font-medium">Plano</th>
                            <th className="px-6 py-4 font-medium">Recebimento</th>
                            <th className="px-6 py-4 font-medium text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                        {establishments.map((est: any) => (
                            <tr key={est.id} className="hover:bg-white/[0.02] transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center border border-blue-500/20">
                                            <Store className="text-blue-400" size={20} />
                                        </div>
                                        <div>
                                            <Link href={`/admin/establishments/${est.id}`} className="font-semibold text-sm hover:text-blue-400 transition-colors">
                                                {est.name}
                                            </Link>
                                            <p className="text-xs text-gray-500">{est.category}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1 text-xs text-gray-400">
                                        <div className="flex items-center gap-1">
                                            <MapPin size={12} />
                                            <span>{est.city}, {est.state}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Phone size={12} />
                                            <span>{est.phone}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <StatusBadge status={est.status} />
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-xs font-bold uppercase py-1 px-2 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-md">
                                        {est.subscription_tier}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    {est.pix_key ? (
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1.5">
                                                <Zap size={12} className={est.auto_payout_enabled ? "text-emerald-400" : "text-gray-500"} />
                                                <span className={`text-[10px] font-bold uppercase ${est.auto_payout_enabled ? "text-emerald-400" : "text-gray-500"}`}>
                                                    {est.auto_payout_enabled ? "Auto" : "Manual"}
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-gray-500 font-mono">
                                                PIX: {est.pix_key_type?.toUpperCase()} ···{est.pix_key?.slice(-4)}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-[10px] text-gray-600 flex items-center gap-1">
                                            <Banknote size={12} />
                                            Nao cadastrado
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {est.status === 'pending' && (
                                            <button
                                                onClick={() => approveMutation.mutate(est.id)}
                                                className="p-2 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors shadow-sm"
                                                title="Aprovar Cadastro"
                                            >
                                                <CheckCircle size={18} />
                                            </button>
                                        )}
                                        <Link
                                            href={`/admin/establishments/${est.id}`}
                                            className="p-2 border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                            title="Ver detalhes"
                                        >
                                            <ExternalLink size={18} />
                                        </Link>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {establishments.length === 0 && (
                    <div className="p-12 text-center">
                        <AlertCircle className="mx-auto text-gray-600 mb-4" size={48} />
                        <p className="text-gray-400">Nenhum estabelecimento encontrado.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles = {
        active: "bg-green-500/10 text-green-400 border-green-500/20",
        pending: "bg-orange-500/10 text-orange-400 border-orange-500/20",
        closed: "bg-red-500/10 text-red-400 border-red-500/20",
    }[status] || "bg-gray-500/10 text-gray-400 border-gray-500/20";

    return (
        <span className={`text-[10px] font-bold uppercase py-1 px-2 border rounded-full ${styles}`}>
            {status}
        </span>
    );
}

function Badge({ children, variant = "default" }: { children: React.ReactNode, variant?: string }) {
    const styles = {
        default: "bg-blue-600/10 text-blue-400 border-blue-500/20",
        warning: "bg-orange-600/10 text-orange-400 border-orange-500/20",
        outline: "border-white/10 text-gray-400",
    }[variant] || "";

    return (
        <span className={`text-xs font-semibold px-3 py-1.5 border rounded-full ${styles}`}>
            {children}
        </span>
    );
}
