import Image from "next/image";
import Link from "next/link";
import { BRAND, LOGO_SIZES, isSvgAsset } from "@/lib/brand";
import { cn } from "@/lib/utils";

type Props = {
  size?: keyof typeof LOGO_SIZES;
  href?: string;
  className?: string;
  containerClassName?: string;
  priority?: boolean;
  fillContainer?: boolean;
  mark?: boolean;
};

export function BrandLogo({
  size = "sidebar",
  href,
  className,
  containerClassName,
  priority = false,
  fillContainer = false,
  mark = false,
}: Props) {
  const src = mark ? BRAND.logoMark : BRAND.logo;
  const dims = LOGO_SIZES[size];
  const svg = isSvgAsset(src);

  const image = fillContainer ? (
    <span
      className={cn(
        "relative block",
        containerClassName || "h-full w-full min-h-[3rem] sm:min-h-[3.5rem]"
      )}
    >
      <Image
        src={src}
        alt="DUNNAA Pro"
        fill
        unoptimized={svg}
        priority={priority}
        sizes="(max-width: 640px) 200px, 280px"
        className={cn("object-contain object-left", className)}
      />
    </span>
  ) : (
    <Image
      src={src}
      alt="DUNNAA Pro"
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
          "inline-flex shrink-0 transition-opacity hover:opacity-90",
          fillContainer && "h-full w-full max-w-full items-stretch",
          !fillContainer && containerClassName
        )}
      >
        {image}
      </Link>
    );
  }

  return image;
}
