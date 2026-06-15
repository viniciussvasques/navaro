import Image from "next/image";
import Link from "next/link";
import {
  BRAND,
  LOGO_SIZES,
  isSvgAsset,
  type BrandLogoVariant,
  type BrandTone,
} from "@/lib/brand";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  variant?: BrandLogoVariant;
  tone?: BrandTone;
  size?: keyof typeof LOGO_SIZES;
  href?: string;
  className?: string;
  containerClassName?: string;
  priority?: boolean;
  fillContainer?: boolean;
  header?: boolean;
};

function resolveSrc(variant: BrandLogoVariant, tone: BrandTone): string {
  if (variant === "mark") return BRAND.logoMark;
  return tone === "dark" ? BRAND.logoDark : BRAND.logo;
}

export function BrandLogo({
  variant = "gold",
  tone = "light",
  size = "header",
  href,
  className,
  containerClassName,
  priority = false,
  fillContainer = false,
  header = false,
}: BrandLogoProps) {
  const src = resolveSrc(variant, tone);
  const dims = LOGO_SIZES[size];
  const svg = isSvgAsset(src);

  const image = fillContainer ? (
    <span
      className={cn(
        "relative block",
        containerClassName || "h-full w-full min-h-[2.75rem] sm:min-h-[3.5rem]"
      )}
    >
      <Image
        src={src}
        alt="DUNNAA"
        fill
        unoptimized={svg}
        priority={priority}
        sizes="(max-width: 640px) 220px, 320px"
        className={cn("object-contain object-left", className)}
      />
    </span>
  ) : (
    <Image
      src={src}
      alt="DUNNAA"
      width={dims.width}
      height={dims.height}
      unoptimized={svg}
      priority={priority}
      className={cn(dims.className, "object-contain object-left", className)}
    />
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          "inline-flex shrink-0 items-center transition-opacity hover:opacity-90",
          header && "flex h-10 items-center sm:h-11 md:h-12",
          fillContainer && "h-full max-w-full py-0",
          fillContainer && containerClassName && "w-auto",
          !fillContainer && containerClassName
        )}
      >
        {image}
      </Link>
    );
  }

  return image;
}
