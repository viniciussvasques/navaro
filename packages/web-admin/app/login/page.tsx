"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setCookie } from 'cookies-next';
import { ArrowRight, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { BrandLogo } from '@/components/BrandLogo';

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

            const { user, tokens } = response.data;

            // Role and user info for client-side (menu, display)
            setCookie('user_role', user?.role ?? '', { maxAge: 60 * 60 * 24 });
            setCookie('user_name', user?.name ?? '', { maxAge: 60 * 60 * 24 });
            // Token for Authorization header (proxy may not forward HttpOnly cookie)
            if (tokens?.access_token) {
                setCookie('admin_token', tokens.access_token, { maxAge: 60 * 60 * 24, sameSite: 'lax' });
            }

            router.push('/admin');
        } catch (err: any) {
            console.error('Login error:', err);
            const d = err.response?.data?.detail;
            const msg = typeof d === 'object' && d?.message ? d.message : (typeof d === 'string' ? d : null);
            setError(msg || 'E-mail ou senha incorretos.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a1628] flex items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-[#e8c547]/8 blur-[140px] rounded-full animate-pulse" />
            <div className="absolute bottom-[-15%] right-[-10%] w-[45%] h-[45%] bg-[#0a9396]/10 blur-[120px] rounded-full" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(232,197,71,0.06),transparent_70%)]" />

            <div className="w-full max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="text-center mb-10">
                    <div className="flex justify-center mb-6">
                        <BrandLogo size="login" priority className="drop-shadow-[0_8px_40px_rgba(232,197,71,0.3)]" />
                    </div>
                    <p className="text-xs uppercase tracking-[0.25em] text-[#e8c547]/80 font-semibold mb-2">Painel Admin</p>
                    <p className="text-gray-400 text-sm">Acesse com segurança a plataforma DUNNAA</p>
                </div>

                <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-[0_24px_80px_rgba(0,0,0,0.4)]">
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
                            className="w-full bg-gradient-to-r from-[#c9a227] via-[#e8c547] to-[#b8922a] hover:brightness-110 disabled:opacity-50 text-[#0a1628] font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 group shadow-[0_8px_24px_rgba(232,197,71,0.25)]"
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
