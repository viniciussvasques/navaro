import type { Metadata } from "next";
import Link from "next/link";
import { IosInstallWizard } from "@/components/IosInstallWizard";

export const metadata: Metadata = {
  title: "Instalar no iPhone | DUNNAA",
  description:
    "Coloque o DUNNAA na Tela de Início do iPhone em poucos toques — agende barbearias e salões como app.",
};

export default function InstalarIosPage() {
  return (
    <div className="min-h-[80vh] bg-gradient-to-br from-[#005f73] to-[#0a9396] px-4 py-16">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/para-clientes"
          className="text-sm text-white/70 hover:text-white transition-colors"
        >
          ← Voltar
        </Link>
        <div className="mt-8">
          <IosInstallWizard />
        </div>
      </div>
    </div>
  );
}
