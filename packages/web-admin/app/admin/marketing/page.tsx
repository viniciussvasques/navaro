"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
    Megaphone, Tag, TrendingUp, Store, Loader2, MousePointerClick, Eye, Plus, Zap,
} from "lucide-react";

const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

const PLACEMENTS = [
    { value: "search_top", label: "Topo da busca" },
    { value: "search_list", label: "Lista patrocinada" },
    { value: "map_pin", label: "Mapa" },
];

type MarketingData = {
    active_promotions: number;
    active_campaigns: number;
    sponsored_establishments: number;
    promotions: Array<{
        id: string;
        establishment_name: string;
        title: string;
        discount_percent: number | null;
        discount_fixed: number | null;
        starts_at: string;
        ends_at: string;
        active: boolean;
    }>;
    campaigns: Array<{
        id: string;
        establishment_id: string;
        establishment_name: string;
        name: string | null;
        budget_daily: number;
        budget_total: number | null;
        spent_today: number;
        total_spent: number;
        impressions: number;
        clicks: number;
        active: boolean;
        status: string;
        placement: string;
        priority: number;
        target_radius_km: number;
        target_cities: string[];
        start_date: string;
        end_date: string | null;
    }>;
};

const defaultForm = {
    estId: "",
    campaignName: "",
    budgetDaily: "29.90",
    budgetTotal: "",
    targetRadiusKm: "15",
    placement: "search_top",
    priority: "10",
    costPerImpression: "0.05",
    cities: "",
    endDate: "",
};

export default function MarketingPage() {
    const queryClient = useQueryClient();
    const [showForm, setShowForm] = React.useState(false);
    const [form, setForm] = React.useState(defaultForm);
    const [formError, setFormError] = React.useState<string | null>(null);

    const { data, isLoading, isError } = useQuery({
        queryKey: ["admin-marketing"],
        queryFn: async () => {
            const res = await api.get("/admin/marketing/overview");
            return res.data as MarketingData;
        },
    });

    const { data: establishments } = useQuery({
        queryKey: ["admin-establishments-marketing"],
        queryFn: async () => {
            const res = await api.get("/admin/establishments");
            return (res.data?.items || []) as Array<{ id: string; name: string }>;
        },
    });

    const createCampaign = useMutation({
        mutationFn: async () => {
            const today = new Date().toISOString().slice(0, 10);
            await api.post("/admin/marketing/campaigns", {
                establishment_id: form.estId,
                name: form.campaignName || undefined,
                budget_daily: Number(form.budgetDaily),
                budget_total: form.budgetTotal ? Number(form.budgetTotal) : null,
                start_date: today,
                end_date: form.endDate || null,
                placement: form.placement,
                priority: Number(form.priority),
                target_radius_km: Number(form.targetRadiusKm),
                cost_per_impression: Number(form.costPerImpression),
                target_cities: form.cities
                    ? form.cities.split(",").map((c) => c.trim()).filter(Boolean)
                    : [],
                audience: { gender: "all", new_customers_only: false, categories: [] },
                active: true,
            });
        },
        onSuccess: () => {
            setFormError(null);
            setShowForm(false);
            setForm(defaultForm);
            queryClient.invalidateQueries({ queryKey: ["admin-marketing"] });
        },
        onError: (err: any) => {
            const msg = err.response?.data?.detail?.message || err.response?.data?.detail || "Erro ao criar destaque.";
            setFormError(typeof msg === "string" ? msg : "Erro ao criar destaque.");
        },
    });

    const toggleCampaign = useMutation({
        mutationFn: ({ id, active }: { id: string; active: boolean }) =>
            api.patch(`/admin/marketing/campaigns/${id}`, {
                active,
                status: active ? "active" : "paused",
            }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-marketing"] }),
    });

    if (isLoading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
            </div>
        );
    }

    if (isError || !data) {
        return (
            <div className="text-center py-20 text-red-400">
                Não foi possível carregar dados de marketing.
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Megaphone className="h-7 w-7 text-pink-400" />
                        Destaques & Monetização
                    </h1>
                    <p className="text-slate-400 mt-1 max-w-2xl">
                        Dois produtos: <strong className="text-white">Plano SaaS</strong> (comissão menor por tier) e{" "}
                        <strong className="text-white">Destaque patrocinado</strong> (impressões no topo da busca).
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setShowForm((v) => !v)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-pink-600/20 border border-pink-500/30 rounded-xl text-pink-300 hover:bg-pink-600/30 text-sm font-medium"
                >
                    <Plus className="h-4 w-4" />
                    Novo destaque
                </button>
            </div>

            <div className="bg-gradient-to-r from-pink-500/10 to-amber-500/10 border border-pink-500/20 rounded-2xl p-5">
                <div className="flex items-start gap-3">
                    <Zap className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-sm text-slate-300 space-y-2">
                        <p className="font-semibold text-white">Como funciona o destaque (recomendado vs. assinatura)</p>
                        <ul className="list-disc pl-5 space-y-1 text-slate-400">
                            <li>
                                <strong className="text-slate-200">Assinatura SaaS</strong> — reduz comissão da plataforma
                                (Bronze/Prata/Ouro). Não garante posição no topo.
                            </li>
                            <li>
                                <strong className="text-slate-200">Destaque patrocinado</strong> — orçamento diário; cobrança
                                por impressão na busca; até <strong className="text-amber-300">4 slots premium</strong> no topo
                                (modelo Fresha/Booksy Ads).
                            </li>
                            <li>Promoções com desconto são complementares — não substituem o destaque visual.</li>
                        </ul>
                    </div>
                </div>
            </div>

            {showForm && (
                <div className="bg-slate-800/50 border border-slate-600 rounded-2xl p-5 space-y-4">
                    <h3 className="text-white font-semibold">Ativar destaque para estabelecimento</h3>
                    {formError && (
                        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                            {formError}
                        </p>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">Estabelecimento</label>
                            <select
                                value={form.estId}
                                onChange={(e) => setForm({ ...form, estId: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                            >
                                <option value="">Selecione...</option>
                                {(establishments || []).map((e) => (
                                    <option key={e.id} value={e.id}>
                                        {e.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">Orçamento diário (R$)</label>
                            <input
                                type="number"
                                min="1"
                                step="0.01"
                                value={form.budgetDaily}
                                onChange={(e) => setForm({ ...form, budgetDaily: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">Teto total (opcional)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.budgetTotal}
                                onChange={(e) => setForm({ ...form, budgetTotal: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">Nome da campanha (opcional)</label>
                            <input
                                type="text"
                                value={form.campaignName}
                                onChange={(e) => setForm({ ...form, campaignName: e.target.value })}
                                placeholder="Ex: Destaque verão"
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">Posição</label>
                            <select
                                value={form.placement}
                                onChange={(e) => setForm({ ...form, placement: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                            >
                                {PLACEMENTS.map((p) => (
                                    <option key={p.value} value={p.value}>
                                        {p.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">Raio de cobertura (km)</label>
                            <input
                                type="number"
                                min="1"
                                max="100"
                                value={form.targetRadiusKm}
                                onChange={(e) => setForm({ ...form, targetRadiusKm: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">Prioridade (0–100)</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={form.priority}
                                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">Custo/impressão (R$)</label>
                            <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={form.costPerImpression}
                                onChange={(e) => setForm({ ...form, costPerImpression: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">Cidades alvo (opcional)</label>
                            <input
                                type="text"
                                placeholder="São Paulo, Campinas"
                                value={form.cities}
                                onChange={(e) => setForm({ ...form, cities: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">Data fim (opcional)</label>
                            <input
                                type="date"
                                value={form.endDate}
                                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            disabled={!form.estId || createCampaign.isPending}
                            onClick={() => createCampaign.mutate()}
                            className="px-4 py-2 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
                        >
                            {createCampaign.isPending ? "Criando..." : "Ativar destaque"}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowForm(false)}
                            className="px-4 py-2 text-slate-400 hover:text-white text-sm"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard label="Promoções ativas" value={data.active_promotions} icon={Tag} color="text-amber-400" />
                <StatCard label="Campanhas de destaque" value={data.active_campaigns} icon={TrendingUp} color="text-blue-400" />
                <StatCard label="No topo da busca" value={data.sponsored_establishments} icon={Store} color="text-emerald-400" />
            </div>

            <section className="space-y-4">
                <h2 className="text-lg font-semibold text-white">Campanhas de destaque (impulsionamento)</h2>
                {data.campaigns.length === 0 ? (
                    <p className="text-slate-500 text-sm">Nenhuma campanha. Crie um destaque acima.</p>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-700">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-800/80 text-slate-400 text-xs uppercase">
                                <tr>
                                    <th className="px-4 py-3">Estabelecimento</th>
                                    <th className="px-4 py-3">Campanha</th>
                                    <th className="px-4 py-3">Posição</th>
                                    <th className="px-4 py-3">Cobertura</th>
                                    <th className="px-4 py-3">Orçamento/dia</th>
                                    <th className="px-4 py-3">Gasto hoje</th>
                                    <th className="px-4 py-3">Total</th>
                                    <th className="px-4 py-3"><Eye className="inline h-3 w-3 mr-1" />Impressões</th>
                                    <th className="px-4 py-3"><MousePointerClick className="inline h-3 w-3 mr-1" />Cliques</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {data.campaigns.map((c) => (
                                    <tr key={c.id} className="hover:bg-slate-800/40">
                                        <td className="px-4 py-3 text-white">{c.establishment_name}</td>
                                        <td className="px-4 py-3">{c.name || "Campanha"}</td>
                                        <td className="px-4 py-3 text-slate-300">
                                            {PLACEMENTS.find((p) => p.value === c.placement)?.label ?? c.placement}
                                            <span className="text-slate-500 text-xs block">P{c.priority}</span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-300 text-xs">
                                            {c.target_radius_km} km
                                            {c.target_cities?.length ? (
                                                <span className="block text-slate-500">{c.target_cities.join(", ")}</span>
                                            ) : null}
                                        </td>
                                        <td className="px-4 py-3">{formatCurrency(c.budget_daily)}</td>
                                        <td className="px-4 py-3">{formatCurrency(c.spent_today)}</td>
                                        <td className="px-4 py-3">{formatCurrency(c.total_spent)}</td>
                                        <td className="px-4 py-3">{c.impressions.toLocaleString("pt-BR")}</td>
                                        <td className="px-4 py-3">{c.clicks.toLocaleString("pt-BR")}</td>
                                        <td className="px-4 py-3">
                                            <CampaignStatus active={c.active} status={c.status} />
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                type="button"
                                                disabled={toggleCampaign.isPending || c.status === "exhausted"}
                                                onClick={() => toggleCampaign.mutate({ id: c.id, active: !c.active })}
                                                className={`text-xs px-2 py-1 rounded-lg border ${
                                                    c.active
                                                        ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
                                                        : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                                                }`}
                                            >
                                                {c.active ? "Pausar" : "Ativar"}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <section className="space-y-4">
                <h2 className="text-lg font-semibold text-white">Promoções com desconto</h2>
                {data.promotions.length === 0 ? (
                    <p className="text-slate-500 text-sm">Nenhuma promoção cadastrada (criadas pelo estabelecimento no Pro).</p>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-700">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-800/80 text-slate-400 text-xs uppercase">
                                <tr>
                                    <th className="px-4 py-3">Estabelecimento</th>
                                    <th className="px-4 py-3">Título</th>
                                    <th className="px-4 py-3">Desconto</th>
                                    <th className="px-4 py-3">Período</th>
                                    <th className="px-4 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {data.promotions.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-800/40">
                                        <td className="px-4 py-3 text-white">{p.establishment_name}</td>
                                        <td className="px-4 py-3">{p.title}</td>
                                        <td className="px-4 py-3 text-emerald-400">
                                            {p.discount_percent != null
                                                ? `${p.discount_percent}%`
                                                : p.discount_fixed != null
                                                  ? formatCurrency(p.discount_fixed)
                                                  : "—"}
                                        </td>
                                        <td className="px-4 py-3 text-slate-400 text-xs">
                                            {formatDate(p.starts_at)} — {formatDate(p.ends_at)}
                                        </td>
                                        <td className="px-4 py-3"><Badge active={p.active} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}

function StatCard({
    label,
    value,
    icon: Icon,
    color,
}: {
    label: string;
    value: number;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
}) {
    return (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                <Icon className={`h-4 w-4 ${color}`} />
                {label}
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
        </div>
    );
}

function Badge({ active }: { active: boolean }) {
    return (
        <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                active ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-600/30 text-slate-400"
            }`}
        >
            {active ? "Ativo" : "Inativo"}
        </span>
    );
}

function CampaignStatus({ active, status }: { active: boolean; status: string }) {
    if (status === "exhausted") {
        return (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                Orçamento esgotado
            </span>
        );
    }
    return <Badge active={active && status === "active"} />;
}
