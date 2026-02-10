"use client";

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
    DollarSign,
    ArrowDownCircle,
    ArrowUpCircle,
    Clock,
    CheckCircle,
    XCircle,
    TrendingUp,
    Loader2,
    AlertCircle
} from 'lucide-react';

const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

export default function FinancePage() {
    const queryClient = useQueryClient();

    const { data: payoutsData, isLoading: loadingPayouts } = useQuery({
        queryKey: ['admin-payouts'],
        queryFn: async () => {
            const res = await api.get('/admin/payouts');
            return res.data;
        }
    });

    const { data: analytics, isLoading: loadingAnalytics } = useQuery({
        queryKey: ['admin-analytics'],
        queryFn: async () => {
            const res = await api.get('/admin/analytics/dashboard');
            return res.data;
        }
    });

    const approveMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.patch(`/admin/payouts/${id}/approve`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-payouts'] });
        }
    });

    if (loadingPayouts || loadingAnalytics) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
        );
    }

    const payouts = payoutsData?.items || [];
    const pendingPayouts = payouts.filter((p: any) => p.status === 'pending');
    const totalPending = pendingPayouts.reduce((acc: number, p: any) => acc + p.amount, 0);
    const totalCompleted = payouts.filter((p: any) => p.status === 'completed' || p.status === 'succeeded').reduce((acc: number, p: any) => acc + p.amount, 0);

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold">Gestão Financeira</h2>
                    <p className="text-gray-400 mt-1">Monitore e aprove solicitações de saque da plataforma.</p>
                </div>
                <div className="flex items-center gap-4 bg-orange-500/10 border border-orange-500/20 px-6 py-3 rounded-2xl">
                    <div className="p-2 bg-orange-500/20 rounded-lg">
                        <Clock size={20} className="text-orange-400" />
                    </div>
                    <div>
                        <p className="text-[10px] uppercase font-bold text-orange-400 tracking-wider">Total Pendente</p>
                        <p className="text-xl font-bold">{formatCurrency(totalPending)}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard label="Saques Totals (Aprovados)" value={formatCurrency(totalCompleted)} icon={ArrowUpCircle} color="text-blue-400" bg="bg-blue-500/10" />
                <StatCard label="Retenção de Taxas (Agendamentos)" value={formatCurrency(analytics?.commissions || 0)} icon={TrendingUp} color="text-green-400" bg="bg-green-500/10" />
                <StatCard label="Receita de Assinaturas" value={formatCurrency(analytics?.subscription_revenue || 0)} icon={DollarSign} color="text-purple-400" bg="bg-purple-500/10" />
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
                <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                    <h3 className="font-bold text-sm uppercase tracking-widest text-gray-400">Solicitações de Saque</h3>
                </div>
                <table className="w-full text-left">
                    <thead className="bg-white/5 text-gray-400 text-[10px] uppercase font-bold tracking-widest">
                        <tr>
                            <th className="px-6 py-4">Estabelecimento ID</th>
                            <th className="px-6 py-4">Valor</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Data</th>
                            <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 text-sm">
                        {payouts.map((p: any) => (
                            <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                                <td className="px-6 py-4 font-mono text-xs text-gray-400">
                                    {p.establishment_id.substring(0, 13)}...
                                </td>
                                <td className="px-6 py-4 font-bold text-white">
                                    {formatCurrency(p.amount)}
                                </td>
                                <td className="px-6 py-4">
                                    <StatusBadge status={p.status} />
                                </td>
                                <td className="px-6 py-4 text-gray-500 text-xs">
                                    {new Date().toLocaleDateString('pt-BR')}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {p.status === 'pending' && (
                                        <button
                                            onClick={() => approveMutation.mutate(p.id)}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/20"
                                        >
                                            Aprovar Saque
                                        </button>
                                    )}
                                    {p.status === 'completed' && (
                                        <span className="text-gray-600 text-xs flex items-center justify-end gap-1">
                                            <CheckCircle size={14} /> Concluído
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {payouts.length === 0 && (
                    <div className="p-16 text-center">
                        <AlertCircle className="mx-auto text-gray-700 mb-4" size={48} />
                        <p className="text-gray-500">Nenhuma movimentação financeira registrada.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({ label, value, icon: Icon, color, bg }: any) {
    return (
        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${bg}`}>
                    <Icon size={18} className={color} />
                </div>
                <p className="text-xs text-gray-500 font-medium">{label}</p>
            </div>
            <p className="text-2xl font-bold mt-3">{value}</p>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles = {
        pending: "bg-orange-500/10 text-orange-400 border-orange-500/20",
        completed: "bg-green-500/10 text-green-400 border-green-500/20",
        failed: "bg-red-500/10 text-red-400 border-red-500/20",
    }[status] || "bg-gray-500/10 text-gray-400 border-gray-500/20";

    return (
        <span className={`text-[9px] font-black uppercase py-1 px-2 border rounded-md tracking-tighter ${styles}`}>
            {status}
        </span>
    );
}
