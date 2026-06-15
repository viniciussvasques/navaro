import Link from "next/link";
import { ProBrandLockup } from "@/components/ProBrandLockup";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  eyebrow: string;
  subtitle: string;
  maxWidth?: "sm" | "md" | "lg";
};

const WIDTH = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-2xl",
} as const;

export function AuthShell({ children, eyebrow, subtitle, maxWidth = "md" }: Props) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0a1628] p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(232,197,71,0.1),transparent_55%)]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[320px] w-[420px] rounded-full bg-[#0a9396]/10 blur-[100px]" />

      <div className={cn("relative z-10 w-full", WIDTH[maxWidth])}>
        <div className="mb-8 text-center sm:mb-10">
          <div className="mx-auto mb-6 max-w-md px-2">
            <ProBrandLockup href="/" onDark className="justify-center" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#e8c547]/85">
            {eyebrow}
          </p>
          <p className="mt-2 text-sm text-slate-400">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
