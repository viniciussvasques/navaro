import Link from "next/link";
import { MapPin, Calendar, Star, Bell } from "lucide-react";
import { ClientAppDownload } from "@/components/ClientAppDownload";
import { BrandLogo } from "@/components/BrandLogo";
import { PremiumCta } from "@/components/PremiumCta";

export const metadata = {
  title: "Para clientes | DUNNAA",
  description: "Baixe o app DUNNAA: encontre estabelecimentos, agende horários e nunca mais esqueça um corte.",
};

const benefits = [
  { icon: MapPin, title: "Encontre estabelecimentos", description: "Barbearias e salões perto de você, com horários e avaliações." },
  { icon: Calendar, title: "Agende em poucos toques", description: "Escolha o serviço, o profissional e o horário em segundos." },
  { icon: Star, title: "Avaliações e fotos", description: "Veja o trabalho de outros clientes e escolha com confiança." },
  { icon: Bell, title: "Lembretes e confirmação", description: "Receba avisos antes do horário e confirme pelo celular." },
];

export default function ParaClientesPage() {
  return (
    <div>
      <section className="relative overflow-hidden bg-[#0a1628] px-4 py-20 sm:py-28">
        <div className="absolute inset-0 hero-mesh opacity-40" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="flex justify-center mb-8">
            <BrandLogo size="hero" priority />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Tudo que você precisa para{" "}
            <span className="text-[#e8c547]">agendar</span>
          </h1>
          <p className="mt-6 text-lg text-slate-300 max-w-2xl mx-auto">
            Encontre o barbeiro ou salão ideal, reserve seu horário e apareça no dia. Experiência premium, simples assim.
          </p>
          <div className="mt-10">
            <PremiumCta href="#download" variant="gold" size="lg">
              Baixar app
            </PremiumCta>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 px-4 py-16 bg-white">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold">Vantagens do app</h2>
          <ul className="mt-10 space-y-6">
            {benefits.map(({ icon: Icon, title, description }) => (
              <li
                key={title}
                className="premium-card flex gap-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#005f73]/10 to-[#e8c547]/10">
                  <Icon className="h-7 w-7 text-[#005f73]" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{title}</h3>
                  <p className="mt-2 text-slate-600">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div id="download">
        <ClientAppDownload />
      </div>

      <section className="border-t border-slate-200 px-4 py-12 bg-slate-50">
        <div className="mx-auto max-w-4xl text-center">
          <PremiumCta href="/" variant="ghost" size="md">
            Voltar ao início
          </PremiumCta>
        </div>
      </section>
    </div>
  );
}
