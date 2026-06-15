import fs from "fs";
import path from "path";
import Link from "next/link";
import { Download, Smartphone, ShieldCheck } from "lucide-react";

interface AppVersionManifest {
  version: string;
  versionCode: number;
  apkUrl: string;
  releaseNotes?: string;
  mandatory?: boolean;
  publishedAt?: string;
}

function readManifest(): AppVersionManifest {
  try {
    const filePath = path.join(process.cwd(), "public/app/version.json");
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as AppVersionManifest;
  } catch {
    return {
      version: "1.0.0",
      versionCode: 1,
      apkUrl: "/downloads/dunnaa-cliente.apk",
      releaseNotes: "Baixe o app DUNNAA para Android.",
    };
  }
}

export function ClientAppDownload() {
  const manifest = readManifest();
  const downloadPath = manifest.apkUrl.startsWith("http")
    ? manifest.apkUrl
    : manifest.apkUrl;

  return (
    <section className="border-t border-slate-200 bg-[#005f73] px-4 py-16 text-white">
      <div className="mx-auto max-w-2xl text-center">
        <Smartphone className="mx-auto h-16 w-16 text-[#e9d8a6]" />
        <h2 className="mt-6 text-3xl font-bold">Baixe o app DUNNAA</h2>
        <p className="mt-4 text-[#e9d8a6]/90">
          Android: instale o APK. iPhone: adicione à Tela de Início e use como app nativo.
        </p>

        <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-[#e9d8a6]">
          <ShieldCheck className="h-4 w-4" />
          Versão {manifest.version} (build {manifest.versionCode})
        </div>

        {manifest.releaseNotes ? (
          <p className="mt-6 text-left rounded-2xl bg-white/10 p-4 text-sm leading-relaxed text-white/90">
            {manifest.releaseNotes}
          </p>
        ) : null}

        <div className="mt-10 flex flex-col items-center justify-center gap-4">
          <Link
            href="/instalar/ios"
            className="inline-flex w-full max-w-md items-center justify-center gap-3 rounded-xl border-2 border-[#e9d8a6] bg-white/10 px-8 py-4 text-lg font-semibold text-white shadow-lg transition hover:bg-white/20"
          >
            <Smartphone className="h-6 w-6 text-[#e9d8a6]" />
            Instalar no iPhone (iOS)
          </Link>
          <p className="max-w-md text-sm text-white/70">
            Abre o guia e leva você ao app para usar{" "}
            <strong className="text-white">Compartilhar → Adicionar à Tela de Início</strong> no Safari.
          </p>

          <a
            href={downloadPath}
            download
            className="inline-flex w-full max-w-md items-center justify-center gap-3 rounded-xl bg-[#e9d8a6] px-8 py-4 text-lg font-semibold text-[#004a5a] shadow-lg transition hover:bg-[#f0e4b8]"
          >
            <Download className="h-6 w-6" />
            Baixar APK para Android
          </a>
          <p className="max-w-md text-sm text-white/70">
            Na primeira instalação, permita &quot;Instalar apps desconhecidos&quot; nas configurações do
            Android. Depois disso, o app avisa quando houver nova versão.
          </p>
          <Link
            href="/para-profissionais"
            className="text-sm text-[#e9d8a6] underline-offset-4 hover:underline"
          >
            Você é profissional? Conheça o DUNNAA Pro
          </Link>
        </div>
      </div>
    </section>
  );
}
