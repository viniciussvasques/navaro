"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setCookie } from 'cookies-next';
import { ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { api } from '@/lib/api';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await api.post('/auth/login', {
                email,
                password,
            });

            const { user } = response.data;

            // Role and user info can still be in cookies for client-side use
            setCookie('user_role', user.role, { maxAge: 60 * 60 * 24 });
            setCookie('user_name', user.name, { maxAge: 60 * 60 * 24 });

            router.push('/admin');
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.response?.data?.detail || 'E-mail ou senha incorretos.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f1115] flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full"></div>

            <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center gap-4 mb-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-amber-500/30">
                            <span className="text-white font-bold text-4xl">D</span>
                        </div>
                        <span className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 tracking-tighter">
                            DUNNAA
                        </span>
                    </div>
                    <p className="text-gray-400 mt-2">Acesse com segurança o painel do DUNNAA</p>
                </div>

                <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm py-3 px-4 rounded-xl text-center">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">E-mail</label>
                            <input
                                type="email"
                                placeholder="admin@dunnaa.com.br"
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-gray-600"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Senha</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-gray-600"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 group"
                        >
                            {loading ? <Loader2 size={20} className="animate-spin" /> : (
                                <>
                                    Acessar Painel
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-center text-gray-500 text-xs mt-8">
                    &copy; 2026 DUNNAA S.A. Todos os direitos reservados.
                </p>
            </div>
        </div>
    );
}
