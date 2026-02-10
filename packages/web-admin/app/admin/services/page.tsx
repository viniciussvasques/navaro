'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
    Scissors,
    Clock,
    DollarSign,
    Store,
    Loader2,
    Search,
    Home,
    CreditCard,
    CheckCircle,
    XCircle
} from 'lucide-react';

const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

export default function ServicesPage() {
    const [search, setSearch] = React.useState('');
    const [filterActive, setFilterActive] = React.useState<boolean | null>(null);

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
                    <h2 className="text-3xl font-bold">Catálogo de Serviços</h2>
                    <p className="text-gray-400 mt-1">Visualize todos os serviços oferecidos na plataforma.</p>
                </div>
                <div className="flex gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors group-focus-within:text-blue-500" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar serviço..."
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
                        <CheckCircle size={16} />
                        Ativos
                    </button>
                    <button
                        onClick={() => setFilterActive(filterActive === false ? null : false)}
                        className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all flex items-center gap-2 ${filterActive === false
                            ? 'bg-red-500/20 border-red-500/30 text-red-400'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                            }`}
                    >
                        <XCircle size={16} />
                        Inativos
                    </button>
                </div>
            </div>

            {/* Services by Establishment */}
            <div className="space-y-6">
                {establishments?.items?.map((est: any) => (
                    <EstablishmentServicesCard
                        key={est.id}
                        establishment={est}
                        search={search}
                        filterActive={filterActive}
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

function EstablishmentServicesCard({
    establishment,
    search,
    filterActive
}: {
    establishment: any;
    search: string;
    filterActive: boolean | null;
}) {
    const { data: servicesData, isLoading } = useQuery({
        queryKey: ['services', establishment.id],
        queryFn: async () => {
            const res = await api.get(`/establishments/${establishment.id}/services?active_only=false`);
            return res.data || [];
        }
    });

    const filteredServices = React.useMemo(() => {
        let services = servicesData || [];

        if (search) {
            services = services.filter((s: any) =>
                s.name?.toLowerCase().includes(search.toLowerCase()) ||
                s.description?.toLowerCase().includes(search.toLowerCase())
            );
        }

        if (filterActive !== null) {
            services = services.filter((s: any) => s.active === filterActive);
        }

        return services;
    }, [servicesData, search, filterActive]);

    if (isLoading) {
        return (
            <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-purple-600/20 rounded-xl flex items-center justify-center">
                        <Store className="text-purple-400" size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold">{establishment.name}</h3>
                        <p className="text-xs text-gray-500">Carregando serviços...</p>
                    </div>
                </div>
                <div className="flex justify-center py-8">
                    <Loader2 className="animate-spin text-gray-600" size={24} />
                </div>
            </div>
        );
    }

    if (filteredServices.length === 0 && !search && filterActive === null) {
        return null;
    }

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-600/20 rounded-xl flex items-center justify-center border border-purple-500/20">
                        <Store className="text-purple-400" size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold">{establishment.name}</h3>
                        <p className="text-xs text-gray-500">{establishment.city}, {establishment.state}</p>
                    </div>
                </div>
                <span className="text-xs font-bold uppercase py-1 px-3 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full">
                    {filteredServices.length} serviços
                </span>
            </div>

            {filteredServices.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                    {filteredServices.map((service: any) => (
                        <div
                            key={service.id}
                            className={`p-4 rounded-xl border transition-all ${service.active
                                ? 'bg-white/[0.02] border-white/10 hover:border-white/20'
                                : 'bg-red-500/5 border-red-500/10'
                                }`}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${service.active ? 'bg-purple-500/20' : 'bg-gray-500/20'
                                        }`}>
                                        <Scissors size={16} className={service.active ? 'text-purple-400' : 'text-gray-500'} />
                                    </div>
                                    <h4 className="font-semibold text-sm">{service.name}</h4>
                                </div>
                                {!service.active && (
                                    <span className="text-[9px] font-bold uppercase py-0.5 px-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded">
                                        Inativo
                                    </span>
                                )}
                            </div>

                            {service.description && (
                                <p className="text-xs text-gray-500 mb-3 line-clamp-2">{service.description}</p>
                            )}

                            <div className="flex items-center gap-4 text-xs">
                                <div className="flex items-center gap-1 text-green-400">
                                    <DollarSign size={12} />
                                    <span className="font-bold">{formatCurrency(service.price)}</span>
                                </div>
                                <div className="flex items-center gap-1 text-gray-400">
                                    <Clock size={12} />
                                    <span>{service.duration_minutes}min</span>
                                </div>
                            </div>

                            <div className="flex gap-2 mt-3">
                                {service.is_at_home && (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase py-0.5 px-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">
                                        <Home size={10} /> Domicílio
                                    </span>
                                )}
                                {service.deposit_required && (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase py-0.5 px-1.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded">
                                        <CreditCard size={10} /> Sinal
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="p-8 text-center text-gray-500 text-sm">
                    {search || filterActive !== null
                        ? 'Nenhum serviço encontrado com os filtros aplicados.'
                        : 'Nenhum serviço cadastrado neste estabelecimento.'}
                </div>
            )}
        </div>
    );
}
