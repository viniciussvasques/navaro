/** Caminhos canônicos da marca DUNNAA (assets em /public/store). */
export const BRAND = {
  logo: "/store/logo.svg",
  logoGold: "/store/logo.svg",
  logoHeader: "/store/logo.svg",
  logoDark: "/store/logo-dark.svg",
  logoMark: "/store/favicon.svg",
  icon: "/store/favicon.svg",
  hero: "/store/hero.png",
} as const;

export type BrandLogoVariant = "gold" | "mark";
export type BrandTone = "light" | "dark";

/** Proporção do logo.svg (viewBox ~112×57 → ~1.95:1). */
export const LOGO_ASPECT = 480 / 246;

export const LOGO_SIZES = {
  header: { width: 480, height: 246, className: "h-10 w-auto sm:h-11 md:h-12" },
  hero: { width: 560, height: 287, className: "h-20 w-auto sm:h-28 md:h-32 lg:h-36" },
  footer: { width: 280, height: 144, className: "h-14 w-auto sm:h-16 md:h-[4.5rem]" },
  login: { width: 400, height: 205, className: "h-24 w-auto sm:h-28 md:h-32" },
  sidebar: { width: 200, height: 103, className: "h-11 w-auto" },
} as const;

export function isSvgAsset(src: string): boolean {
  return src.endsWith(".svg");
}
