"use client";

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, UserService } from '@/lib/api';
import {
    User,
    Shield,
    ShieldCheck,
    Crown,
    UserCircle,
    Mail,
    Smartphone,
    Tag,
    Loader2,
    Search,
    MoreVertical
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export default function UsersPage() {
    const queryClient = useQueryClient();
    const { data, isLoading } = useQuery({
        queryKey: ['admin-users'],
        queryFn: async () => {
            const res = await api.get('/users');
            return res.data;
        }
    });

    const updateRoleMutation = useMutation({
        mutationFn: ({ userId, role }: { userId: string, role: string }) =>
            UserService.updateRole(userId, role),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            alert('Cargo atualizado com sucesso.');
        },
        onError: () => alert('Erro ao atualizar cargo. Verifique suas permissões.')
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
        );
    }

    const users = data?.items || [];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold uppercase tracking-tight">Gestão de Usuários</h2>
                    <p className="text-gray-400 mt-1">Controle de acesso, cargos e permissões da plataforma.</p>
                </div>
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors group-focus-within:text-blue-500" size={16} />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou CPF..."
                        className="pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm w-72"
                    />
                </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
                <table className="w-full text-left">
                    <thead className="bg-white/5 border-b border-white/10 text-gray-400 text-[10px] uppercase font-bold tracking-widest">
                        <tr>
                            <th className="px-6 py-4">Usuário</th>
                            <th className="px-6 py-4">Contato</th>
                            <th className="px-6 py-4">Status / Role</th>
                            <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                        {users.map((u: any) => (
                            <tr key={u.id} className="hover:bg-white/[0.02] transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-gray-800 to-gray-700 flex items-center justify-center border border-white/10 overflow-hidden shadow-inner">
                                            {u.avatar_url ? (
                                                <img src={u.avatar_url} alt={u.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <UserCircle size={24} className="text-gray-500" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm">{u.name || 'Sem nome'}</p>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <Tag size={10} className="text-gray-500" />
                                                <span className="text-[10px] text-gray-500 font-mono tracking-tighter uppercase">{u.id.substring(0, 8)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-xs text-gray-400">
                                            <Smartphone size={12} className="text-blue-500" />
                                            {u.phone}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-400 overflow-hidden max-w-[180px]">
                                            <Mail size={12} className="text-purple-500" />
                                            <span className="truncate">{u.email || '—'}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <RoleBadge role={u.role} />
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10 rounded-lg">
                                                <MoreVertical size={16} className="text-gray-500" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="bg-[#1a1d24] border-white/10 rounded-xl shadow-2xl">
                                            <div className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/5 mb-1">Alterar Cargo</div>
                                            <DropdownMenuItem onClick={() => updateRoleMutation.mutate({ userId: u.id, role: 'customer' })} className="text-xs font-semibold py-2">Definir como Cliente</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => updateRoleMutation.mutate({ userId: u.id, role: 'owner' })} className="text-xs font-semibold py-2 text-amber-500">Promover a Dono de Loja</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => updateRoleMutation.mutate({ userId: u.id, role: 'support' })} className="text-xs font-semibold py-2 text-blue-500">Promover a Suporte</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => updateRoleMutation.mutate({ userId: u.id, role: 'admin' })} className="text-xs font-semibold py-2 text-red-500">Promover a Administrador</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function RoleBadge({ role }: { role: string }) {
    const configs: any = {
        admin: { icon: ShieldCheck, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", label: "Administrador" },
        owner: { icon: Crown, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", label: "Dono de Loja" },
        staff: { icon: Shield, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", label: "Profissional" },
        customer: { icon: User, color: "text-gray-400", bg: "bg-gray-500/10", border: "border-gray-500/20", label: "Cliente" },
    };

    const config = configs[role] || configs.customer;
    const Icon = config.icon;

    return (
        <span className={`inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full border text-[10px] font-bold uppercase ${config.bg} ${config.color} ${config.border}`}>
            <Icon size={12} />
            {config.label}
        </span>
    );
}
