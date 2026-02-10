'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
    Calendar,
    Clock,
    User,
    Store,
    Loader2,
    CheckCircle,
    XCircle,
    Clock3,
    CalendarDays,
    Filter
} from 'lucide-react';

const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
};

const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    });
};

export default function AppointmentsPage() {
    const [statusFilter, setStatusFilter] = React.useState<string | null>(null);
    const [dateRange, setDateRange] = React.useState('today');

    const { data: establishments, isLoading: loadingEst } = useQuery({
        queryKey: ['admin-establishments'],
        queryFn: async () => {
            const res = await api.get('/admin/establishments');
            return res.data;
        }
    });

    if (loadingEst) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold">Agendamentos</h2>
                    <p className="text-gray-400 mt-1">Visualize todos os agendamentos da plataforma.</p>
                </div>
                <div className="flex gap-3">
                    {/* Date Range Filter */}
                    <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/10">
                        {[
                            { key: 'today', label: 'Hoje' },
                            { key: 'week', label: 'Semana' },
                            { key: 'month', label: 'Mês' },
                        ].map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => setDateRange(key)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${dateRange === key
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Status Filter */}
                    <div className="flex gap-2">
                        {[
                            { key: 'confirmed', label: 'Confirmados', color: 'green' },
                            { key: 'pending', label: 'Pendentes', color: 'orange' },
                            { key: 'cancelled', label: 'Cancelados', color: 'red' },
                        ].map(({ key, label, color }) => (
                            <button
                                key={key}
                                onClick={() => setStatusFilter(statusFilter === key ? null : key)}
                                className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${statusFilter === key
                                    ? `bg-${color}-500/20 border-${color}-500/30 text-${color}-400`
                                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    label="Agendamentos Hoje"
                    value="—"
                    icon={CalendarDays}
                    color="text-blue-400"
                    bg="bg-blue-500/10"
                />
                <StatCard
                    label="Confirmados"
                    value="—"
                    icon={CheckCircle}
                    color="text-green-400"
                    bg="bg-green-500/10"
                />
                <StatCard
                    label="Pendentes"
                    value="—"
                    icon={Clock3}
                    color="text-orange-400"
                    bg="bg-orange-500/10"
                />
                <StatCard
                    label="Cancelados"
                    value="—"
                    icon={XCircle}
                    color="text-red-400"
                    bg="bg-red-500/10"
                />
            </div>

            {/* Appointments by Establishment */}
            <div className="space-y-6">
                {establishments?.items?.map((est: any) => (
                    <EstablishmentAppointmentsCard
                        key={est.id}
                        establishment={est}
                        statusFilter={statusFilter}
                        dateRange={dateRange}
                    />
                ))}

                {(!establishments?.items || establishments.items.length === 0) && (
                    <div className="p-16 bg-white/5 border border-white/10 rounded-2xl text-center">
                        <Store className="mx-auto text-gray-600 mb-4" size={48} />
                        <p className="text-gray-400">Nenhum estabelecimento cadastrado ainda.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({ label, value, icon: Icon, color, bg }: any) {
    return (
        <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${bg}`}>
                    <Icon size={16} className={color} />
                </div>
                <div>
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">{label}</p>
                    <p className="text-xl font-bold">{value}</p>
                </div>
            </div>
        </div>
    );
}

function EstablishmentAppointmentsCard({
    establishment,
    statusFilter,
    dateRange
}: {
    establishment: any;
    statusFilter: string | null;
    dateRange: string;
}) {
    const { data: appointmentsData, isLoading } = useQuery({
        queryKey: ['appointments', establishment.id, dateRange],
        queryFn: async () => {
            // The API might not have a global appointments endpoint
            // This is a placeholder - in reality you'd fetch from establishment appointments
            try {
                const res = await api.get(`/appointments/establishments/${establishment.id}`);
                return res.data || [];
            } catch {
                return [];
            }
        }
    });

    const filteredAppointments = React.useMemo(() => {
        let appointments = appointmentsData || [];

        if (statusFilter) {
            appointments = appointments.filter((a: any) => a.status === statusFilter);
        }

        return appointments;
    }, [appointmentsData, statusFilter]);

    if (isLoading) {
        return (
            <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-green-600/20 rounded-xl flex items-center justify-center">
                        <Store className="text-green-400" size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold">{establishment.name}</h3>
                        <p className="text-xs text-gray-500">Carregando agendamentos...</p>
                    </div>
                </div>
                <div className="flex justify-center py-8">
                    <Loader2 className="animate-spin text-gray-600" size={24} />
                </div>
            </div>
        );
    }

    if (filteredAppointments.length === 0 && !statusFilter) {
        return null;
    }

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-600/20 rounded-xl flex items-center justify-center border border-green-500/20">
                        <Store className="text-green-400" size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold">{establishment.name}</h3>
                        <p className="text-xs text-gray-500">{establishment.city}, {establishment.state}</p>
                    </div>
                </div>
                <span className="text-xs font-bold uppercase py-1 px-3 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full">
                    {filteredAppointments.length} agendamentos
                </span>
            </div>

            {filteredAppointments.length > 0 ? (
                <table className="w-full text-left">
                    <thead className="bg-white/5 text-gray-400 text-[10px] uppercase font-bold tracking-widest">
                        <tr>
                            <th className="px-6 py-3">Data/Hora</th>
                            <th className="px-6 py-3">Cliente</th>
                            <th className="px-6 py-3">Serviço</th>
                            <th className="px-6 py-3">Profissional</th>
                            <th className="px-6 py-3">Valor</th>
                            <th className="px-6 py-3">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 text-sm">
                        {filteredAppointments.map((apt: any) => (
                            <tr key={apt.id} className="hover:bg-white/[0.02] transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <Calendar size={14} className="text-blue-400/50" />
                                        <div>
                                            <p className="font-medium">{formatDate(apt.start_time)}</p>
                                            <p className="text-xs text-gray-500">{formatTime(apt.start_time)}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <User size={14} className="text-purple-400/50" />
                                        <span>{apt.customer_name || 'Cliente'}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-gray-400">
                                    {apt.service_name || 'Serviço'}
                                </td>
                                <td className="px-6 py-4 text-gray-400">
                                    {apt.staff_name || 'Profissional'}
                                </td>
                                <td className="px-6 py-4 font-mono text-green-400">
                                    {formatCurrency(apt.total_price || 0)}
                                </td>
                                <td className="px-6 py-4">
                                    <StatusBadge status={apt.status} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <div className="p-8 text-center text-gray-500 text-sm">
                    {statusFilter
                        ? 'Nenhum agendamento encontrado com o filtro aplicado.'
                        : 'Nenhum agendamento registrado.'}
                </div>
            )}
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        confirmed: "bg-green-500/10 text-green-400 border-green-500/20",
        pending: "bg-orange-500/10 text-orange-400 border-orange-500/20",
        cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
        completed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    };

    const labels: Record<string, string> = {
        confirmed: 'Confirmado',
        pending: 'Pendente',
        cancelled: 'Cancelado',
        completed: 'Concluído',
    };

    return (
        <span className={`text-[10px] font-bold uppercase py-1 px-2 border rounded-full ${styles[status] || styles.pending}`}>
            {labels[status] || status}
        </span>
    );
}
