"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import {
    ArrowLeft,
    Store,
    MapPin,
    Phone,
    User,
    Loader2,
    CheckCircle,
    Calendar,
    Scissors,
    Users,
    Crown,
} from "lucide-react";

const TIERS = ["free", "bronze", "silver", "gold", "platinum"];
const STATUSES = ["pending", "active", "suspended", "closed"];

export default function EstablishmentDetailPage() {
    const params = useParams();
    const id = params.id as string;
    const queryClient = useQueryClient();
    const [tier, setTier] = useState("");
    const [status, setStatus] = useState("");

    const { data, isLoading } = useQuery({
        queryKey: ["admin-establishment", id],
        queryFn: async () => {
            const res = await api.get(`/admin/establishments/${id}`);
            return res.data;
        },
    });

    React.useEffect(() => {
        if (data?.establishment) {
            setTier(data.establishment.subscription_tier);
            setStatus(data.establishment.status);
        }
    }, [data]);

    const updateMutation = useMutation({
        mutationFn: async () => {
            await api.patch(`/admin/establishments/${id}`, {
                subscription_tier: tier,
                status,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-establishment", id] });
            queryClient.invalidateQueries({ queryKey: ["admin-establishments"] });
        },
    });

    const approveMutation = useMutation({
        mutationFn: async () => {
            await api.patch(`/admin/establishments/${id}/approve`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-establishment", id] });
            queryClient.invalidateQueries({ queryKey: ["admin-establishments"] });
        },
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
        );
    }

    const est = data?.establishment;
    const owner = data?.owner;
    const stats = data?.stats ?? {};

    if (!est) {
        return (
            <div className="text-center py-16 text-gray-400">
                Estabelecimento não encontrado.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Link href="/admin/establishments" className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm">
                <ArrowLeft size={16} />
                Voltar para estabelecimentos
            </Link>

            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-green-600/20 rounded-2xl flex items-center justify-center border border-green-500/20">
                        <Store className="text-green-400" size={28} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold">{est.name}</h2>
                        <p className="text-gray-400 capitalize">{est.category} · {est.city}, {est.state}</p>
                    </div>
                </div>
                {est.status === "pending" && (
                    <button
                        onClick={() => approveMutation.mutate()}
                        disabled={approveMutation.isPending}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-xl text-sm font-semibold"
                    >
                        <CheckCircle size={16} />
                        Aprovar cadastro
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard icon={Calendar} label="Agendamentos" value={stats.appointments ?? 0} />
                <StatCard icon={Users} label="Profissionais" value={stats.staff ?? 0} />
                <StatCard icon={Scissors} label="Serviços" value={stats.services ?? 0} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                    <h3 className="font-bold text-lg">Informações</h3>
                    <InfoRow icon={MapPin} label="Endereço" value={`${est.address}, ${est.city} - ${est.state}`} />
                    <InfoRow icon={Phone} label="Telefone" value={est.phone} />
                    {est.whatsapp && <InfoRow icon={Phone} label="WhatsApp" value={est.whatsapp} />}
                    {est.pix_key && (
                        <InfoRow icon={Crown} label="PIX" value={`${est.pix_key_type?.toUpperCase()} · ${est.pix_key}`} />
                    )}
                    <p className="text-sm text-gray-400">{est.description || "Sem descrição."}</p>
                </div>

                <div className="space-y-6">
                    {owner && (
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-3">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <User size={18} />
                                Proprietário
                            </h3>
                            <p className="font-medium">{owner.name || "Sem nome"}</p>
                            <p className="text-sm text-gray-400">{owner.phone}</p>
                            <p className="text-sm text-gray-400">{owner.email || "—"}</p>
                        </div>
                    )}

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                        <h3 className="font-bold text-lg">Moderação</h3>
                        <div>
                            <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Status</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl"
                            >
                                {STATUSES.map((s) => (
                                    <option key={s} value={s} className="bg-[#1a1d24]">{s}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Plano (tier)</label>
                            <select
                                value={tier}
                                onChange={(e) => setTier(e.target.value)}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl"
                            >
                                {TIERS.map((t) => (
                                    <option key={t} value={t} className="bg-[#1a1d24]">{t}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={() => updateMutation.mutate()}
                            disabled={updateMutation.isPending}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold text-sm disabled:opacity-50"
                        >
                            {updateMutation.isPending ? "Salvando..." : "Salvar alterações"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
    return (
        <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex items-center gap-3">
            <Icon className="text-blue-400" size={20} />
            <div>
                <p className="text-[10px] text-gray-500 uppercase font-bold">{label}</p>
                <p className="text-2xl font-bold">{value}</p>
            </div>
        </div>
    );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
    return (
        <div className="flex items-start gap-2 text-sm">
            <Icon size={14} className="text-gray-500 mt-0.5 shrink-0" />
            <div>
                <span className="text-gray-500 text-xs uppercase font-bold block">{label}</span>
                <span className="text-gray-200">{value}</span>
            </div>
        </div>
    );
}
