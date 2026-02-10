"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Save, RefreshCcw, Lock, Loader2, Check } from 'lucide-react';

// Categorias retornadas pela API → rótulos em português (ordem de exibição)
const CATEGORY_LABELS: Record<string, string> = {
    general: 'Geral',
    finance: 'Financeiro',
    payments: 'Pagamentos',
    twilio: 'Twilio (SMS + WhatsApp)',
    sms: 'SMS',
    email: 'E-mail',
    push: 'Push',
    whatsapp: 'WhatsApp',
    storage: 'Storage',
    loyalty: 'Fidelidade',
};

const CATEGORY_ORDER = ['general', 'finance', 'payments', 'twilio', 'sms', 'email', 'push', 'whatsapp', 'storage', 'loyalty'];

type SettingItem = { category: string; key: string; value: string; description?: string; is_secret?: boolean };

export default function SettingsPage() {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<string>('general');

    const { data, isLoading } = useQuery({
        queryKey: ['admin-settings'],
        queryFn: async () => {
            const res = await api.get('/admin/settings');
            return res.data;
        }
    });

    const updateMutation = useMutation({
        mutationFn: async ({ key, value }: { key: string, value: string }) => {
            await api.put(`/admin/settings/${key}`, { value });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
        }
    });

    const settings = (data?.items || []) as SettingItem[];
    const categories = useMemo(() => {
        const set = new Set(settings.map((s) => s.category));
        return CATEGORY_ORDER.filter((c) => set.has(c)).concat([...set].filter((c) => !CATEGORY_ORDER.includes(c)));
    }, [settings]);

    const settingsInActiveCategory = useMemo(
        () => settings.filter((s) => s.category === activeTab),
        [settings, activeTab]
    );

    useEffect(() => {
        if (categories.length > 0 && !categories.includes(activeTab)) {
            setActiveTab(categories[0]);
        }
    }, [categories, activeTab]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <div>
                <h2 className="text-3xl font-bold">Configurações do Sistema</h2>
                <p className="text-gray-400 mt-1">Controle global de taxas, integrações e comportamento da plataforma (configuração dinâmica via banco + Redis).</p>
            </div>

            {categories.length > 0 && (
                <div className="flex flex-wrap gap-2 p-1 bg-white/5 rounded-2xl w-fit border border-white/10">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setActiveTab(cat)}
                            className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === cat
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {CATEGORY_LABELS[cat] ?? cat}
                        </button>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-1 gap-6">
                {settingsInActiveCategory.map((setting) => (
                    <SettingCard
                        key={setting.key}
                        setting={setting}
                        onSave={(val) => updateMutation.mutate({ key: setting.key, value: val })}
                    />
                ))}

                {/* Ações especiais para a aba de WhatsApp */}
                {activeTab === 'whatsapp' && (
                    <div className="p-6 bg-blue-500/5 border border-blue-500/20 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="space-y-1">
                            <h3 className="text-sm font-semibold text-blue-200">Vincular novo WhatsApp (Bridge)</h3>
                            <p className="text-xs sm:text-sm text-blue-100/80 max-w-xl">
                                Use o módulo de WhatsApp Bridge para escanear um novo QR Code, trocar o número vinculado
                                ou, futuramente, adicionar canais separados (suporte, códigos, notificações).
                            </p>
                        </div>
                        <Link
                            href="/admin/whatsapp-bridge"
                            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
                        >
                            Abrir WhatsApp Bridge
                        </Link>
                    </div>
                )}

                {categories.length > 0 && settingsInActiveCategory.length === 0 && (
                    <p className="text-gray-500 text-sm">Nenhuma configuração nesta categoria.</p>
                )}

                {settings.length === 0 && (
                    <div className="p-12 border border-dashed border-white/10 rounded-2xl text-center">
                        <button
                            onClick={() => api.post('/admin/settings/seed-defaults').then(() => queryClient.invalidateQueries({ queryKey: ['admin-settings'] }))}
                            className="flex items-center gap-2 mx-auto bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-xl transition-all font-semibold"
                        >
                            <RefreshCcw size={18} />
                            Inicializar Configurações Padrão
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

function SettingCard({ setting, onSave }: { setting: any, onSave: (val: string) => void }) {
    const [val, setVal] = useState(setting.value);
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        onSave(val);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl group hover:border-white/20 transition-all">
            <div className="flex items-start justify-between gap-8">
                <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                        <h4 className="font-mono text-sm font-bold text-blue-400 uppercase tracking-tight">{setting.key}</h4>
                        {setting.is_secret && <Lock size={12} className="text-gray-500" />}
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed">{setting.description || 'Nenhuma descrição fornecida.'}</p>
                </div>

                <div className="flex items-center gap-3 w-72">
                    <input
                        type={setting.is_secret ? "password" : "text"}
                        value={val}
                        onChange={(e) => setVal(e.target.value)}
                        className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    />
                    <button
                        onClick={handleSave}
                        className={`p-2.5 rounded-xl transition-all ${saved ? 'bg-green-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                            }`}
                    >
                        {saved ? <Check size={18} /> : <Save size={18} />}
                    </button>
                </div>
            </div>
        </div>
    );
}
