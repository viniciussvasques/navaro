'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
    Users,
    Briefcase,
    Phone,
    Store,
    Loader2,
    Search,
    Filter,
    UserCheck,
    UserX
} from 'lucide-react';

export default function StaffPage() {
    const [search, setSearch] = React.useState('');
    const [filterActive, setFilterActive] = React.useState<boolean | null>(null);

    // Fetch all establishments first, then get staff from each
    const { data: establishments, isLoading: loadingEst } = useQuery({
        queryKey: ['admin-establishments'],
        queryFn: async () => {
            const res = await api.get('/admin/establishments');
            return res.data;
        }
    });

    // For simplicity, we'll show establishments with their staff counts
    // A full implementation would aggregate staff across all establishments

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
                    <h2 className="text-3xl font-bold">Gestão de Profissionais</h2>
                    <p className="text-gray-400 mt-1">Visualize e gerencie profissionais de todos os estabelecimentos.</p>
                </div>
                <div className="flex gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors group-focus-within:text-blue-500" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar por nome..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm w-64"
                        />
                    </div>
                    <button
                        onClick={() => setFilterActive(filterActive === true ? null : true)}
                        className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all flex items-center gap-2 ${filterActive === true
                            ? 'bg-green-500/20 border-green-500/30 text-green-400'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                            }`}
                    >
                        <UserCheck size={16} />
                        Ativos
                    </button>
                    <button
                        onClick={() => setFilterActive(filterActive === false ? null : false)}
                        className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all flex items-center gap-2 ${filterActive === false
                            ? 'bg-red-500/20 border-red-500/30 text-red-400'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                            }`}
                    >
                        <UserX size={16} />
                        Inativos
                    </button>
                </div>
            </div>

            {/* Staff by Establishment */}
            <div className="space-y-6">
                {establishments?.items?.map((est: any) => (
                    <EstablishmentStaffCard key={est.id} establishment={est} search={search} filterActive={filterActive} />
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

function EstablishmentStaffCard({
    establishment,
    search,
    filterActive
}: {
    establishment: any;
    search: string;
    filterActive: boolean | null;
}) {
    const { data: staffData, isLoading } = useQuery({
        queryKey: ['staff', establishment.id],
        queryFn: async () => {
            const res = await api.get(`/establishments/${establishment.id}/staff`);
            return res.data || [];
        }
    });

    const filteredStaff = React.useMemo(() => {
        let staff = staffData || [];

        if (search) {
            staff = staff.filter((s: any) =>
                s.name?.toLowerCase().includes(search.toLowerCase())
            );
        }

        if (filterActive !== null) {
            staff = staff.filter((s: any) => s.active === filterActive);
        }

        return staff;
    }, [staffData, search, filterActive]);

    if (isLoading) {
        return (
            <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center">
                        <Store className="text-blue-400" size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold">{establishment.name}</h3>
                        <p className="text-xs text-gray-500">Carregando profissionais...</p>
                    </div>
                </div>
                <div className="flex justify-center py-8">
                    <Loader2 className="animate-spin text-gray-600" size={24} />
                </div>
            </div>
        );
    }

    if (filteredStaff.length === 0 && !search && filterActive === null) {
        return null; // Hide establishments with no staff
    }

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center border border-blue-500/20">
                        <Store className="text-blue-400" size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold">{establishment.name}</h3>
                        <p className="text-xs text-gray-500">{establishment.city}, {establishment.state}</p>
                    </div>
                </div>
                <span className="text-xs font-bold uppercase py-1 px-3 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">
                    {filteredStaff.length} profissionais
                </span>
            </div>

            {filteredStaff.length > 0 ? (
                <table className="w-full text-left">
                    <thead className="bg-white/5 text-gray-400 text-[10px] uppercase font-bold tracking-widest">
                        <tr>
                            <th className="px-6 py-3">Profissional</th>
                            <th className="px-6 py-3">Função</th>
                            <th className="px-6 py-3">Contato</th>
                            <th className="px-6 py-3">Contrato</th>
                            <th className="px-6 py-3">Comissão</th>
                            <th className="px-6 py-3">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 text-sm">
                        {filteredStaff.map((staff: any) => (
                            <tr key={staff.id} className="hover:bg-white/[0.02] transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-blue-600 flex items-center justify-center text-xs font-bold">
                                            {staff.name?.substring(0, 2).toUpperCase()}
                                        </div>
                                        <span className="font-medium">{staff.name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <Briefcase size={14} className="text-purple-400/50" />
                                        <span className="capitalize">{staff.role}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <Phone size={14} className="text-blue-400/50" />
                                        <span>{staff.phone || '—'}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-xs font-bold uppercase py-1 px-2 bg-gray-500/10 text-gray-400 border border-gray-500/20 rounded-md">
                                        {staff.contract_type}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="font-mono text-green-400">
                                        {staff.commission_rate ? `${staff.commission_rate}%` : '—'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`text-[10px] font-bold uppercase py-1 px-2 border rounded-full ${staff.active
                                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                                        }`}>
                                        {staff.active ? 'Ativo' : 'Inativo'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <div className="p-8 text-center text-gray-500 text-sm">
                    {search || filterActive !== null
                        ? 'Nenhum profissional encontrado com os filtros aplicados.'
                        : 'Nenhum profissional cadastrado neste estabelecimento.'}
                </div>
            )}
        </div>
    );
}
