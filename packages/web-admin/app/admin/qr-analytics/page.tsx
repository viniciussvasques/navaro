"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  QrCode,
  Eye,
  UserPlus,
  Heart,
  CalendarCheck,
  TrendingUp,
  Loader2,
  Smartphone,
  BarChart3,
  Download,
  Search,
  Printer,
  ExternalLink,
  Check,
  Copy,
} from "lucide-react";

const formatNumber = (val: number) =>
  new Intl.NumberFormat("pt-BR").format(val);

const WEBSITE_URL = "https://dunnaa.com.br";

export default function QRAnalyticsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-qr-analytics"],
    queryFn: async () => {
      const res = await api.get("/admin/qr-analytics");
      return res.data;
    },
    retry: false,
  });

  // Fetch all establishments for QR generation
  const { data: estData, isLoading: estLoading } = useQuery({
    queryKey: ["admin-establishments-qr"],
    queryFn: async () => {
      const res = await api.get("/admin/establishments");
      return res.data;
    },
  });

  const establishments = estData?.items || [];
  const filteredEstablishments = establishments.filter(
    (e: any) =>
      e.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.slug?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getQrUrl = (slug: string, format: "png" | "svg", size = 1000) => {
    const smartLink = `${WEBSITE_URL}/go/${slug}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(smartLink)}&format=${format}&margin=10`;
  };

  const handleDownload = (slug: string, name: string, format: "png" | "svg") => {
    const size = format === "png" ? 1000 : 400;
    const url = getQrUrl(slug, format, size);
    const link = document.createElement("a");
    link.href = url;
    link.download = `qr-dunnaa-${slug}.${format}`;
    link.click();
  };

  const handleCopyLink = (slug: string) => {
    navigator.clipboard.writeText(`${WEBSITE_URL}/go/${slug}`);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 size={48} className="animate-spin text-blue-500" />
        <p className="text-gray-400 animate-pulse">
          Carregando analytics de QR Code...
        </p>
      </div>
    );
  }

  const stats = [
    {
      label: "Total de Scans",
      value: formatNumber(data?.total_scans || 0),
      icon: Eye,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      label: "Novos Cadastros",
      value: formatNumber(data?.total_conversions_signup || 0),
      icon: UserPlus,
      color: "text-green-400",
      bg: "bg-green-500/10",
    },
    {
      label: "Favoritaram",
      value: formatNumber(data?.total_conversions_favorite || 0),
      icon: Heart,
      color: "text-pink-400",
      bg: "bg-pink-500/10",
    },
    {
      label: "Agendaram",
      value: formatNumber(data?.total_conversions_appointment || 0),
      icon: CalendarCheck,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
    },
    {
      label: "Taxa de Conversao",
      value: `${data?.overall_conversion_rate || 0}%`,
      icon: TrendingUp,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold flex items-center gap-3">
          <QrCode className="text-blue-400" size={28} />
          QR Codes &amp; Analytics
        </h2>
        <p className="text-gray-400 mt-1">
          Gere QR Codes para imprimir nos cartazes de cada estabelecimento e acompanhe as estatisticas de scans.
        </p>
      </div>

      {/* ─── QR GENERATION SECTION ─── */}
      <div>
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Printer size={20} className="text-blue-400" />
          Gerar QR Codes para Impressao
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Selecione o estabelecimento, baixe o QR em alta resolucao (PNG para impressao, SVG para vetor) e mande imprimir nos cartazes.
          O mesmo QR serve para download do app, favoritar, check-in e fila.
        </p>

        {/* Search */}
        <div className="relative mb-4 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar estabelecimento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
          />
        </div>

        {/* Establishments Grid */}
        {estLoading ? (
          <div className="flex items-center gap-2 text-gray-400 text-sm py-8">
            <Loader2 size={16} className="animate-spin" />
            Carregando estabelecimentos...
          </div>
        ) : filteredEstablishments.length === 0 ? (
          <div className="p-8 bg-white/5 border border-white/10 rounded-2xl text-center">
            <p className="text-gray-500 text-sm">
              {searchTerm ? "Nenhum estabelecimento encontrado." : "Nenhum estabelecimento cadastrado."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredEstablishments.map((est: any) => (
              <div
                key={est.id}
                className="p-5 bg-white/5 border border-white/10 rounded-2xl hover:border-white/20 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{est.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {est.city}, {est.state} &middot; {est.category}
                    </p>
                  </div>
                  {/* Mini QR preview */}
                  <div className="w-16 h-16 rounded-lg bg-white p-1 ml-3 flex-shrink-0">
                    <img
                      src={getQrUrl(est.slug, "svg", 200)}
                      alt={`QR ${est.name}`}
                      className="w-full h-full"
                    />
                  </div>
                </div>

                {/* Smart link */}
                <div className="flex items-center gap-2 bg-black/20 rounded-lg px-3 py-2 mb-3">
                  <span className="text-xs text-gray-400 truncate flex-1">
                    {WEBSITE_URL}/go/{est.slug}
                  </span>
                  <button
                    onClick={() => handleCopyLink(est.slug)}
                    className="text-blue-400 hover:text-blue-300 transition-colors flex-shrink-0"
                  >
                    {copiedSlug === est.slug ? (
                      <Check size={14} />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                </div>

                {/* Download buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownload(est.slug, est.name, "png")}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg text-xs font-medium transition-colors"
                  >
                    <Download size={14} />
                    PNG (Impressao)
                  </button>
                  <button
                    onClick={() => handleDownload(est.slug, est.name, "svg")}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium transition-colors"
                  >
                    <Download size={14} />
                    SVG (Vetor)
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── ANALYTICS SECTION ─── */}
      <div className="border-t border-white/10 pt-8">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <BarChart3 size={20} className="text-blue-400" />
          Estatisticas de Scans
        </h3>

        {/* Global Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className="p-5 bg-white/5 border border-white/10 rounded-2xl hover:border-white/20 transition-all duration-300"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                  <stat.icon className={stat.color} size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-400">{stat.label}</p>
                  <h3 className="text-xl font-bold mt-0.5">{stat.value}</h3>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Top Establishments */}
        <h4 className="text-lg font-semibold mb-3">Ranking por Estabelecimento</h4>

        {!data?.top_establishments?.length ? (
          <div className="p-12 bg-white/5 border border-white/10 rounded-2xl text-center">
            <QrCode size={48} className="text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">
              Nenhum scan registrado ainda. Os dados aparecerao quando os
              clientes comecarem a escanear os QR Codes.
            </p>
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-9 gap-4 px-6 py-3 border-b border-white/10 text-xs text-gray-500 font-medium uppercase tracking-wider">
              <div className="col-span-2">Estabelecimento</div>
              <div className="text-center">Scans</div>
              <div className="text-center">Hoje</div>
              <div className="text-center">Semana</div>
              <div className="text-center">Cadastros</div>
              <div className="text-center">Favoritos</div>
              <div className="text-center">Conversao</div>
              <div className="text-center">Check-ins</div>
            </div>

            {/* Table Body */}
            {data?.top_establishments?.map((est: any, i: number) => (
              <div
                key={est.establishment_id}
                className="grid grid-cols-9 gap-4 px-6 py-4 border-b border-white/5 hover:bg-white/5 transition-colors items-center"
              >
                <div className="col-span-2 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400 border border-blue-500/30">
                    #{i + 1}
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {est.establishment_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {est.establishment_slug}
                    </p>
                  </div>
                </div>
                <div className="text-center">
                  <span className="text-sm font-semibold">
                    {formatNumber(est.total_scans)}
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-sm">{est.scans_today}</span>
                </div>
                <div className="text-center">
                  <span className="text-sm">{est.scans_this_week}</span>
                </div>
                <div className="text-center">
                  <span className="text-sm text-green-400 font-medium">
                    {est.conversions_signup}
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-sm text-pink-400 font-medium">
                    {est.conversions_favorite}
                  </span>
                </div>
                <div className="text-center">
                  <span
                    className={`text-sm font-semibold ${est.conversion_rate > 10 ? "text-green-400" : est.conversion_rate > 5 ? "text-amber-400" : "text-gray-400"}`}
                  >
                    {est.conversion_rate}%
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-sm text-cyan-400 font-medium">
                    {est.conversions_appointment || 0}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="p-6 bg-blue-500/5 border border-blue-500/20 rounded-2xl">
        <h4 className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-2">
          <Smartphone size={16} />
          Como funciona o QR Universal
        </h4>
        <ul className="text-sm text-gray-400 space-y-1.5">
          <li>
            1. <strong className="text-gray-300">Voce gera o QR</strong> aqui neste painel e manda imprimir em cartazes/adesivos
          </li>
          <li>
            2. <strong className="text-gray-300">Coloca no balcao</strong> de cada estabelecimento parceiro
          </li>
          <li>
            3. <strong className="text-gray-300">Cliente escaneia</strong> com a camera do celular ou pelo botao no app
          </li>
          <li>
            4. <strong className="text-gray-300">Se nao tem o app:</strong> vai para pagina inteligente → Play Store / App Store
          </li>
          <li>
            5. <strong className="text-gray-300">Se ja tem o app:</strong> abre direto no estabelecimento, auto-favorita
          </li>
          <li>
            6. <strong className="text-gray-300">Se tem agendamento hoje:</strong> faz check-in automatico
          </li>
          <li>
            7. <strong className="text-gray-300">Cada passo e rastreado</strong> e aparece nas estatisticas acima
          </li>
        </ul>
      </div>
    </div>
  );
}
