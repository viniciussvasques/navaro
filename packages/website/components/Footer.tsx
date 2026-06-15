import Link from "next/link";
import Image from "next/image";
import { PRO_URL } from "@/lib/utils";
import { BRAND, isSvgAsset } from "@/lib/brand";
import { BrandLogo } from "@/components/BrandLogo";

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-slate-800 bg-[#0a1628] text-white">
      <div className="absolute inset-0 hero-mesh opacity-60 pointer-events-none" />
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-4">
          <div className="md:col-span-2 space-y-5">
            <BrandLogo size="footer" tone="dark" />
            <p className="max-w-md text-sm leading-relaxed text-slate-400">
              Beleza e bem-estar na palma da mão. Conectamos clientes e estabelecimentos com
              agendamento inteligente, WhatsApp e pagamentos.
            </p>
            <div className="flex items-center gap-3">
              <Image
                src={BRAND.icon}
                alt=""
                width={40}
                height={40}
                unoptimized={isSvgAsset(BRAND.icon)}
                className="h-10 w-10 object-contain"
              />
              <span className="text-xs text-slate-500">App DUNNAA · iOS e Android</span>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#e8c547]">
              Para você
            </h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href="/para-clientes" className="text-sm text-slate-400 transition-colors hover:text-white">
                  Baixar o app
                </Link>
              </li>
              <li>
                <Link href="/para-clientes" className="text-sm text-slate-400 transition-colors hover:text-white">
                  Vantagens
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#e8c547]">
              Estabelecimentos
            </h3>
            <ul className="mt-4 space-y-3">
              <li>
                <a href={PRO_URL} className="text-sm text-slate-400 transition-colors hover:text-white">
                  Cadastrar estabelecimento
                </a>
              </li>
              <li>
                <a href={`${PRO_URL}/login`} className="text-sm text-slate-400 transition-colors hover:text-white">
                  Entrar no Pro
                </a>
              </li>
              <li>
                <Link href="/para-estabelecimentos" className="text-sm text-slate-400 transition-colors hover:text-white">
                  Planos e vantagens
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-14 border-t border-white/10 pt-8 text-center text-sm text-slate-500">
          &copy; {new Date().getFullYear()} DUNNAA. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
