import Link from "next/link";
import Image from "next/image";
import { PRO_URL } from "@/lib/utils";
import { BRAND, isSvgAsset } from "@/lib/brand";
import {
  Smartphone,
  Store,
  Calendar,
  MapPin,
  Star,
  Zap,
  Scissors,
  Sparkles,
  User,
  CheckCircle,
} from "lucide-react";
import StoreBadges from "@/components/StoreBadges";
import Testimonials from "@/components/Testimonials";
import TrustBadges from "@/components/TrustBadges";
import { HeroHeadline } from "@/components/HeroHeadline";
import { BrandLogo } from "@/components/BrandLogo";
import { PremiumCta } from "@/components/PremiumCta";

export default function HomePage() {
  return (
    <div className="font-sans text-[var(--color-text-primary)] overflow-x-hidden">
      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-[#001f2b]">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-tr from-[#001f2b] via-[#001f2b]/85 to-[#001f2b]/40 z-10" />
          <div className="absolute inset-0 hero-mesh z-[5]" />
          <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
            <div className="animate-shine absolute top-0 left-0 h-full w-full bg-gradient-to-r from-transparent via-white/5 to-transparent" />
          </div>
          <Image
            src={BRAND.hero}
            alt=""
            fill
            priority
            className="object-cover opacity-50"
            sizes="100vw"
          />
        </div>

        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#e8c547]/10 rounded-full blur-[100px] animate-glow-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#0a9396]/15 rounded-full blur-[80px] animate-glow-pulse stagger-2" />

        <div className="relative z-30 mx-auto max-w-7xl px-6 lg:px-8 py-20 sm:py-28 w-full">
          <div className="max-w-2xl text-left">
            <div className="opacity-0-start animate-fade-up">
              <HeroHeadline />
            </div>

            <div className="opacity-0-start animate-fade-up stagger-2 mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <PremiumCta href="/para-clientes" variant="gold" size="lg">
                Baixar app cliente
              </PremiumCta>
              <PremiumCta href={PRO_URL} variant="outline" size="lg" external>
                Sou estabelecimento
              </PremiumCta>
            </div>

            <div className="opacity-0-start animate-fade-up stagger-3 mt-10 flex flex-col items-start gap-6">
              <StoreBadges androidAvailable={false} iosAvailable={false} />
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 text-[#e8c547] fill-[#e8c547]" /> 4.9 nas lojas
                </span>
                <span className="hidden sm:inline h-1 w-1 rounded-full bg-slate-600" />
                <span>+10 mil agendamentos</span>
                <span className="hidden sm:inline h-1 w-1 rounded-full bg-slate-600" />
                <span>Confirmação via WhatsApp</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-24 sm:py-32 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#c9a227]">Serviços</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Beleza, estética e bem-estar
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Explore categorias premium disponíveis no ecossistema DUNNAA.
            </p>
          </div>
          <div className="mx-auto mt-16 lg:mt-20">
            <dl className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { name: "Barbearia", icon: Scissors, image: "/services/barbearia.png", description: "Cortes clássicos, barba e acabamento impecável." },
                { name: "Salão de Beleza", icon: Sparkles, image: "/services/salao.jpg", description: "Cabelo, unhas, maquiagem e muito mais." },
                { name: "Estética", icon: User, image: "/services/estetica.jpg", description: "Tratamentos faciais, corporais e depilação." },
                { name: "Spa & Bem-estar", icon: Zap, image: "/services/spa.jpg", description: "Massagens e terapias para relaxar." },
              ].map((feature) => (
                <div
                  key={feature.name}
                  className="premium-card group flex flex-col items-center rounded-3xl border border-slate-100 bg-white p-6 text-center shadow-sm"
                >
                  <div className="relative mb-6 h-32 w-32 overflow-hidden rounded-3xl shadow-lg ring-1 ring-slate-900/5">
                    <Image src={feature.image} alt={feature.name} fill sizes="128px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute bottom-2 right-2 rounded-full bg-white/90 p-2 shadow-md backdrop-blur">
                      <feature.icon className="h-4 w-4 text-[#005f73]" aria-hidden />
                    </div>
                  </div>
                  <dt className="text-xl font-semibold">{feature.name}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-slate-600">{feature.description}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Para clientes */}
      <section className="bg-gradient-to-b from-slate-50 to-white py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2 lg:gap-24">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0a9396]">App cliente</p>
              <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Para você</h2>
              <p className="mt-6 text-lg leading-relaxed text-slate-600">
                Sua rotina de beleza merece praticidade. O DUNNAA coloca agendamento, avaliações e lembretes no seu bolso.
              </p>
              <ul className="mt-10 space-y-6 text-slate-600">
                {[
                  { icon: MapPin, title: "Perto de você", text: "Encontre os melhores profissionais na sua região." },
                  { icon: Calendar, title: "Agende 24/7", text: "Marque horário a qualquer momento, sem fila no telefone." },
                  { icon: Star, title: "Confiança total", text: "Avaliações reais e fotos de trabalhos anteriores." },
                ].map(({ icon: Icon, title, text }) => (
                  <li key={title} className="flex gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#005f73]/10">
                      <Icon className="h-5 w-5 text-[#005f73]" />
                    </div>
                    <span>
                      <strong className="font-semibold text-[var(--color-text-primary)]">{title}.</strong> {text}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-10">
                <PremiumCta href="/para-clientes" variant="teal" size="md">
                  Conhecer o app
                </PremiumCta>
              </div>
            </div>
            <div className="relative mx-auto w-full max-w-sm animate-float">
              <div className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-br from-[#e8c547]/20 to-[#0a9396]/20 blur-2xl" />
              <div className="relative aspect-[9/19] overflow-hidden rounded-[2rem] border border-slate-200 bg-[#0a1628] shadow-2xl ring-1 ring-slate-900/10">
                <Image src={BRAND.icon} alt="App DUNNAA" fill unoptimized={isSvgAsset(BRAND.icon)} className="object-contain p-8" sizes="400px" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <Testimonials />

      {/* Para negócios */}
      <section className="relative isolate overflow-hidden bg-[#0a1628] py-24 sm:py-32">
        <div className="absolute inset-0 hero-mesh opacity-50" />
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center lg:mx-0 lg:text-left">
            <BrandLogo size="footer" className="mx-auto lg:mx-0 mb-8" />
            <h2 className="text-3xl font-bold text-white sm:text-4xl">Para o seu negócio</h2>
            <p className="mt-6 text-lg leading-relaxed text-slate-300">
              Menos tempo no telefone, mais tempo no que você faz de melhor. Gestão completa com DUNNAA Pro.
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-6 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            {[
              { title: "Gestão completa", desc: "Agenda, financeiro, comissões e estoque em um só lugar.", icon: Store },
              { title: "Marketing automático", desc: "Lembretes e campanhas para fidelizar clientes.", icon: Zap },
              { title: "Menos no-show", desc: "Confirmações via WhatsApp e notificações push.", icon: CheckCircle },
            ].map((card) => (
              <div
                key={card.title}
                className="premium-card flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
              >
                <card.icon className="h-7 w-5 shrink-0 text-[#e8c547]" aria-hidden />
                <div>
                  <h3 className="font-semibold text-white">{card.title}</h3>
                  <p className="mt-2 text-sm text-slate-400">{card.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-14 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 border-t border-white/10 pt-14">
            <PremiumCta href={PRO_URL} variant="gold" size="lg" external>
              Começar grátis — DUNNAA Pro
            </PremiumCta>
            <Link href="/para-estabelecimentos" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
              Ver planos e vantagens →
            </Link>
          </div>
        </div>
      </section>

      <TrustBadges className="bg-white border-none py-16" />
    </div>
  );
}
