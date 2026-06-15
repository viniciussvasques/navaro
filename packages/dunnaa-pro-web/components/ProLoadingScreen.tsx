import { Loader2 } from "lucide-react";
import { ProBrandLockup } from "@/components/ProBrandLockup";

export function ProLoadingScreen({ message = "Carregando..." }: { message?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[var(--color-background)] px-6">
      <ProBrandLockup href="/" className="justify-center [&_span:first-child]:h-14 sm:[&_span:first-child]:h-16" />
      <div className="flex items-center gap-3 text-[var(--color-text-muted)]">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--color-primary)]" />
        <span className="text-sm">{message}</span>
      </div>
    </div>
  );
}
