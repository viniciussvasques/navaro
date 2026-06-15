import Link from "next/link";
import { PRO_URL } from "@/lib/utils";
import {
  Calendar,
  Zap,
  CreditCard,
  BarChart3,
  Check,
  Sparkles,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { PremiumCta } from "@/components/PremiumCta";

export const metadata = {
  title: "Para estabelecimentos | DUNNAA",
  description:
    "Cadastre seu estabelecimento: comece de graça, agenda digital, menos faltas e planos Prata e Gold.",
};

const benefits = [
  { icon: Calendar, title: "Agenda digital 24h", description: "Seus clientes agendam a qualquer hora. Você define horários, serviços e profissionais." },
  { icon: Zap, title: "Menos faltas", description: "Lembretes e confirmações por WhatsApp reduzem no-show e deixam a agenda mais previsível." },
  { icon: CreditCard, title: "Pagamentos na palma da mão", description: "Aceite pagamentos e acompanhe entradas e saídas pelo painel." },
  { icon: BarChart3, title: "Relatórios e fila", description: "Fila de espera, check-in e visão do seu negócio para tomar melhores decisões." },
];

const plans = [
  {
    name: "Free",
    tagline: "Comece de graça",
    price: "R$ 0",
    period: "/mês",
    features: ["Até 2 profissionais", "Agenda e agendamentos online", "Lembretes básicos", "Suporte por e-mail"],
    cta: "Começar grátis",
    highlighted: false,
  },
  {
    name: "Prata",
    tagline: "Para crescer",
    price: "Sob consulta",
    period: "",
    features: ["Mais profissionais", "Menor taxa por agendamento", "Recursos avançados de fila", "Suporte prioritário"],
    cta: "Fale conosco",
    highlighted: true,
  },
  {
    name: "Gold",
    tagline: "Máximo desempenho",
    price: "Sob consulta",
    period: "",
    features: ["Tudo do Prata", "Taxa ainda menor", "Relatórios avançados", "Suporte dedicado"],
    cta: "Fale conosco",
    highlighted: false,
  },
];

export default function ParaEstabelecimentosPage() {
  return (
    <div>
      <section className="relative overflow-hidden bg-[#0a1628] px-4 py-20 sm:py-28">
        <div className="absolute inset-0 hero-mesh opacity-40" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="flex justify-center mb-8">
            <BrandLogo size="hero" priority />
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#e8c547]">
            Para estabelecimentos
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Ferramentas premium para o seu negócio
          </h1>
          <p className="mt-6 text-lg text-slate-300">
            Comece de graça. Agenda digital, menos faltas, pagamentos e relatórios. Evolua com planos Prata e Gold.
          </p>
          <div className="mt-10">
            <PremiumCta href={PRO_URL} variant="gold" size="lg" external>
              Cadastrar meu estabelecimento
            </PremiumCta>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 px-4 py-16 bg-white">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-bold">Por que usar o DUNNAA Pro?</h2>
          <ul className="mt-12 grid gap-6 sm:grid-cols-2">
            {benefits.map(({ icon: Icon, title, description }) => (
              <li key={title} className="premium-card flex gap-6 rounded-2xl border border-slate-100 p-6 shadow-sm">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#0a9396]/10">
                  <Icon className="h-7 w-7 text-[#0a9396]" />
                </div>
                <div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-2 text-slate-600">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50 px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center justify-center gap-2 text-[#005f73]">
            <Sparkles className="h-5 w-5" />
            <span className="font-medium">Planos</span>
          </div>
          <h2 className="mt-2 text-center text-2xl font-bold">Comece de graça. Evolua quando quiser.</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={
                  plan.highlighted
                    ? "premium-card relative rounded-2xl border-2 border-[#e8c547] bg-white p-6 shadow-xl ring-4 ring-[#e8c547]/10"
                    : "premium-card rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                }
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#c9a227] to-[#e8c547] px-4 py-1 text-xs font-bold text-[#0a1628]">
                    Recomendado
                  </span>
                )}
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <p className="mt-1 text-sm text-slate-600">{plan.tagline}</p>
                <p className="mt-4 text-2xl font-bold text-[#005f73]">
                  {plan.price}
                  <span className="text-base font-normal text-slate-600">{plan.period}</span>
                </p>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
                      <Check className="h-5 w-5 shrink-0 text-[#0a9396]" />
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href={PRO_URL}
                  className={
                    plan.highlighted
                      ? "mt-8 block w-full rounded-full bg-gradient-to-r from-[#c9a227] to-[#e8c547] py-3.5 text-center font-bold text-[#0a1628] transition hover:brightness-110"
                      : "mt-8 block w-full rounded-full border-2 border-[#005f73] py-3 text-center font-semibold text-[#005f73] transition hover:bg-[#005f73]/5"
                  }
                >
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 px-4 py-16 bg-[#0a1628]">
        <div className="mx-auto max-w-2xl text-center">
          <BrandLogo size="footer" className="mx-auto mb-8" />
          <h2 className="text-2xl font-bold text-white">Pronto para começar?</h2>
          <p className="mt-4 text-slate-400">
            Cadastre seu estabelecimento em poucos minutos. Sem cartão no plano Free.
          </p>
          <div className="mt-8">
            <PremiumCta href={PRO_URL} variant="gold" size="lg" external>
              Cadastrar estabelecimento
            </PremiumCta>
          </div>
          <p className="mt-6 text-sm text-slate-500">
            Já tem conta?{" "}
            <a href={`${PRO_URL}/login`} className="text-[#e8c547] font-medium hover:underline">
              Entrar no Pro
            </a>
          </p>
        </div>
      </section>

      <section className="border-t border-slate-200 px-4 py-12">
        <div className="mx-auto max-w-4xl text-center">
          <PremiumCta href="/" variant="ghost" size="md">
            Voltar ao início
          </PremiumCta>
        </div>
      </section>
    </div>
  );
}
