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
        "flex flex-col gap-3 border-b border-[var(--color-border)] pb-5 sm:gap-4 sm:pb-6 md:flex-row md:items-end md:justify-between",
        className
      )}
    >
      <div className="space-y-1.5 min-w-0">
        <div className="flex items-center gap-3">
          {Icon ? (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)]/15 text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/20 sm:h-11 sm:w-11 sm:rounded-2xl">
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </span>
          ) : null}
          <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-2xl md:text-3xl">
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
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
      ) : null}
    </header>
  );
}
