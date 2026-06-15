import { Quote } from "lucide-react";

const testimonials = [
  {
    quote:
      "O Dunnaa mudou a forma como meus clientes agendam. Menos ligações, menos faltas e agenda sempre organizada.",
    name: "Ricardo Mendes",
    role: "Salão de beleza, São Paulo",
    initial: "R",
  },
  {
    quote:
      "Uso tanto como cliente quanto no meu consultório. Recomendo para qualquer profissional que queira agenda digital.",
    name: "Dra. Fernanda Costa",
    role: "Clínica de estética, Rio de Janeiro",
    initial: "F",
  },
  {
    quote:
      "Finalmente um app que entende estabelecimento e cliente. Fila de espera e lembretes reduziram no-show na minha barbearia.",
    name: "Carlos Oliveira",
    role: "Barbearia, Belo Horizonte",
    initial: "C",
  },
  {
    quote:
      "Simples de usar. Meus clientes adoram agendar pelo celular e eu tenho tudo sob controle no painel.",
    name: "Ana Paula Silva",
    role: "Espaço de unhas, Curitiba",
    initial: "A",
  },
];

type Props = { className?: string };

export default function Testimonials({ className = "" }: Props) {
  return (
    <section className={`bg-white py-16 sm:py-20 ${className}`}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-center text-sm font-medium uppercase tracking-wide text-[#0a9396]">
          Depoimentos
        </p>
        <h2 className="mt-2 text-center text-3xl font-bold text-[#1a1a1a]">
          Quem usa recomenda
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-slate-600">
          Estabelecimentos e clientes de todo o Brasil que escolheram o Dunnaa.
        </p>
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {testimonials.map(({ quote, name, role, initial }) => (
            <div
              key={name}
              className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50/50 p-6 shadow-sm"
            >
              <Quote className="h-8 w-8 text-[#005f73]/30" />
              <p className="mt-4 flex-1 text-sm text-slate-700">&ldquo;{quote}&rdquo;</p>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#005f73] text-sm font-semibold text-white">
                  {initial}
                </div>
                <div>
                  <p className="font-semibold text-[#1a1a1a]">{name}</p>
                  <p className="text-xs text-slate-500">{role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
