"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  className?: string;
};

export function ProPageHeader({ title, description, icon: Icon, actions, className }: Props) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 border-b border-[var(--color-border)] pb-6 md:flex-row md:items-end md:justify-between",
        className
      )}
    >
      <div className="space-y-2 min-w-0">
        <div className="flex items-center gap-3">
          {Icon ? (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-primary)]/15 text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/20">
              <Icon className="h-5 w-5" />
            </span>
          ) : null}
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)] md:text-3xl">
            {title}
          </h1>
        </div>
        {description ? (
          <p
            className={cn(
              "text-sm leading-relaxed text-[var(--color-text-muted)] max-w-2xl",
              Icon && "md:pl-14"
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div> : null}
    </header>
  );
}
