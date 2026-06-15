"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Loader2, User, Mail, Smartphone, Save, Shield } from "lucide-react";

export default function AdminProfilePage() {
    const queryClient = useQueryClient();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [saved, setSaved] = useState(false);

    const { data: user, isLoading } = useQuery({
        queryKey: ["admin-me"],
        queryFn: async () => {
            const res = await api.get("/users/me");
            return res.data;
        },
    });

    React.useEffect(() => {
        if (user) {
            setName(user.name ?? "");
            setEmail(user.email ?? "");
        }
    }, [user]);

    const updateMutation = useMutation({
        mutationFn: async () => {
            await api.patch("/users/me", { name: name.trim() || null, email: email.trim() || null });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-me"] });
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        },
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
        );
    }

    return (
        <div className="max-w-2xl space-y-6">
            <div>
                <h2 className="text-3xl font-bold">Meu Perfil</h2>
                <p className="text-gray-400 mt-1">Dados da sua conta administrativa.</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/20 flex items-center justify-center">
                        <User className="text-blue-400" size={28} />
                    </div>
                    <div>
                        <p className="font-semibold text-lg">{user?.name || "Administrador"}</p>
                        <span className="inline-flex items-center gap-1 text-xs uppercase font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full mt-1">
                            <Shield size={12} />
                            {user?.role}
                        </span>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2 block">Nome</label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            placeholder="Seu nome"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2 block">E-mail</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                            <input
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                type="email"
                                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                placeholder="email@exemplo.com"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2 block">Telefone</label>
                        <div className="flex items-center gap-2 px-4 py-3 bg-white/[0.02] border border-white/10 rounded-xl text-gray-400">
                            <Smartphone size={16} />
                            {user?.phone || "—"}
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => updateMutation.mutate()}
                    disabled={updateMutation.isPending}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
                >
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    {saved ? "Salvo!" : "Salvar alterações"}
                </button>
            </div>
        </div>
    );
}
