"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  Download,
  Globe,
  Smartphone,
  Star,
  Clock,
  MapPin,
  Share,
} from "lucide-react";

const APK_URL = "/downloads/dunnaa-cliente.apk";
const WEB_APP_BASE = "/app";
const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://api.dunnaa.com.br/api/v1";
const DEEP_LINK_SCHEME = "dunnaa://";

interface Establishment {
  id: string;
  name: string;
  slug: string;
  category?: string;
  logo_url?: string;
  cover_url?: string;
  address?: string;
  city?: string;
  state?: string;
}

interface Props {
  slug: string;
  establishment: Establishment | null;
}

type Platform = "android" | "ios" | "unknown";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent.toLowerCase();
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  return "unknown";
}

function webAppUrl(establishmentId: string): string {
  const params = new URLSearchParams({
    auto_favorite: "true",
    from: "qr",
  });
  return `${WEB_APP_BASE}/establishment/${establishmentId}?${params.toString()}`;
}

export default function GoPageClient({ slug, establishment }: Props) {
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [scanRegistered, setScanRegistered] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());

    if (!scanRegistered) {
      fetch(`${API_URL}/qr/scan/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "poster" }),
      }).catch(() => {});
      setScanRegistered(true);
    }
  }, [slug, scanRegistered]);

  const handleContinueInBrowser = () => {
    if (establishment) {
      window.location.href = webAppUrl(establishment.id);
    }
  };

  const handleOpenApp = () => {
    if (establishment) {
      window.location.href = `${DEEP_LINK_SCHEME}establishment/${establishment.id}?auto_favorite=true`;
    }
  };

  const handleDownloadApk = () => {
    window.location.href = APK_URL;
  };

  const categoryLabel: Record<string, string> = {
    barbershop: "Barbearia",
    salon: "Salao de Beleza",
    beauty_salon: "Salao de Beleza",
    esthetics: "Estetica",
    spa: "Spa & Bem-estar",
    clinic: "Clinica",
  };

  if (!establishment) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#005f73] to-[#0a9396] text-white px-6">
        <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mb-6">
          <span className="text-3xl font-bold">D</span>
        </div>
        <h1 className="text-2xl font-bold mb-2">Estabelecimento nao encontrado</h1>
        <p className="text-white/70 text-center mb-8">
          O QR Code pode estar incorreto ou o estabelecimento foi removido.
        </p>
        <a
          href="https://dunnaa.com.br"
          className="px-6 py-3 bg-white text-[#005f73] font-semibold rounded-xl hover:bg-white/90 transition-colors"
        >
          Ir para o site
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#005f73] to-[#0a9396] flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
        <div className="mb-8">
          {establishment.logo_url ? (
            <div className="w-24 h-24 rounded-3xl overflow-hidden shadow-2xl border-4 border-white/30">
              <img
                src={establishment.logo_url}
                alt={establishment.name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-3xl bg-white/20 flex items-center justify-center shadow-2xl border-4 border-white/30">
              <span className="text-4xl font-bold text-white">
                {establishment.name.charAt(0)}
              </span>
            </div>
          )}
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
          {establishment.name}
        </h1>
        {establishment.category && (
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/15 text-white/90 text-sm font-medium mb-3">
            <Star className="w-3.5 h-3.5" />
            {categoryLabel[establishment.category] || establishment.category}
          </span>
        )}
        {establishment.city && establishment.state && (
          <p className="flex items-center gap-1.5 text-white/70 text-sm mb-8">
            <MapPin className="w-3.5 h-3.5" />
            {establishment.city} - {establishment.state}
          </p>
        )}

        <div className="w-full max-w-sm space-y-3">
          <button
            onClick={handleContinueInBrowser}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white text-[#005f73] font-bold rounded-2xl text-lg shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300"
          >
            <Globe className="w-5 h-5" />
            Continuar no navegador
            <ArrowRight className="w-5 h-5" />
          </button>

          {platform === "android" && (
            <button
              onClick={handleDownloadApk}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white/15 text-white font-semibold rounded-2xl text-base border border-white/20 hover:bg-white/25 transition-all duration-300"
            >
              <Download className="w-5 h-5" />
              Baixar app Android (APK)
            </button>
          )}

          {platform === "ios" && (
            <button
              type="button"
              onClick={() => {
                window.location.href = "/instalar/ios";
              }}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white/15 text-white font-semibold rounded-2xl text-base border border-white/20 hover:bg-white/25 transition-all duration-300"
            >
              <Share className="w-5 h-5" />
              Instalar no iPhone
            </button>
          )}

          <button
            onClick={handleOpenApp}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 text-white/90 font-medium rounded-2xl text-sm hover:bg-white/10 transition-all duration-300"
          >
            <Smartphone className="w-4 h-4" />
            Ja tenho o app instalado
          </button>

          {platform === "unknown" && (
            <button
              onClick={handleDownloadApk}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white/15 text-white font-semibold rounded-2xl text-sm border border-white/20 hover:bg-white/25 transition-all"
            >
              <Download className="w-4 h-4" />
              Baixar app Android (APK)
            </button>
          )}
        </div>

        <div className="mt-12 grid grid-cols-3 gap-6 w-full max-w-sm">
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <p className="text-xs text-white/70 text-center">Agende em segundos</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
              <Star className="w-5 h-5 text-white" />
            </div>
            <p className="text-xs text-white/70 text-center">Salve nos favoritos</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <p className="text-xs text-white/70 text-center">Funciona no iPhone</p>
          </div>
        </div>
      </div>

      <div className="py-6 text-center">
        <p className="text-white/40 text-xs">
          Powered by{" "}
          <a
            href="https://dunnaa.com.br"
            className="text-white/60 hover:text-white transition-colors font-medium"
          >
            Dunnaa
          </a>
        </p>
      </div>
    </div>
  );
}
