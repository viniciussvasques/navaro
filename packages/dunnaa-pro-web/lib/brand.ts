/** Assets de marca DUNNAA Pro. */
export const BRAND = {
  logo: "/brand/logo.svg",
  logoGold: "/brand/logo.svg",
  logoHeader: "/brand/logo.svg",
  logoMark: "/brand/favicon.svg",
  icon: "/brand/favicon.svg",
} as const;

export const LOGO_SIZES = {
  login: { width: 480, height: 246, className: "h-28 w-auto sm:h-32 md:h-36" },
  landing: { width: 480, height: 246, className: "h-32 w-auto sm:h-40 md:h-44" },
  sidebar: { width: 480, height: 246, className: "h-10 w-auto sm:h-11" },
} as const;

export function isSvgAsset(src: string): boolean {
  return src.endsWith(".svg");
}
