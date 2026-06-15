import Image from "next/image";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

type Props = {
  href?: string;
  className?: string;
  /** Em fundos escuros fixos (landing, auth) força o wordmark branco. */
  onDark?: boolean;
};

export function ProBrandLockup({ href = "/dashboard", className, onDark = false }: Props) {
  const content = (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <span className="relative block aspect-square h-10 shrink-0">
        <Image
          src={BRAND.icon}
          alt="DUNNAA"
          fill
          unoptimized
          priority
          className="object-contain"
        />
      </span>
      <span
        className={cn(
          "text-2xl font-extrabold leading-none tracking-tight",
          onDark ? "text-white" : "text-[var(--color-text-primary)]"
        )}
      >
        DUNNAA
      </span>
      <span className="shrink-0 rounded-md border border-[#e8c547]/35 bg-[#e8c547]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#e8c547]">
        Pro
      </span>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block transition-opacity hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
}
