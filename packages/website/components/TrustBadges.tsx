import { Shield, Lock, Award } from "lucide-react";

const items = [
  { icon: Shield, title: "Plataforma segura", description: "Seus dados e pagamentos protegidos com os mais altos padrões." },
  { icon: Lock, title: "Certificado SSL", description: "Conexão criptografada em todo o site e aplicativo." },
  { icon: Award, title: "Selo de confiança", description: "Práticas aprovadas e compromisso com a privacidade." },
];

export default function TrustBadges({ className = "" }: { className?: string }) {
  return (
    <section className={"border-y border-slate-200 bg-slate-50/50 py-12 " + className}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-center text-sm font-medium uppercase tracking-wide text-slate-500">
          Selo de certificação
        </p>
        <div className="mt-8 grid gap-8 sm:grid-cols-3">
          {items.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#005f73]/10">
                <Icon className="h-7 w-7 text-[#005f73]" />
              </div>
              <h3 className="mt-4 font-semibold text-[#1a1a1a]">{title}</h3>
              <p className="mt-1 max-w-xs text-sm text-slate-600">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
