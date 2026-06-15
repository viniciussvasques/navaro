export const BRAND = {
  logo: "/brand/logo.svg",
  logoGold: "/brand/logo.svg",
  logoMark: "/brand/favicon.svg",
  icon: "/brand/favicon.svg",
} as const;

export const LOGO_SIZES = {
  login: { width: 480, height: 246, className: "h-24 w-auto sm:h-28 md:h-32" },
  sidebar: { width: 480, height: 246, className: "h-10 w-auto max-w-[200px]" },
} as const;

export function isSvgAsset(src: string): boolean {
  return src.endsWith(".svg");
}
