'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { SupportService, Ticket, TicketMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Send, Paperclip, MoreVertical, CheckCircle, Clock, History, CreditCard, Calendar, XCircle, AlertTriangle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = React.use(params);
    const router = useRouter();
    const queryClient = useQueryClient();
    const [message, setMessage] = React.useState('');
    const scrollRef = React.useRef<HTMLDivElement>(null);

    const { data: ticket, isLoading } = useQuery<Ticket>({
        queryKey: ['ticket', id],
        queryFn: () => SupportService.get(id),
        refetchInterval: 5000,
    });

    const { data: context, isLoading: isLoadingContext } = useQuery({
        queryKey: ['ticket-context', id],
        queryFn: () => SupportService.getContext(id),
        enabled: !!ticket,
    });

    const sendMessageMutation = useMutation({
        mutationFn: (content: string) => SupportService.sendMessage(id, { content }),
        onSuccess: () => {
            setMessage('');
            queryClient.invalidateQueries({ queryKey: ['ticket', id] });
        },
    });

    const updateStatusMutation = useMutation({
        mutationFn: (status: string) => SupportService.update(id, { status }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ticket', id] });
        }
    });

    const openDisputeMutation = useMutation({
        mutationFn: ({ type, id, amount }: { type: string, id: string, amount: number }) =>
            SupportService.create({
                title: `DISPUTA: ${type} #${id.slice(0, 8)} - Valor: ${amount}`,
                category: 'financial',
                priority: 'urgent'
            }),
        onSuccess: (data) => {
            alert(`Disputa aberta com sucesso. Novo Ticket: #${data.id.slice(0, 8)}`);
            router.push(`/admin/support/${data.id}`);
        },
        onError: () => alert('Erro ao abrir disputa.')
    });

    const cancelAppointmentMutation = useMutation({
        mutationFn: ({ appId, reason }: { appId: string, reason: string }) =>
            SupportService.cancelAppointment(id, appId, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ticket-context', id] });
            alert('Agendamento cancelado com sucesso.');
        },
        onError: () => alert('Erro ao cancelar agendamento.')
    });

    React.useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [ticket?.messages]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;
        sendMessageMutation.mutate(message);
    };

    const handleCancelAppointment = (appId: string) => {
        const reason = prompt('Motivo do cancelamento pelo suporte:');
        if (reason) {
            cancelAppointmentMutation.mutate({ appId, reason });
        }
    };

    if (isLoading) return (
        <div className="h-full flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
            <p className="text-gray-500 font-medium">Sincronizando dados seguros...</p>
        </div>
    );

    if (!ticket) return <div className="p-8 text-center text-red-500">Ticket não encontrado.</div>;

    return (
        <div className="flex h-[calc(100vh-6rem)] gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-white/[0.02] backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl relative">
                {/* Queue Information Overlay (if applicable) */}
                {ticket.status === 'open' && ticket.queue_position && (
                    <div className="absolute top-20 right-6 z-10 animate-in slide-in-from-right-4 duration-500">
                        <div className="bg-amber-500/10 backdrop-blur-md border border-amber-500/20 p-3 rounded-2xl flex items-center gap-3 shadow-lg">
                            <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
                            <div>
                                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-tighter">Posição na Fila</p>
                                <p className="text-sm font-black text-white">{ticket.queue_position}º <span className="text-[10px] font-medium text-gray-400 opacity-60 ml-1">~{ticket.estimated_wait_time_minutes} min</span></p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Chat Header */}
                <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/[0.03]">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.back()}
                            className="hover:bg-white/10 rounded-xl transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5 text-gray-400" />
                        </Button>
                        <div>
                            <h3 className="font-bold text-lg tracking-tight text-white">{ticket.title}</h3>
                            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-gray-400">
                                <span className="text-blue-400">#{ticket.id.slice(0, 8)}</span>
                                <span className="mx-1">•</span>
                                <span className="bg-white/5 px-2 py-0.5 rounded-md">{ticket.category}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <Badge className={cn(
                            "px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest border-0",
                            ticket.status === 'open' ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30' :
                                ticket.status === 'resolved' ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30' :
                                    'bg-gray-500/20 text-gray-400 ring-1 ring-gray-500/30'
                        )}>
                            {ticket.status === 'open' ? 'Aberto' : ticket.status === 'in_progress' ? 'Em Andamento' : 'Resolvido'}
                        </Badge>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="hover:bg-white/10 rounded-xl">
                                    <MoreVertical className="h-5 w-5 text-gray-400" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-[#1a1d24] border-white/10 rounded-xl shadow-2xl">
                                <DropdownMenuItem onClick={() => updateStatusMutation.mutate('in_progress')} className="focus:bg-blue-500/10 focus:text-blue-400 text-xs font-bold py-2.5">
                                    Assumir Atendimento
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateStatusMutation.mutate('resolved')} className="focus:bg-green-500/10 focus:text-green-400 text-xs font-bold py-2.5">
                                    Resolver e Finalizar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateStatusMutation.mutate('closed')} className="focus:bg-red-500/10 focus:text-red-400 text-xs font-bold py-2.5">
                                    Fechar Permanentemente
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar" ref={scrollRef}>
                    {ticket.messages?.map((msg) => {
                        const isSupport = msg.sender.role === 'support' || msg.sender.role === 'admin';
                        return (
                            <div key={msg.id} className={cn(
                                "flex gap-4 group animate-in fade-in slide-in-from-bottom-2 duration-300",
                                isSupport ? "flex-row-reverse" : "flex-row"
                            )}>
                                <Avatar className={cn(
                                    "h-9 w-9 shrink-0 shadow-lg",
                                    isSupport ? "ring-2 ring-amber-500/20" : "ring-2 ring-white/5"
                                )}>
                                    <AvatarImage src={msg.sender.avatar_url} />
                                    <AvatarFallback className={cn(
                                        "font-bold",
                                        isSupport ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white" : "bg-blue-600 text-white"
                                    )}>
                                        {msg.sender.name?.[0] || 'U'}
                                    </AvatarFallback>
                                </Avatar>

                                <div className={cn(
                                    "p-4 rounded-2xl max-w-[80%] shadow-xl relative transition-all group-hover:shadow-2xl",
                                    isSupport
                                        ? 'bg-amber-500/10 border border-amber-500/20 rounded-tr-none'
                                        : 'bg-white/[0.04] border border-white/10 rounded-tl-none'
                                )}>
                                    <div className={cn(
                                        "flex items-center gap-2 mb-1.5",
                                        isSupport ? "flex-row-reverse" : "flex-row"
                                    )}>
                                        <p className="text-[12px] font-bold text-gray-300">{msg.sender.name}</p>
                                        {isSupport && (
                                            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded uppercase tracking-tighter">
                                                Atendimento
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[14px] text-gray-200 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                    <span className={cn(
                                        "text-[9px] font-medium text-gray-500 mt-2 block",
                                        isSupport ? "text-left" : "text-right"
                                    )}>
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Input */}
                <form onSubmit={handleSendMessage} className="p-5 bg-white/[0.03] border-t border-white/10 flex gap-3 items-center">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                    >
                        <Paperclip className="h-5 w-5" />
                    </Button>
                    <div className="flex-1 relative group">
                        <Input
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Responda ao cliente com clareza..."
                            className="bg-black/20 border-white/10 rounded-2xl h-12 px-5 focus-visible:ring-amber-500/50 focus:border-amber-500/50 transition-all text-sm"
                        />
                    </div>
                    <Button
                        type="submit"
                        disabled={sendMessageMutation.isPending || !message.trim()}
                        className="bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-white font-bold h-12 w-12 rounded-2xl shadow-lg shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
                    >
                        <Send className="h-5 w-5" />
                    </Button>
                </form>
            </div>

            {/* Sidebar Details & Context */}
            <div className="w-80 flex flex-col gap-6">
                <Tabs defaultValue="client" className="w-full">
                    <TabsList className="w-full bg-white/5 border border-white/10 rounded-2xl p-1 h-12">
                        <TabsTrigger value="client" className="flex-1 rounded-xl data-[state=active]:bg-amber-500 data-[state=active]:text-white font-bold text-xs">
                            Cliente
                        </TabsTrigger>
                        <TabsTrigger value="context" className="flex-1 rounded-xl data-[state=active]:bg-amber-500 data-[state=active]:text-white font-bold text-xs flex items-center gap-2">
                            Histórico <History size={14} />
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="client" className="mt-4 space-y-6 animate-in fade-in zoom-in-95 duration-300">
                        <Card className="bg-white/[0.02] backdrop-blur-xl border-white/10 rounded-3xl shadow-xl overflow-hidden">
                            <CardContent className="p-6 space-y-6">
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-16 w-16 ring-4 ring-white/[0.03]">
                                        <AvatarFallback className="bg-blue-600 text-white text-2xl font-bold">
                                            {ticket.user.name?.[0] || 'U'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="text-lg font-bold text-white tracking-tight">{ticket.user.name}</p>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-500 border-amber-500/20">
                                                {context?.subscription_tier || 'N/A'}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">E-mail</p>
                                        <p className="text-sm text-gray-200 font-medium truncate">{ticket.user.email}</p>
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Telefone</p>
                                        <p className="text-sm text-gray-200 font-medium">{ticket.user.phone || 'N/A'}</p>
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex justify-between items-center group">
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Total Gasto</p>
                                            <p className="text-sm text-green-400 font-black">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context?.total_spent || 0)}
                                            </p>
                                        </div>
                                        <CreditCard className="w-5 h-5 text-gray-600 group-hover:text-green-500/40 transition-colors" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="context" className="mt-4 space-y-6 animate-in fade-in zoom-in-95 duration-300">
                        {/* Recent Appointments */}
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] px-2 flex items-center justify-between">
                                Agendamentos Recentes
                                <Calendar size={12} className="opacity-50" />
                            </h4>
                            {context?.recent_appointments?.map((app: any) => (
                                <div key={app.id} className="bg-white/5 border border-white/10 p-4 rounded-2xl group relative hover:bg-white/[0.08] transition-all">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="text-xs font-bold text-white mb-0.5">{app.service_name}</p>
                                            <p className="text-[10px] text-gray-400">Com: {app.staff_name}</p>
                                        </div>
                                        <Badge className={cn(
                                            "text-[9px] px-1.5 py-0",
                                            app.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                                                app.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                                                    'bg-blue-500/20 text-blue-400'
                                        )}>
                                            {app.status}
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between items-center mt-3">
                                        <p className="text-[10px] text-gray-500 font-mono">
                                            {new Date(app.start_at).toLocaleDateString()}
                                        </p>
                                        {app.status !== 'cancelled' && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleCancelAppointment(app.id)}
                                                className="h-7 px-2 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg flex items-center gap-1.5"
                                            >
                                                <XCircle size={10} /> Cancelar
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {!context?.recent_appointments?.length && <p className="text-center text-[11px] text-gray-600 py-4 italic">Nenhum agendamento encontrado.</p>}
                        </div>

                        {/* Recent Payments */}
                        <div className="space-y-3 pt-2">
                            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] px-2 flex items-center justify-between">
                                Últimos Pagamentos
                                <CreditCard size={12} className="opacity-50" />
                            </h4>
                            <div className="bg-black/20 rounded-2xl border border-white/5 divide-y divide-white/5 overflow-hidden">
                                {context?.recent_payments?.slice(0, 3).map((pay: any) => (
                                    <div key={pay.id} className="p-3 flex justify-between items-center hover:bg-white/5 transition-colors group">
                                        <div>
                                            <p className="text-[11px] font-bold text-gray-200">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pay.amount)}
                                            </p>
                                            <p className="text-[9px] text-gray-500 mt-0.5 uppercase tracking-tighter">{pay.provider} • {pay.status}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {pay.status === 'succeeded' && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openDisputeMutation.mutate({ type: 'PAGAMENTO', id: pay.id, amount: pay.amount })}
                                                    className="h-7 w-7 p-0 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                                    title="Abrir Disputa"
                                                >
                                                    <AlertTriangle size={12} />
                                                </Button>
                                            )}
                                            {pay.status === 'failed' && <AlertTriangle size={14} className="text-red-500/60" />}
                                        </div>
                                    </div>
                                ))}
                                {!context?.recent_payments?.length && <p className="text-center text-[11px] text-gray-600 py-4 italic">Sem transações recentes.</p>}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
