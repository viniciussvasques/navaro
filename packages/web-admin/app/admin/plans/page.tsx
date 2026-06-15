"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Crown,
  Loader2,
  Save,
  Check,
  Star,
  Building2,
  Percent,
  AlertCircle,
} from "lucide-react";

const TIERS = [
  {
    key: "free",
    name: "Free",
    description: "Plano gratuito com taxa por servico. Padrao para novos estabelecimentos.",
    color: "text-gray-400",
    bg: "bg-gray-500/10 border-gray-500/20",
    settingsKey: "commission_free",
    defaultFee: "6",
  },
  {
    key: "bronze",
    name: "Bronze",
    description: "Taxa reduzida. Ideal para estabelecimentos iniciantes.",
    color: "text-amber-600",
    bg: "bg-amber-500/10 border-amber-500/20",
    settingsKey: "commission_bronze",
    defaultFee: "5",
  },
  {
    key: "silver",
    name: "Silver",
    description: "Taxa competitiva para estabelecimentos em crescimento.",
    color: "text-slate-300",
    bg: "bg-slate-400/10 border-slate-400/20",
    settingsKey: "commission_silver",
    defaultFee: "4",
  },
  {
    key: "gold",
    name: "Gold",
    description: "Taxa premium. Para estabelecimentos consolidados.",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10 border-yellow-500/20",
    settingsKey: "commission_gold",
    defaultFee: "3",
  },
  {
    key: "platinum",
    name: "Platinum",
    description: "Melhor taxa da plataforma. Para grandes redes.",
    color: "text-cyan-300",
    bg: "bg-cyan-500/10 border-cyan-500/20",
    settingsKey: "commission_platinum",
    defaultFee: "2",
  },
];

export default function PlansPage() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch current commission settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const res = await api.get("/admin/settings");
      const items = res.data?.items || [];
      const map: Record<string, string> = {};
      items.forEach((s: any) => {
        map[s.key] = s.value;
      });
      return map;
    },
  });

  // Fetch establishment counts per tier
  const { data: tierCounts } = useQuery({
    queryKey: ["tier-counts"],
    queryFn: async () => {
      try {
        const res = await api.get("/admin/establishments");
        const items = res.data?.items || [];
        const counts: Record<string, number> = {};
        items.forEach((est: any) => {
          const tier = est.subscription_tier || "free";
          counts[tier] = (counts[tier] || 0) + 1;
        });
        return counts;
      } catch {
        return {};
      }
    },
  });

  const [fees, setFees] = useState<Record<string, string>>({});

  // Initialize fees from settings
  React.useEffect(() => {
    if (settings) {
      const initial: Record<string, string> = {};
      TIERS.forEach((t) => {
        initial[t.key] = settings[t.settingsKey] || t.defaultFee;
      });
      setFees(initial);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      await api.put(`/admin/settings/${key}`, { value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail ?? "Erro ao salvar.");
    },
  });

  const handleSave = async (tierKey: string, settingsKey: string) => {
    setSaving(tierKey);
    setError(null);
    try {
      await saveMutation.mutateAsync({ key: settingsKey, value: fees[tierKey] || "0" });
      setSaved(tierKey);
      setTimeout(() => setSaved(null), 2000);
    } finally {
      setSaving(null);
    }
  };

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
        <h2 className="text-3xl font-bold">Planos da Plataforma</h2>
        <p className="text-gray-400 mt-1">
          Gerencie os planos de assinatura e taxas por servico para estabelecimentos.
          Todo estabelecimento novo comeca no plano <strong className="text-gray-300">Free</strong> com taxa de{" "}
          <strong className="text-blue-400">{fees.free || "6"}%</strong> por servico.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm py-3 px-4 rounded-xl flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Overview Card */}
      <div className="p-6 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-cyan-600/10 border border-white/10 rounded-2xl">
        <h3 className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
          <Crown size={16} className="text-yellow-400" />
          Como funciona
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-3 bg-black/20 rounded-xl">
            <p className="text-gray-400">
              <strong className="text-gray-200">1. Taxa por servico</strong><br />
              Cada pagamento via app desconta a taxa do plano do estabelecimento.
            </p>
          </div>
          <div className="p-3 bg-black/20 rounded-xl">
            <p className="text-gray-400">
              <strong className="text-gray-200">2. Plano padrao: Free</strong><br />
              Todos os novos estabelecimentos entram no plano Free automaticamente.
            </p>
          </div>
          <div className="p-3 bg-black/20 rounded-xl">
            <p className="text-gray-400">
              <strong className="text-gray-200">3. Upgrade manual</strong><br />
              Voce pode alterar o plano de cada estabelecimento na pagina de detalhes.
            </p>
          </div>
        </div>
      </div>

      {/* Tiers */}
      <div className="grid grid-cols-1 gap-4">
        {TIERS.map((tier) => {
          const count = tierCounts?.[tier.key] || 0;
          const isSaving = saving === tier.key;
          const isSaved = saved === tier.key;

          return (
            <div
              key={tier.key}
              className={`p-6 border rounded-2xl bg-white/5 hover:bg-white/[0.07] transition-all ${tier.bg}`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Info */}
                <div className="flex items-start gap-4 flex-1">
                  <div className={`p-3 rounded-xl ${tier.bg}`}>
                    <Star size={20} className={tier.color} />
                  </div>
                  <div>
                    <h4 className={`text-lg font-bold ${tier.color}`}>{tier.name}</h4>
                    <p className="text-sm text-gray-400 mt-0.5">{tier.description}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                        <Building2 size={12} />
                        {count} estabelecimento{count !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Fee Input */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-black/30 border border-white/10 rounded-xl px-4 py-2.5">
                    <Percent size={16} className="text-gray-500" />
                    <input
                      type="number"
                      min="0"
                      max="50"
                      step="0.5"
                      value={fees[tier.key] || ""}
                      onChange={(e) =>
                        setFees({ ...fees, [tier.key]: e.target.value })
                      }
                      className="w-16 bg-transparent text-right text-white font-bold text-lg focus:outline-none"
                    />
                    <span className="text-gray-500 text-sm">%</span>
                  </div>
                  <button
                    onClick={() => handleSave(tier.key, tier.settingsKey)}
                    disabled={isSaving}
                    className={`p-2.5 rounded-xl transition-all ${
                      isSaved
                        ? "bg-emerald-600 text-white"
                        : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {isSaving ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : isSaved ? (
                      <Check size={18} />
                    ) : (
                      <Save size={18} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mercado Pago Status */}
      <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
        <h3 className="text-sm font-bold text-gray-300 mb-3">Status dos Provedores de Pagamento</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-black/20 rounded-xl flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${settings?.mercadopago_access_token ? "bg-emerald-400" : "bg-red-400"}`} />
            <div>
              <p className="text-sm font-medium text-gray-200">Mercado Pago (PIX)</p>
              <p className="text-xs text-gray-500">
                {settings?.mercadopago_access_token
                  ? "Configurado — token ativo"
                  : "Nao configurado. Va em Configuracoes > Pagamentos."}
              </p>
            </div>
          </div>
          <div className="p-4 bg-black/20 rounded-xl flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${settings?.stripe_secret_key ? "bg-emerald-400" : "bg-yellow-400"}`} />
            <div>
              <p className="text-sm font-medium text-gray-200">Stripe (Cartao)</p>
              <p className="text-xs text-gray-500">
                {settings?.stripe_secret_key
                  ? "Configurado — chave ativa"
                  : "Opcional. Configure se quiser aceitar cartao de credito."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
