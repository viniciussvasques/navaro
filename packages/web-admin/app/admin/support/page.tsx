'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { SupportService, Ticket } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, MessageSquare, Plus } from 'lucide-react';

export default function SupportPage() {
    const router = useRouter();
    const { data, isLoading } = useQuery({
        queryKey: ['tickets'],
        queryFn: () => SupportService.list({ page: 1, page_size: 50 }),
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'open': return 'bg-green-500';
            case 'in_progress': return 'bg-blue-500';
            case 'resolved': return 'bg-gray-500';
            case 'closed': return 'bg-gray-900';
            default: return 'bg-gray-500';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent': return 'text-red-500 font-bold';
            case 'high': return 'text-orange-500';
            case 'medium': return 'text-yellow-500';
            default: return 'text-gray-400';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Atendimentos</h2>
                    <p className="text-muted-foreground">Gerencie tickets e suporte aos clientes.</p>
                </div>
                {/* <Button onClick={() => router.push('/admin/support/new')}>
                    <Plus className="mr-2 h-4 w-4" /> Novo Ticket
                </Button> */}
            </div>

            <Card className="bg-[#1a1d24] border-gray-800">
                <CardHeader>
                    <CardTitle>Tickets Recentes</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className="rounded-md border border-gray-800">
                            <Table>
                                <TableHeader className="bg-[#111318]">
                                    <TableRow className="border-gray-800 hover:bg-transparent">
                                        <TableHead className="text-gray-400">ID</TableHead>
                                        <TableHead className="text-gray-400">Assunto</TableHead>
                                        <TableHead className="text-gray-400">Cliente</TableHead>
                                        <TableHead className="text-gray-400">Status</TableHead>
                                        <TableHead className="text-gray-400">Prioridade</TableHead>
                                        <TableHead className="text-gray-400">Data</TableHead>
                                        <TableHead className="text-right text-gray-400">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data?.items?.map((ticket: Ticket) => (
                                        <TableRow
                                            key={ticket.id}
                                            className="border-gray-800 hover:bg-[#252830] transition-colors cursor-pointer"
                                            onClick={() => router.push(`/admin/support/${ticket.id}`)}
                                        >
                                            <TableCell className="font-mono text-xs text-gray-500">
                                                #{ticket.id.slice(0, 8)}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {ticket.title}
                                                <div className="text-xs text-gray-500 mt-1 capitalize">
                                                    {ticket.category}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs">
                                                        {ticket.user?.name?.[0] || 'U'}
                                                    </div>
                                                    <span className="text-sm">{ticket.user?.name || 'Usuário'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={`${getStatusColor(ticket.status)} border-0`}>
                                                    {ticket.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <span className={`text-sm ${getPriorityColor(ticket.priority)} capitalize`}>
                                                    {ticket.priority}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-gray-400 text-sm">
                                                {new Date(ticket.created_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                                    <MessageSquare className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {(!data?.items || data.items.length === 0) && (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                                Nenhum ticket encontrado.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
