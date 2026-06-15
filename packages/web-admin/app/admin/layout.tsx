"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCookie, deleteCookie } from 'cookies-next';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    Store,
    Settings,
    DollarSign,
    LogOut,
    Bell,
    Menu,
    ChevronRight,
    MessageSquare,
    Briefcase,
    Scissors,
    Calendar,
    ListOrdered,
    Package,
    Star,
    Terminal,
    ScanLine,
    Smartphone,
    CreditCard,
    Crown,
    Megaphone,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Image from 'next/image';
import { BrandLogo } from '@/components/BrandLogo';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const MENU_SECTIONS: {
    title: string;
    items: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; href: string }[];
}[] = [
    {
        title: 'Visão geral',
        items: [{ icon: LayoutDashboard, label: 'Dashboard', href: '/admin' }],
    },
    {
        title: 'Operações',
        items: [
            { icon: Store, label: 'Estabelecimentos', href: '/admin/establishments' },
            { icon: Briefcase, label: 'Profissionais', href: '/admin/staff' },
            { icon: Scissors, label: 'Serviços', href: '/admin/services' },
            { icon: Calendar, label: 'Agendamentos', href: '/admin/appointments' },
            { icon: ListOrdered, label: 'Filas', href: '/admin/queue' },
            { icon: Package, label: 'Produtos', href: '/admin/products' },
        ],
    },
    {
        title: 'Clientes & suporte',
        items: [
            { icon: MessageSquare, label: 'Suporte', href: '/admin/support' },
            { icon: Users, label: 'Usuários', href: '/admin/users' },
            { icon: Users, label: 'CRM', href: '/admin/crm' },
            { icon: Star, label: 'Avaliações', href: '/admin/reviews' },
        ],
    },
    {
        title: 'Monetização',
        items: [
            { icon: Megaphone, label: 'Destaques & Ads', href: '/admin/marketing' },
            { icon: Crown, label: 'Planos SaaS', href: '/admin/plans' },
            { icon: CreditCard, label: 'Pagamentos', href: '/admin/payments' },
            { icon: DollarSign, label: 'Financeiro', href: '/admin/finance' },
        ],
    },
    {
        title: 'Integrações',
        items: [
            { icon: ScanLine, label: 'QR Analytics', href: '/admin/qr-analytics' },
            { icon: Smartphone, label: 'WhatsApp Bridge', href: '/admin/whatsapp-bridge' },
        ],
    },
    {
        title: 'Sistema',
        items: [
            { icon: Terminal, label: 'Logs', href: '/admin/logs' },
            { icon: Settings, label: 'Configurações', href: '/admin/settings' },
        ],
    },
];

const BREADCRUMB_LABELS: Record<string, string> = {
    admin: 'Dashboard',
    'qr-analytics': 'QR Analytics',
    'whatsapp-bridge': 'WhatsApp Bridge',
    support: 'Suporte',
    establishments: 'Estabelecimentos',
    staff: 'Profissionais',
    services: 'Serviços',
    appointments: 'Agendamentos',
    queue: 'Filas',
    reviews: 'Avaliações',
    marketing: 'Marketing',
    crm: 'CRM',
    products: 'Produtos',
    users: 'Usuários',
    payments: 'Pagamentos',
    finance: 'Financeiro',
    plans: 'Planos',
    logs: 'Logs',
    settings: 'Configurações',
    profile: 'Meu Perfil',
};

function breadcrumbLabel(pathname: string): string {
    const segment = pathname.split('/').filter(Boolean).pop() || 'admin';
    if (BREADCRUMB_LABELS[segment]) return BREADCRUMB_LABELS[segment];
    if (/^[0-9a-f-]{36}$/i.test(segment)) return 'Detalhe';
    return segment.replace(/-/g, ' ');
}


export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [role, setRole] = React.useState<string | null>(null);
    const [isMounted, setIsMounted] = React.useState(false);

    React.useEffect(() => {
        setIsMounted(true);
        const cookieRole = getCookie('user_role');
        if (cookieRole) setRole(String(cookieRole));
    }, []);

    const filteredSections = MENU_SECTIONS.map((section) => ({
        ...section,
        items: section.items.filter((item) => {
            if (!isMounted) return true;
            if (role === 'support') {
                return !['/admin/finance', '/admin/settings', '/admin/whatsapp-bridge'].includes(item.href);
            }
            return true;
        }),
    })).filter((section) => section.items.length > 0);

    const isActive = (href: string) =>
        href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

    const [showNotifications, setShowNotifications] = React.useState(false);
    const [showUserMenu, setShowUserMenu] = React.useState(false);

    // Fetch User Data
    const { data: user } = useQuery({
        queryKey: ['me'],
        queryFn: async () => {
            const res = await api.get('/users/me');
            return res.data;
        },
        retry: false
    });

    // Fetch Notifications (Mock or Real)
    const { data: notifications, refetch: refetchNotifications } = useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            try {
                const res = await api.get('/notifications');
                return res.data.items || [];
            } catch (e) {
                return []; // Fallback if endpoint not ready
            }
        },
        initialData: []
    });

    const handleLogout = async () => {
        try {
            await api.post('/auth/logout');
        } catch (e) {
            console.error('Logout error:', e);
        }
        deleteCookie('admin_token');
        deleteCookie('access_token');
        deleteCookie('user_role');
        router.push('/login');
    };

    const handleMarkAllRead = async () => {
        try {
            await api.patch('/notifications/read-all');
            refetchNotifications();
        } catch {
            /* ignore */
        }
    };

    const unreadCount = notifications?.filter((n: any) => !n.is_read)?.length || 0;

    return (
        <div className="flex h-screen bg-[#0f1115] text-white overflow-hidden">
            {/* Sidebar */}
            <aside className="w-60 border-r border-white/10 bg-black/20 backdrop-blur-xl flex flex-col">
                <div className="p-5 border-b border-white/5">
                    <BrandLogo href="/admin" size="sidebar" priority />
                    <span className="mt-2 block text-[10px] uppercase tracking-[0.2em] text-[#e8c547]/70 font-semibold">
                        Admin
                    </span>
                </div>

                <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                    {filteredSections.map((section) => (
                        <div key={section.title}>
                            <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-600">
                                {section.title}
                            </p>
                            <div className="space-y-0.5">
                                {section.items.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            'flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200 group',
                                            isActive(item.href)
                                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/25'
                                                : 'hover:bg-white/5 text-gray-400 border border-transparent'
                                        )}
                                    >
                                        <item.icon
                                            size={17}
                                            className={cn(
                                                'shrink-0 transition-colors',
                                                isActive(item.href) ? 'text-amber-400' : 'group-hover:text-white'
                                            )}
                                        />
                                        <span className="font-medium text-[13px] truncate">{item.label}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="p-4 border-t border-white/10">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-300"
                    >
                        <LogOut size={20} />
                        <span className="font-medium text-sm">Sair</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto bg-[#0f1115]">
                {/* Navbar */}
                <header className="h-16 border-b border-white/10 flex items-center justify-between px-8 bg-black/10 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex items-center gap-4 text-gray-400 text-sm">
                        <span>Admin</span>
                        <ChevronRight size={14} />
                        <span className="text-white font-medium capitalize">
                            {breadcrumbLabel(pathname)}
                        </span>
                    </div>

                    <div className="flex items-center gap-6 relative">
                        {/* Notifications */}
                        <div className="relative">
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="relative text-gray-400 hover:text-white transition-colors"
                            >
                                <Bell size={20} />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full border border-[#0f1115]"></span>
                                )}
                            </button>

                            {/* Notifications Dropdown */}
                            {showNotifications && (
                                <div className="absolute right-0 mt-2 w-80 bg-[#1a1d24] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    <div className="p-4 border-b border-white/10 flex justify-between items-center">
                                        <h3 className="text-sm font-semibold text-white">Notificações</h3>
                                        <button
                                            type="button"
                                            onClick={handleMarkAllRead}
                                            className="text-xs text-blue-400 cursor-pointer hover:underline"
                                        >
                                            Marcar todas
                                        </button>
                                    </div>
                                    <div className="max-h-[300px] overflow-y-auto">
                                        {notifications?.length === 0 ? (
                                            <div className="p-8 text-center text-gray-500 text-sm">
                                                Nenhuma notificação nova.
                                            </div>
                                        ) : (
                                            notifications?.map((n: any) => (
                                                <div key={n.id} className="p-4 border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors">
                                                    <p className="text-sm text-gray-300">{n.title}</p>
                                                    <p className="text-xs text-gray-500 mt-1">{n.message}</p>
                                                    <span className="text-[10px] text-gray-600 mt-2 block">{new Date(n.created_at).toLocaleDateString()}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* User Avatar */}
                        <div className="relative">
                            <button
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                            >
                                <div className="h-8 w-8 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-full border border-white/20 flex items-center justify-center text-xs font-bold text-white overflow-hidden">
                                    {user?.avatar_url ? (
                                        <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                                    ) : (
                                        user?.name?.substring(0, 2).toUpperCase() || 'AD'
                                    )}
                                </div>
                                <div className="hidden md:block text-left">
                                    <p className="text-sm font-medium text-white leading-none">{user?.name || 'Carregando...'}</p>
                                    <p className="text-xs text-gray-500 mt-1 capitalize">
                                        {/* Use isMounted to avoid hydration mismatch */}
                                        {isMounted ? (user?.role || role || 'Admin') : '...'}
                                    </p>
                                </div>
                            </button>

                            {/* User Menu Dropdown */}
                            {showUserMenu && (
                                <div className="absolute right-0 mt-2 w-48 bg-[#1a1d24] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    <div className="p-2">
                                        <Link href="/admin/profile" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 rounded-lg transition-colors">
                                            <span>Meu Perfil</span>
                                        </Link>
                                        <button
                                            onClick={handleLogout}
                                            className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg w-full text-left transition-colors"
                                        >
                                            <span>Sair</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
