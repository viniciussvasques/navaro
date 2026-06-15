"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
    QrCode,
    RefreshCw,
    CheckCircle,
    AlertCircle,
    Loader2,
    Smartphone,
    Settings,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function WhatsAppBridgePage() {
    const [refetchTrigger, setRefetchTrigger] = useState(0);
    const [disconnecting, setDisconnecting] = useState(false);

    const { data: status, isLoading: statusLoading, error: statusError, refetch: refetchStatus } = useQuery({
        queryKey: ["whatsapp-bridge-status", refetchTrigger],
        queryFn: async () => {
            const res = await api.get("/admin/whatsapp-bridge/status");
            return res.data as { connected: boolean; qr?: string; error?: { code?: number; message?: string } };
        },
        refetchInterval: (query) => {
            const d = query.state.data as { connected?: boolean; qr?: string } | undefined;
            if (d?.connected) return false;
            return d?.qr ? 10000 : 5000;
        },
        refetchIntervalInBackground: false,
    });

    const handleAtualizarQr = () => {
        setRefetchTrigger((t) => t + 1);
        refetchStatus();
    };

    const handleDisconnect = async () => {
        setDisconnecting(true);
        try {
            await api.post("/admin/whatsapp-bridge/disconnect");
            setRefetchTrigger((t) => t + 1);
        } catch (e) {
            console.error("Erro ao desconectar bridge", e);
        } finally {
            setDisconnecting(false);
        }
    };

    // O bridge retorna qr já como data URL PNG (data:image/png;base64,...)
    const connected = status?.connected === true;
    const qr = status?.qr;
    const bridgeError = status?.error;
    const loading = statusLoading;
    const error = statusError;

    return (
        <div className="space-y-8 max-w-2xl mx-auto pb-12">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold flex items-center gap-2">
                        <QrCode className="text-green-500" size={32} />
                        WhatsApp Bridge
                    </h2>
                    <p className="text-gray-400 mt-1 max-w-lg">
                        Vincule um número via QR Code para OTP, agendamentos e fila. Ative em{" "}
                        <strong className="text-white">Configurações → WhatsApp</strong> com provider{" "}
                        <code className="text-green-300 bg-white/5 px-1 rounded">bridge</code>.
                    </p>
                </div>
                <Link href="/admin/settings">
                    <Button variant="outline" size="sm" className="border-white/10 bg-white/5">
                        <Settings className="mr-2" size={14} />
                        Configurações
                    </Button>
                </Link>
            </div>

            <Card className="border-white/10 bg-white/[0.03]">
                <CardContent className="pt-6">
                {loading && !status && (
                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                        <Loader2 className="animate-spin text-blue-500" size={40} />
                        <p className="text-gray-400">Verificando bridge...</p>
                    </div>
                )}

                {error && (
                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                        <AlertCircle className="text-amber-500" size={48} />
                        <p className="text-gray-300 text-center">
                            {(error as any)?.response?.data?.detail || "Bridge indisponível."}
                        </p>
                        <p className="text-gray-500 text-sm text-center max-w-md">
                            Inicie o serviço: <code className="bg-white/5 px-2 py-1 rounded">cd packages/whatsapp-bridge && npm start</code>
                        </p>
                        <button
                            onClick={handleAtualizarQr}
                            className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white transition-colors"
                        >
                            <RefreshCw size={16} />
                            Tentar novamente
                        </button>
                    </div>
                )}

                {!loading && !error && connected && (
                    <div className="flex flex-col items-center justify-center py-8 gap-4">
                        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                            <CheckCircle className="text-green-500" size={40} />
                        </div>
                        <Badge variant="outline" className="border-green-500/40 text-green-400">
                            Conectado
                        </Badge>
                        <h3 className="text-xl font-semibold text-white">Pronto para enviar</h3>
                        <p className="text-gray-400 text-sm text-center max-w-sm">
                            O número já está vinculado. Notificações (OTP, agendamentos, fila) estão sendo enviadas via bridge.
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                            <button
                                onClick={handleAtualizarQr}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white transition-colors"
                            >
                                <RefreshCw size={16} />
                                Atualizar status
                            </button>
                            <button
                                onClick={handleDisconnect}
                                disabled={disconnecting}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600/90 hover:bg-red-500 text-white transition-colors disabled:opacity-60"
                            >
                                <Smartphone size={16} />
                                {disconnecting ? "Desconectando..." : "Desconectar e trocar número"}
                            </button>
                        </div>
                    </div>
                )}

                {!loading && !error && !connected && qr && (
                    <div className="flex flex-col items-center justify-center py-6 gap-6">
                        <div className="flex items-center gap-2 text-amber-400">
                            <Smartphone size={20} />
                            <span className="font-medium">Escaneie o QR Code com o WhatsApp</span>
                        </div>
                        <div className="p-4 bg-white rounded-2xl">
                            <img
                                src={qr}
                                alt="QR Code WhatsApp"
                                className="w-64 h-64 object-contain"
                            />
                        </div>
                        <p className="text-gray-500 text-sm text-center max-w-sm">
                            Abra o WhatsApp no celular → Dispositivos vinculados → Vincular dispositivo → Escaneie o código acima.
                        </p>
                        <button
                            onClick={handleAtualizarQr}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
                        >
                            <RefreshCw size={18} />
                            Atualizar QR
                        </button>
                    </div>
                )}

                {!loading && !error && !connected && !qr && status && (
                    <div className="flex flex-col items-center justify-center py-8 gap-4">
                        {bridgeError ? (
                            <>
                                <AlertCircle className="text-amber-500" size={36} />
                                <p className="text-gray-300 text-center">
                                    Falha de conexão com WhatsApp {bridgeError.code != null && `(código ${bridgeError.code})`}
                                </p>
                                <p className="text-gray-500 text-sm text-center max-w-md">
                                    {bridgeError.code === 405 && "Connection Failure: mesmo IP/número já conectado em outro lugar, rede bloqueada ou firewall. Tente em outra rede ou aguarde e clique em Atualizar QR."}
                                    {bridgeError.code !== 405 && bridgeError.message && bridgeError.message}
                                </p>
                            </>
                        ) : (
                            <>
                                <Loader2 className="animate-spin text-blue-500" size={36} />
                                <p className="text-gray-400">Aguardando QR do bridge...</p>
                                <p className="text-gray-500 text-sm text-center max-w-sm">
                                    O bridge gera o QR em alguns segundos. Se não aparecer, confira: <code className="bg-white/5 px-1 rounded">docker compose logs whatsapp-bridge</code>
                                </p>
                            </>
                        )}
                        <button
                            onClick={handleAtualizarQr}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white transition-colors"
                        >
                            <RefreshCw size={16} />
                            Atualizar QR
                        </button>
                    </div>
                )}
            </CardContent>
            </Card>
        </div>
    );
}
