import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type PremiumCtaProps = {
  href: string;
  children: React.ReactNode;
  variant?: "gold" | "teal" | "outline" | "ghost";
  size?: "md" | "lg";
  external?: boolean;
  className?: string;
};

export function PremiumCta({
  href,
  children,
  variant = "gold",
  size = "lg",
  external,
  className,
}: PremiumCtaProps) {
  const base =
    "group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full font-semibold transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

  const sizes = {
    md: "px-6 py-3 text-sm",
    lg: "px-8 py-4 text-base sm:text-lg",
  };

  const variants = {
    gold:
      "bg-gradient-to-r from-[#c9a227] via-[#e8c547] to-[#b8922a] text-[#0a1628] shadow-[0_8px_32px_rgba(232,197,71,0.35)] hover:shadow-[0_12px_40px_rgba(232,197,71,0.5)] hover:scale-[1.02] focus-visible:outline-[#e8c547]",
    teal:
      "bg-gradient-to-r from-[#005f73] to-[#0a9396] text-white shadow-[0_8px_32px_rgba(0,95,115,0.35)] hover:shadow-[0_12px_40px_rgba(10,147,150,0.45)] hover:scale-[1.02] focus-visible:outline-[#0a9396]",
    outline:
      "border-2 border-white/30 bg-white/5 text-white backdrop-blur-sm hover:bg-white/10 hover:border-white/50",
    ghost: "text-[#005f73] hover:text-[#0a9396] underline-offset-4 hover:underline",
  };

  const shine = variant !== "ghost" && (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
    />
  );

  const content = (
    <>
      {shine}
      <span className="relative z-10 flex items-center gap-2">
        {children}
        {variant !== "ghost" && (
          <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
        )}
      </span>
    </>
  );

  const classes = cn(base, sizes[size], variants[variant], className);

  if (external || href.startsWith("http")) {
    return (
      <a href={href} className={classes} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      {content}
    </Link>
  );
}
