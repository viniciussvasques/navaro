/**
 * Categorias de estabelecimento mapeadas para temas visuais.
 * Cada tema altera cores, ícones e atmosfera da interface.
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

export const CATEGORY_LABELS: Record<EstablishmentCategory, string> = {
  barbershop: "Barbearia",
  salon: "Salão",
  barber_salon: "Barbearia + Salão",
  beauty_salon: "Salão de beleza",
  esthetics: "Estética",
  clinic: "Clínica",
  spa: "Spa",
  other: "Outro",
};

/** Mapeia categoria para data-theme no HTML */
export function getThemeFromCategory(category: string): string {
  const valid: EstablishmentCategory[] = [
    "barbershop",
    "salon",
    "barber_salon",
    "beauty_salon",
    "esthetics",
    "clinic",
    "spa",
    "other",
  ];
  return valid.includes(category as EstablishmentCategory) ? category : "default";
}
