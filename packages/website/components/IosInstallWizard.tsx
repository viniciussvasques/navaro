"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Share, Smartphone, PlusSquare, CheckCircle2 } from "lucide-react";

const PWA_URL = "/app/?install=ios";

function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    nav.standalone === true
  );
}

export function IosInstallWizard() {
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setIos(isIosDevice());
    setInstalled(isStandalonePwa());
  }, []);

  const openPwaInstall = () => {
    window.location.href = PWA_URL;
  };

  if (installed) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-[#e9d8a6]" />
        <h1 className="mt-6 text-3xl font-bold text-white">DUNNAA já está instalado</h1>
        <p className="mt-4 text-white/80">Abra pelo ícone na Tela de Início do iPhone.</p>
        <Link
          href="/app/"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#e9d8a6] px-8 py-4 font-semibold text-[#004a5a]"
        >
          Abrir app
          <ArrowRight className="h-5 w-5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="text-center">
        <Smartphone className="mx-auto h-14 w-14 text-[#e9d8a6]" />
        <h1 className="mt-6 text-3xl font-bold text-white">Instalar DUNNAA no iPhone</h1>
        <p className="mt-4 text-[#e9d8a6]/90 leading-relaxed">
          {ios
            ? "A Apple não permite instalar com um toque como no Android. Em 2 passos você coloca o app na Tela de Início — igual a um app da loja."
            : "Abra esta página no Safari do iPhone para instalar o app."}
        </p>
      </div>

      <ol className="mt-10 space-y-4">
        <li className="flex gap-4 rounded-2xl border border-white/15 bg-white/10 p-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e9d8a6] text-sm font-bold text-[#004a5a]">
            1
          </span>
          <div>
            <p className="font-semibold text-white">Abrir o DUNNAA no Safari</p>
            <p className="mt-1 text-sm text-white/75">
              Toque no botão abaixo. A instalação precisa ser feita a partir de{" "}
              <strong className="text-white">dunnaa.com.br/app</strong>.
            </p>
          </div>
        </li>
        <li className="flex gap-4 rounded-2xl border border-white/15 bg-white/10 p-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e9d8a6] text-sm font-bold text-[#004a5a]">
            2
          </span>
          <div>
            <p className="flex items-center gap-2 font-semibold text-white">
              <Share className="h-4 w-4" />
              Compartilhar → Adicionar à Tela de Início
            </p>
            <p className="mt-1 text-sm text-white/75">
              Na barra do Safari, toque em <strong className="text-white">Compartilhar</strong> (quadrado com
              seta), role o menu e escolha{" "}
              <strong className="text-white">Adicionar à Tela de Início</strong>
              <PlusSquare className="inline h-3.5 w-3.5 ml-1" />.
            </p>
          </div>
        </li>
      </ol>

      <button
        type="button"
        onClick={openPwaInstall}
        className="mt-10 flex w-full items-center justify-center gap-3 rounded-2xl bg-[#e9d8a6] px-6 py-4 text-lg font-bold text-[#004a5a] shadow-xl transition hover:bg-[#f0e4b8]"
      >
        {ios ? "Continuar instalação" : "Abrir app no navegador"}
        <ArrowRight className="h-5 w-5" />
      </button>

      {!ios && (
        <p className="mt-6 text-center text-sm text-white/60">
          No iPhone, use o Safari — o Chrome no iOS não instala PWAs na Tela de Início.
        </p>
      )}

      <p className="mt-8 text-center text-xs text-white/50">
        Não é possível pular estes passos: a Apple exige que o usuário confirme manualmente.
      </p>
    </div>
  );
}

/** Link direto para fluxo de instalação iOS (PWA). */
export function iosInstallHref(): string {
  return "/instalar/ios";
}

/** Abre o PWA com modal de instalação (use em botões client-side). */
export function openIosPwaInstall(): void {
  window.location.href = PWA_URL;
}

export { isIosDevice, isStandalonePwa, PWA_URL };
