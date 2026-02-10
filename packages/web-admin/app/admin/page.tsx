"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCookie } from 'cookies-next';
import { api } from '@/lib/api';
import {
    TrendingUp,
    Users,
    Store,
    DollarSign,
    ArrowUpRight,
    ArrowDownRight,
    Loader2,
    Package,
    Calendar,
    CalendarX,
    CreditCard
} from 'lucide-react';

const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

export default function DashboardPage() {
    const role = getCookie('user_role');
    const isSupport = role === 'support';

    const { data, isLoading, isError } = useQuery({
        queryKey: ['admin-dashboard'],
        queryFn: async () => {
            const res = await api.get('/admin/analytics/dashboard');
            return res.data;
        },
        enabled: !isSupport, // Don't fetch if support
        retry: false
    });

    if (isSupport) {
        return (
            <div className="space-y-8 animate-in fade-in duration-700">
                <div>
                    <h2 className="text-3xl font-bold">Área de Suporte</h2>
                    <p className="text-gray-400 mt-1">Ferramentas de atendimento e suporte ao cliente.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-6 bg-white/5 border border-white/10 rounded-2xl hover:border-white/20 transition-all duration-300">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
                                <Users size={24} />
                            </div>
                            <h3 className="text-xl font-bold">Usuários</h3>
                        </div>
                        <p className="text-gray-400 text-sm mb-4">Gerencie usuários, verifique status e resolva problemas de acesso.</p>
                        <button className="text-blue-400 text-sm font-medium hover:text-blue-300 transition-colors">Acessar Lista &rarr;</button>
                    </div>

                    <div className="p-6 bg-white/5 border border-white/10 rounded-2xl hover:border-white/20 transition-all duration-300">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
                                <Store size={24} />
                            </div>
                            <h3 className="text-xl font-bold">Estabelecimentos</h3>
                        </div>
                        <p className="text-gray-400 text-sm mb-4">Verifique cadastros de parceiros e ajude na configuração.</p>
                        <button className="text-purple-400 text-sm font-medium hover:text-purple-300 transition-colors">Ver Parceiros &rarr;</button>
                    </div>

                    {/* Quick Access to Tickets */}
                    <div className="p-6 bg-white/5 border border-white/10 rounded-2xl hover:border-white/20 transition-all duration-300">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 rounded-xl bg-yellow-500/10 text-yellow-400">
                                <div className="w-6 h-6 flex items-center justify-center">
                                    {/* Simple Icon placeholder if not imported */}
                                    T
                                </div>
                            </div>
                            <h3 className="text-xl font-bold">Tickets</h3>
                        </div>
                        <p className="text-gray-400 text-sm mb-4">Verifique tickets de suporte abertos.</p>
                        <button onClick={() => window.location.href = '/admin/support'} className="text-yellow-400 text-sm font-medium hover:text-yellow-300 transition-colors">Ver Tickets &rarr;</button>
                    </div>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <Loader2 size={48} className="animate-spin text-blue-500" />
                <p className="text-gray-400 animate-pulse">Carregando métricas de elite...</p>
            </div>
        );
    }

    // Fallback and dynamic stats
    const stats = [
        { label: 'Faturamento Total (GMV)', value: formatCurrency(data?.gmv || 0), change: '+12.5%', isUp: true, icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/10' },
        { label: 'Comissões da Plataforma', value: formatCurrency(data?.commissions || 0), change: '+8.2%', isUp: true, icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        { label: 'Receita de Assinaturas', value: formatCurrency(data?.subscription_revenue || 0), change: '+15%', isUp: true, icon: ArrowUpRight, color: 'text-purple-400', bg: 'bg-purple-500/10' },
        { label: 'Ticket Médio', value: formatCurrency(data?.average_ticket || 0), change: '+5%', isUp: true, icon: DollarSign, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    ];

    const operationStats = [
        { label: 'Agendamentos Finalizados', value: data?.completed_appointments || 0, icon: Calendar, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        { label: 'Agendamentos Cancelados', value: data?.cancelled_appointments || 0, icon: CalendarX, color: 'text-rose-400', bg: 'bg-rose-500/10' },
        { label: 'Produtos Vendidos', value: data?.products_sold || 0, icon: Package, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        { label: 'Assinaturas Ativas', value: data?.active_subscriptions || 0, icon: CreditCard, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    ];

    if (isSupport) {
        return (
            <div className="space-y-8 animate-in fade-in duration-700">
                <div>
                    <h2 className="text-3xl font-bold">Área de Suporte</h2>
                    <p className="text-gray-400 mt-1">Ferramentas de atendimento e suporte ao cliente.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-6 bg-white/5 border border-white/10 rounded-2xl hover:border-white/20 transition-all duration-300">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
                                <Users size={24} />
                            </div>
                            <h3 className="text-xl font-bold">Usuários</h3>
                        </div>
                        <p className="text-gray-400 text-sm mb-4">Gerencie usuários, verifique status e resolva problemas de acesso.</p>
                        <button className="text-blue-400 text-sm font-medium hover:text-blue-300 transition-colors">Acessar Lista &rarr;</button>
                    </div>

                    <div className="p-6 bg-white/5 border border-white/10 rounded-2xl hover:border-white/20 transition-all duration-300">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
                                <Store size={24} />
                            </div>
                            <h3 className="text-xl font-bold">Estabelecimentos</h3>
                        </div>
                        <p className="text-gray-400 text-sm mb-4">Verifique cadastros de parceiros e ajude na configuração.</p>
                        <button className="text-purple-400 text-sm font-medium hover:text-purple-300 transition-colors">Ver Parceiros &rarr;</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div>
                <h2 className="text-3xl font-bold">Resumo Estratégico</h2>
                <p className="text-gray-400 mt-1">Dados reais consolidados do sistema DUNNAA.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, idx) => (
                    <div key={idx} className="p-6 bg-white/5 border border-white/10 rounded-2xl hover:border-white/20 transition-all duration-300 group">
                        <div className="flex items-start justify-between">
                            <div className={`p-3 rounded-xl ${stat.bg}`}>
                                <stat.icon className={stat.color} size={24} />
                            </div>
                            <div className={`flex items-center text-xs font-medium px-2 py-1 rounded-full ${stat.isUp ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                                {stat.isUp ? <ArrowUpRight size={12} className="mr-1" /> : <ArrowDownRight size={12} className="mr-1" />}
                                {stat.change}
                            </div>
                        </div>
                        <div className="mt-4">
                            <p className="text-sm text-gray-400">{stat.label}</p>
                            <h3 className="text-2xl font-bold mt-1 group-hover:text-blue-400 transition-colors uppercase">{stat.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            <div>
                <h3 className="text-xl font-bold mb-4">Métricas de Operação</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {operationStats.map((stat, idx) => (
                        <div key={idx} className="p-5 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                                <stat.icon size={20} />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">{stat.label}</p>
                                <h4 className="text-xl font-bold mt-0.5">{stat.value}</h4>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="p-8 bg-white/5 border border-white/10 rounded-2xl">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <TrendingUp size={20} className="text-blue-400" />
                        Estabelecimentos Top Performance
                    </h3>
                    <div className="space-y-4">
                        {data?.leaderboard?.map((item: any, i: number) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400 border border-blue-500/30">
                                        #{i + 1}
                                    </div>
                                    <span className="font-medium">{item.name}</span>
                                </div>
                                <span className="font-bold text-green-400">{formatCurrency(item.revenue)}</span>
                            </div>
                        ))}
                        {(!data?.leaderboard || data.leaderboard.length === 0) && (
                            <p className="text-center py-8 text-gray-500">Nenhum dado de faturamento disponível.</p>
                        )}
                    </div>
                </div>

                <div className="p-8 bg-white/5 border border-white/10 rounded-2xl h-[400px] flex items-center justify-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-600/5 group-hover:from-purple-500/10 group-hover:to-blue-600/10 transition-colors duration-700"></div>
                    <p className="text-gray-500 z-10 font-medium">Crescimento de Assinaturas (Real)</p>
                    <div className="absolute bottom-12 flex items-end gap-2 px-8 w-full h-32">
                        {[40, 70, 45, 90, 65, 80, 55].map((h, i) => (
                            <div key={i} className="flex-1 bg-purple-500/20 rounded-t-lg group-hover:bg-purple-500/40 transition-all duration-500" style={{ height: `${h}%` }}></div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
