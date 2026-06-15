import Image from "next/image";
import Link from "next/link";
import { BRAND, LOGO_SIZES, isSvgAsset } from "@/lib/brand";
import { cn } from "@/lib/utils";

type Props = {
  size?: keyof typeof LOGO_SIZES;
  href?: string;
  className?: string;
  priority?: boolean;
};

export function BrandLogo({ size = "sidebar", href, className, priority }: Props) {
  const src = BRAND.logoGold;
  const dims = LOGO_SIZES[size];
  const svg = isSvgAsset(src);

  const img = (
    <Image
      src={src}
      alt="DUNNAA Admin"
      width={dims.width}
      height={dims.height}
      unoptimized={svg}
      priority={priority}
      className={cn(dims.className, "object-contain object-left", className)}
    />
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex shrink-0 hover:opacity-90 transition-opacity">
        {img}
      </Link>
    );
  }
  return img;
}
