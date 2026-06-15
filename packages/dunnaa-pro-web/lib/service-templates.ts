/**
 * Serviços pré-definidos por tipo de estabelecimento.
 * Genérico: serve barbearia, salão, clínica, spa.
 */

export type EstablishmentCategory =
  | "barbershop"
  | "salon"
  | "barber_salon"
  | "beauty_salon"
  | "esthetics"
  | "clinic"
  | "spa"
  | "other";

export interface ServiceTemplate {
  name: string;
  description?: string;
  price: number;
  duration_minutes: number;
}

/** Serviços comuns de barbearia */
const BARBERSHOP_TEMPLATES: ServiceTemplate[] = [
  { name: "Corte masculino", price: 45, duration_minutes: 30 },
  { name: "Barba", price: 30, duration_minutes: 20 },
  { name: "Corte + Barba", price: 65, duration_minutes: 45 },
  { name: "Sobrancelha", price: 15, duration_minutes: 10 },
  { name: "Pigmentação", price: 50, duration_minutes: 40 },
  { name: "Corte infantil", price: 35, duration_minutes: 25 },
  { name: "Nevou (degradê)", price: 20, duration_minutes: 15 },
  { name: "Hidratação", price: 40, duration_minutes: 30 },
  { name: "Relaxamento", price: 55, duration_minutes: 45 },
  { name: "Coloração", price: 80, duration_minutes: 60 },
];

/** Serviços de salão/beleza feminina */
const SALON_TEMPLATES: ServiceTemplate[] = [
  { name: "Corte feminino", price: 80, duration_minutes: 60 },
  { name: "Escova", price: 50, duration_minutes: 45 },
  { name: "Coloração", price: 120, duration_minutes: 90 },
  { name: "Mechas", price: 180, duration_minutes: 120 },
  { name: "Hidratação", price: 60, duration_minutes: 45 },
  { name: "Progressiva", price: 150, duration_minutes: 90 },
  { name: "Manicure", price: 35, duration_minutes: 45 },
  { name: "Pedicure", price: 45, duration_minutes: 50 },
  { name: "Depilação (sobrancelha)", price: 25, duration_minutes: 20 },
  { name: "Maquiagem", price: 90, duration_minutes: 60 },
];

/** Barbearia + Salão (misto) */
const BARBER_SALON_TEMPLATES: ServiceTemplate[] = [
  ...BARBERSHOP_TEMPLATES.slice(0, 6),
  ...SALON_TEMPLATES.slice(0, 4),
];

/** Estética / Clínica */
const ESTHETICS_TEMPLATES: ServiceTemplate[] = [
  { name: "Limpeza de pele", price: 120, duration_minutes: 60 },
  { name: "Peeling", price: 150, duration_minutes: 45 },
  { name: "Microneedling", price: 250, duration_minutes: 60 },
  { name: "Botox (por região)", price: 400, duration_minutes: 30 },
  { name: "Preenchimento", price: 350, duration_minutes: 45 },
  { name: "Depilação a laser (sessão)", price: 80, duration_minutes: 30 },
  { name: "Drenagem linfática", price: 100, duration_minutes: 50 },
  { name: "Design de sobrancelhas", price: 40, duration_minutes: 30 },
  { name: "Alongamento de cílios", price: 120, duration_minutes: 90 },
];

/** Spa */
const SPA_TEMPLATES: ServiceTemplate[] = [
  { name: "Massagem relaxante", price: 120, duration_minutes: 60 },
  { name: "Massagem terapêutica", price: 150, duration_minutes: 60 },
  { name: "Drenagem linfática", price: 100, duration_minutes: 50 },
  { name: "Reflexologia", price: 90, duration_minutes: 45 },
  { name: "Tratamento facial", price: 140, duration_minutes: 60 },
  { name: "Banho de lua", price: 80, duration_minutes: 45 },
  { name: "Escalda-pés", price: 50, duration_minutes: 30 },
  { name: "Day use", price: 200, duration_minutes: 240 },
];

/** Outros - lista mínima genérica */
const OTHER_TEMPLATES: ServiceTemplate[] = [
  { name: "Serviço 1", price: 50, duration_minutes: 30 },
  { name: "Serviço 2", price: 80, duration_minutes: 60 },
  { name: "Serviço 3", price: 120, duration_minutes: 90 },
];

export function getServiceTemplates(category: string): ServiceTemplate[] {
  const cat = (category || "other").toLowerCase();
  switch (cat) {
    case "barbershop":
      return BARBERSHOP_TEMPLATES;
    case "salon":
    case "beauty_salon":
      return SALON_TEMPLATES;
    case "barber_salon":
      return BARBER_SALON_TEMPLATES;
    case "esthetics":
    case "clinic":
      return ESTHETICS_TEMPLATES;
    case "spa":
      return SPA_TEMPLATES;
    default:
      return OTHER_TEMPLATES;
  }
}
