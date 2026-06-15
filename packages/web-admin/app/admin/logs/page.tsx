"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Terminal, Trash2, Pause, Play, Download, Search, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

interface LogEntry {
    event: string;
    level: string;
    timestamp: string;
    logger?: string;
    [key: string]: any;
}

export default function LogsPage() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [status, setStatus] = useState<'connecting' | 'connected' | 'error' | 'paused'>('connecting');
    const [isPaused, setIsPaused] = useState(false);
    const [filter, setFilter] = useState('');
    const [levelFilter, setLevelFilter] = useState('all');
    const scrollRef = useRef<HTMLDivElement>(null);
    const eventSourceRef = useRef<EventSource | null>(null);
    const [isTriggering, setIsTriggering] = useState(false);

    useEffect(() => {
        if (!isPaused) {
            setStatus('connecting');
            // Use Next.js API route for SSE proxy (rewrites don't work well with SSE)
            const streamURL = '/api/admin/logs/stream';

            const eventSource = new EventSource(streamURL, { withCredentials: true });
            eventSourceRef.current = eventSource;

            eventSource.onopen = () => {
                setStatus('connected');
            };

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    setLogs(prev => {
                        const newLogs = [...prev, data];
                        return newLogs.slice(-500);
                    });
                } catch (err) {
                    console.error("Error parsing log data", err);
                }
            };

            eventSource.onerror = (err) => {
                console.error("SSE Error:", err);
                setStatus('error');
                eventSource.close();
            };

            return () => {
                eventSource.close();
                setStatus('paused');
            };
        } else {
            setStatus('paused');
        }
    }, [isPaused]);

    useEffect(() => {
        if (scrollRef.current && !isPaused) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs, isPaused]);

    const clearLogs = () => setLogs([]);

    const downloadLogs = () => {
        const text = logs.map(l => {
            const ev = typeof l.event === 'string' ? l.event : JSON.stringify(l.event);
            return `[${l.timestamp}] ${String(l.level ?? '').toUpperCase()}: ${ev}`;
        }).join('\n');
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs-${new Date().toISOString()}.txt`;
        a.click();
    };

    const filteredLogs = logs.filter(log => {
        const eventStr = typeof log.event === 'string' ? log.event : JSON.stringify(log.event ?? '');
        const loggerStr = typeof log.logger === 'string' ? log.logger : '';
        const matchesSearch =
            !filter.trim() ||
            eventStr.toLowerCase().includes(filter.toLowerCase()) ||
            (loggerStr && loggerStr.toLowerCase().includes(filter.toLowerCase()));
        const levelStr = typeof log.level === 'string' ? log.level : '';
        const matchesLevel =
            levelFilter === 'all' || levelStr.toLowerCase() === levelFilter.toLowerCase();
        return matchesSearch && matchesLevel;
    });

    const getLevelColor = (level: string) => {
        switch (level.toLowerCase()) {
            case 'error': return 'text-red-400';
            case 'warning': return 'text-yellow-400';
            case 'info': return 'text-blue-400';
            case 'debug': return 'text-gray-500';
            default: return 'text-white';
        }
    };

    return (
        <div className="h-full flex flex-col space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-bold flex items-center gap-3">
                            <Terminal className="text-blue-400" />
                            Monitoramento em Tempo Real
                        </h2>
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase transition-all ${status === 'connected' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                status === 'connecting' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse' :
                                    status === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                        'bg-gray-500/10 text-gray-400 border border-white/10'
                            }`}>
                            <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]' :
                                    status === 'connecting' ? 'bg-blue-400' :
                                        status === 'error' ? 'bg-red-400' :
                                            'bg-gray-400'
                                }`} />
                            {status === 'connected' ? 'Ao Vivo' :
                                status === 'connecting' ? 'Conectando...' :
                                    status === 'error' ? 'Erro de Conexão' : 'Pausado'}
                        </div>
                    </div>
                    <p className="text-gray-400 mt-1">Logs estruturados transmitidos diretamente do servidor DUNNAA.</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsPaused(!isPaused)}
                        className={`p-2 rounded-xl border transition-all ${isPaused ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}
                        title={isPaused ? "Retomar" : "Pausar"}
                    >
                        {isPaused ? <Play size={20} /> : <Pause size={20} />}
                    </button>
                    <button
                        onClick={clearLogs}
                        className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-red-400 hover:border-red-500/20 transition-all"
                        title="Limpar"
                    >
                        <Trash2 size={20} />
                    </button>
                    <button
                        onClick={downloadLogs}
                        className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-blue-400 hover:border-blue-500/20 transition-all"
                        title="Baixar Logs"
                    >
                        <Download size={20} />
                    </button>
                    <button
                        onClick={async () => {
                            if (isTriggering) return;
                            setIsTriggering(true);
                            try {
                                await api.post('/admin/logs/test');
                            } catch (err) {
                                console.error("Error triggering test log", err);
                            } finally {
                                setTimeout(() => setIsTriggering(false), 1000);
                            }
                        }}
                        disabled={isTriggering}
                        className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 text-sm font-bold ${isTriggering ? 'bg-white/10 text-gray-500' : 'bg-blue-500 text-white hover:bg-blue-600 active:scale-95'
                            }`}
                    >
                        {isTriggering ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
                        {isTriggering ? 'Enviando...' : 'Disparar Log de Teste'}
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap gap-4 items-center bg-white/5 p-4 rounded-2xl border border-white/10">
                <div className="flex-1 min-w-[200px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                        type="text"
                        placeholder="Filtrar logs por mensagem ou logger..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    />
                </div>

                <div className="flex border border-white/10 rounded-xl overflow-hidden bg-black/20">
                    {['all', 'error', 'warning', 'info'].map((lvl) => (
                        <button
                            key={lvl}
                            onClick={() => setLevelFilter(lvl)}
                            className={`px-4 py-2 text-xs font-bold uppercase transition-all ${levelFilter === lvl ? 'bg-blue-500 text-white' : 'text-gray-500 hover:text-white'}`}
                        >
                            {lvl}
                        </button>
                    ))}
                </div>

                <div className="text-xs text-gray-500 font-mono">
                    {filteredLogs.length} / {logs.length} eventos
                </div>
            </div>

            <div
                ref={scrollRef}
                className="flex-1 bg-black/40 border border-white/10 rounded-2xl p-6 font-mono text-sm overflow-y-auto min-h-[500px] relative"
            >
                <div className="space-y-1">
                    {filteredLogs.map((log, idx) => (
                        <div key={idx} className="group hover:bg-white/5 -mx-2 px-2 py-0.5 rounded transition-colors flex gap-4">
                            <span className="text-gray-600 shrink-0 whitespace-nowrap">
                                {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '--'}
                            </span>
                            <span className={`font-bold shrink-0 w-16 ${getLevelColor(String(log.level ?? ''))}`}>
                                {String(log.level ?? '').toUpperCase()}
                            </span>
                            <span className="text-gray-500 shrink-0 w-32 truncate" title={String(log.logger ?? '')}>
                                [{log.logger || 'root'}]
                            </span>
                            <span className="text-gray-200">
                                {typeof log.event === 'string' ? log.event : JSON.stringify(log.event)}
                                {Object.keys(log).filter(k => !['event', 'level', 'timestamp', 'logger', 'app', 'version', 'environment', 'mode'].includes(k)).map(k => (
                                    <span key={k} className="ml-2 text-xs text-blue-400/60">
                                        <span className="text-blue-400/40">{k}=</span>{JSON.stringify(log[k])}
                                    </span>
                                ))}
                            </span>
                        </div>
                    ))}
                    {filteredLogs.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center py-20 text-gray-600 italic">
                            {isPaused ? "Monitoramento pausado." : "Aguardando eventos do sistema..."}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
