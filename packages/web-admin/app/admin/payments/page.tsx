"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  BarChart3,
  Loader2,
  Search,
  ChevronDown,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  Download,
} from "lucide-react";
import { downloadAdminCsv } from "@/lib/exportCsv";

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

type Payment = {
  id: string;
  user_id: string;
  establishment_id: string;
  establishment_name?: string;
  appointment_id?: string;
  amount: number;
  platform_fee: number;
  gateway_fee: number;
  net_amount: number;
  status: string;
  provider: string;
  purpose: string;
  created_at: string;
};

export default function AdminPaymentsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");

  // Fetch all payments (admin endpoint)
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-all-payments"],
    queryFn: async () => {
      const res = await api.get("/admin/payments", { params: { page_size: 200 } });
      return (res.data?.items || []) as Payment[];
    },
  });

  const { data: apiStats } = useQuery({
    queryKey: ["admin-payments-stats"],
    queryFn: async () => {
      const res = await api.get("/admin/payments/stats");
      return res.data as {
        total_volume: number;
        month_volume: number;
        total_fees: number;
        month_fees: number;
        total_count: number;
        providers?: Record<string, number>;
      };
    },
  });

  const payments = data ?? [];

  const filtered = useMemo(() => {
    let result = payments;
    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter);
    }
    if (providerFilter !== "all") {
      result = result.filter((p) => p.provider === providerFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.id.toLowerCase().includes(q) ||
          p.user_id?.toLowerCase().includes(q) ||
          p.establishment_id?.toLowerCase().includes(q) ||
          p.establishment_name?.toLowerCase().includes(q)
      );
    }
    return result.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [payments, statusFilter, providerFilter, search]);

  const stats = useMemo(() => {
    if (apiStats) {
      return {
        totalVolume: apiStats.total_volume ?? 0,
        monthVolume: apiStats.month_volume ?? 0,
        platformFees: apiStats.total_fees ?? 0,
        monthFees: apiStats.month_fees ?? 0,
        totalCount: apiStats.total_count ?? payments.length,
        pendingCount: payments.filter((p) => p.status === "pending").length,
        pixCount: apiStats.providers?.mercadopago ?? payments.filter((p) => p.provider === "mercadopago").length,
        stripeCount: apiStats.providers?.stripe ?? payments.filter((p) => p.provider === "stripe").length,
      };
    }
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const succeeded = payments.filter((p) => p.status === "succeeded");
    const monthPayments = succeeded.filter((p) => new Date(p.created_at) >= startOfMonth);

    return {
      totalVolume: succeeded.reduce((s, p) => s + p.amount, 0),
      monthVolume: monthPayments.reduce((s, p) => s + p.amount, 0),
      platformFees: succeeded.reduce((s, p) => s + p.platform_fee, 0),
      monthFees: monthPayments.reduce((s, p) => s + p.platform_fee, 0),
      totalCount: payments.length,
      pendingCount: payments.filter((p) => p.status === "pending").length,
      pixCount: payments.filter((p) => p.provider === "mercadopago").length,
      stripeCount: payments.filter((p) => p.provider === "stripe").length,
    };
  }, [payments, apiStats]);

  const statusIcon = (s: string) => {
    if (s === "succeeded") return <CheckCircle size={14} className="text-emerald-400" />;
    if (s === "pending" || s === "processing")
      return <Clock size={14} className="text-amber-400" />;
    return <XCircle size={14} className="text-red-400" />;
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Pagamentos</h2>
          <p className="text-gray-400 mt-1">
            Todos os pagamentos processados na plataforma via Mercado Pago e Stripe.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => downloadAdminCsv("/admin/exports/payments.csv", "dunnaa-pagamentos.csv")}
            className="flex items-center gap-2 px-3 py-2.5 bg-emerald-600/20 border border-emerald-500/30 rounded-xl text-emerald-300 hover:bg-emerald-600/30 text-sm"
          >
            <Download size={16} />
            Exportar CSV
          </button>
          <button
            onClick={() => refetch()}
            className="p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-gray-400 hover:text-white"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="Volume Total"
          value={formatCurrency(stats.totalVolume)}
          sub={`${stats.totalCount} pagamentos`}
          icon={DollarSign}
          color="blue"
        />
        <StatCard
          label="Volume do Mes"
          value={formatCurrency(stats.monthVolume)}
          sub="Pagamentos aprovados"
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          label="Taxas Plataforma"
          value={formatCurrency(stats.platformFees)}
          sub={`${formatCurrency(stats.monthFees)} este mes`}
          icon={BarChart3}
          color="purple"
        />
        <StatCard
          label="Provedores"
          value={`${stats.pixCount} PIX / ${stats.stripeCount} Stripe`}
          sub={`${stats.pendingCount} pendentes`}
          icon={CreditCard}
          color="orange"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-300 focus:outline-none"
        >
          <option value="all">Todos status</option>
          <option value="succeeded">Aprovado</option>
          <option value="pending">Pendente</option>
          <option value="failed">Falhou</option>
          <option value="refunded">Reembolsado</option>
        </select>
        <select
          value={providerFilter}
          onChange={(e) => setProviderFilter(e.target.value)}
          className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-300 focus:outline-none"
        >
          <option value="all">Todos provedores</option>
          <option value="mercadopago">Mercado Pago (PIX)</option>
          <option value="stripe">Stripe</option>
          <option value="wallet">Carteira</option>
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-blue-500" size={32} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center">
          <CreditCard className="mx-auto text-gray-700 mb-4" size={48} />
          <p className="text-gray-500">Nenhum pagamento encontrado.</p>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white/5 text-gray-400 text-[10px] uppercase font-bold tracking-widest">
                <tr>
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Estabelecimento</th>
                  <th className="px-6 py-4">Provedor</th>
                  <th className="px-6 py-4 text-right">Valor</th>
                  <th className="px-6 py-4 text-right">Taxa</th>
                  <th className="px-6 py-4 text-right">Liquido</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {filtered.slice(0, 100).map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-white">
                          {new Date(p.created_at).toLocaleDateString("pt-BR")}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {new Date(p.created_at).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-white text-sm max-w-[160px] truncate">
                      {p.establishment_name || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                          p.provider === "mercadopago"
                            ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                            : p.provider === "stripe"
                            ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                            : "bg-gray-500/10 text-gray-400 border border-gray-500/20"
                        }`}
                      >
                        {p.provider === "mercadopago" ? "PIX" : p.provider || "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-white">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-400">
                      {formatCurrency(p.platform_fee)}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-emerald-400">
                      {formatCurrency(p.net_amount)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5">
                        {statusIcon(p.status)}
                        <span className="text-xs capitalize">{p.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-[10px] text-gray-500">
                      {p.id.substring(0, 8)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
}) {
  const colors: Record<string, string> = {
    blue: "text-blue-400 bg-blue-500/10",
    green: "text-emerald-400 bg-emerald-500/10",
    purple: "text-purple-400 bg-purple-500/10",
    orange: "text-orange-400 bg-orange-500/10",
  };
  const c = colors[color] || colors.blue;

  return (
    <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${c}`}>
          <Icon size={18} />
        </div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
      </div>
      <p className="text-xl font-bold mt-3">{value}</p>
      <p className="text-[11px] text-gray-500 mt-1">{sub}</p>
    </div>
  );
}
