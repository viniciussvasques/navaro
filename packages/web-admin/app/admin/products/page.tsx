'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
    Package,
    DollarSign,
    Store,
    Loader2,
    Search,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Box
} from 'lucide-react';

const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

export default function ProductsPage() {
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
                    <h2 className="text-3xl font-bold">Catálogo de Produtos</h2>
                    <p className="text-gray-400 mt-1">Visualize todos os produtos vendidos na plataforma.</p>
                </div>
                <div className="flex gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors group-focus-within:text-blue-500" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar produto..."
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

            {/* Products by Establishment */}
            <div className="space-y-6">
                {establishments?.items?.map((est: any) => (
                    <EstablishmentProductsCard
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

function EstablishmentProductsCard({
    establishment,
    search,
    filterActive
}: {
    establishment: any;
    search: string;
    filterActive: boolean | null;
}) {
    const { data: productsData, isLoading } = useQuery({
        queryKey: ['products', establishment.id],
        queryFn: async () => {
            try {
                const res = await api.get(`/establishments/${establishment.id}/products?active_only=false`);
                return res.data?.items || [];
            } catch {
                return [];
            }
        }
    });

    const filteredProducts = React.useMemo(() => {
        let products = productsData || [];

        if (search) {
            products = products.filter((p: any) =>
                p.name?.toLowerCase().includes(search.toLowerCase()) ||
                p.description?.toLowerCase().includes(search.toLowerCase())
            );
        }

        if (filterActive !== null) {
            products = products.filter((p: any) => p.active === filterActive);
        }

        return products;
    }, [productsData, search, filterActive]);

    if (isLoading) {
        return (
            <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-amber-600/20 rounded-xl flex items-center justify-center">
                        <Store className="text-amber-400" size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold">{establishment.name}</h3>
                        <p className="text-xs text-gray-500">Carregando produtos...</p>
                    </div>
                </div>
                <div className="flex justify-center py-8">
                    <Loader2 className="animate-spin text-gray-600" size={24} />
                </div>
            </div>
        );
    }

    if (filteredProducts.length === 0 && !search && filterActive === null) {
        return null;
    }

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-600/20 rounded-xl flex items-center justify-center border border-amber-500/20">
                        <Store className="text-amber-400" size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold">{establishment.name}</h3>
                        <p className="text-xs text-gray-500">{establishment.city}, {establishment.state}</p>
                    </div>
                </div>
                <span className="text-xs font-bold uppercase py-1 px-3 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full">
                    {filteredProducts.length} produtos
                </span>
            </div>

            {filteredProducts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
                    {filteredProducts.map((product: any) => (
                        <div
                            key={product.id}
                            className={`p-4 rounded-xl border transition-all ${product.active
                                ? 'bg-white/[0.02] border-white/10 hover:border-white/20'
                                : 'bg-red-500/5 border-red-500/10'
                                }`}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${product.active ? 'bg-amber-500/20' : 'bg-gray-500/20'
                                        }`}>
                                        <Package size={16} className={product.active ? 'text-amber-400' : 'text-gray-500'} />
                                    </div>
                                    <h4 className="font-semibold text-sm line-clamp-1">{product.name}</h4>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="font-mono text-green-400 font-bold">
                                    {formatCurrency(product.price)}
                                </span>

                                {product.stock !== undefined && (
                                    <div className={`flex items-center gap-1 text-xs ${product.stock <= 5 ? 'text-orange-400' : 'text-gray-500'
                                        }`}>
                                        <Box size={12} />
                                        <span>{product.stock} em estoque</span>
                                        {product.stock <= 5 && (
                                            <AlertTriangle size={12} className="text-orange-400" />
                                        )}
                                    </div>
                                )}
                            </div>

                            {!product.active && (
                                <span className="inline-block mt-2 text-[9px] font-bold uppercase py-0.5 px-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded">
                                    Inativo
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="p-8 text-center text-gray-500 text-sm">
                    {search || filterActive !== null
                        ? 'Nenhum produto encontrado com os filtros aplicados.'
                        : 'Nenhum produto cadastrado neste estabelecimento.'}
                </div>
            )}
        </div>
    );
}
