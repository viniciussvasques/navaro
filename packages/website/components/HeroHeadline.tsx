"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const SLIDES = [
  {
    eyebrow: "Agendamento premium",
    title: "Beleza e bem-estar",
    highlight: "na palma da sua mão",
    subtitle:
      "Agende cortes, tratamentos e momentos de autocuidado nos melhores estabelecimentos.",
  },
  {
    eyebrow: "Sem fila, sem stress",
    title: "Agende em segundos",
    highlight: "direto pelo app",
    subtitle: "Confirmação via WhatsApp, lembretes automáticos e zero telefonemas.",
  },
  {
    eyebrow: "Perto de você",
    title: "Profissionais de confiança",
    highlight: "a um toque de distância",
    subtitle: "Barbearias, salões, spas e clínicas de estética em um só ecossistema.",
  },
] as const;

const INTERVAL_MS = 5200;

export function HeroHeadline() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % SLIDES.length);
        setVisible(true);
      }, 420);
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  const slide = SLIDES[index];

  return (
    <div className="relative min-h-[280px] sm:min-h-[320px]">
      <div
        className={cn(
          "space-y-6 transition-all duration-500 ease-out",
          visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        )}
      >
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#e8c547]/90">
          {slide.eyebrow}
        </p>

        <h1 className="text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
          {slide.title}{" "}
          <span className="bg-gradient-to-r from-[#f0d875] via-[#e8c547] to-[#c9a227] bg-clip-text text-transparent">
            {slide.highlight}
          </span>
        </h1>

        <p className="max-w-xl text-lg leading-relaxed text-slate-300 sm:text-xl">
          {slide.subtitle}
        </p>
      </div>

      <div className="mt-10 flex items-center gap-2">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Slide ${i + 1}`}
            onClick={() => {
              setVisible(false);
              setTimeout(() => {
                setIndex(i);
                setVisible(true);
              }, 200);
            }}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              i === index ? "w-8 bg-[#e8c547]" : "w-2 bg-white/30 hover:bg-white/50"
            )}
          />
        ))}
      </div>
    </div>
  );
}
