import { cn } from "@/lib/utils";

const MAX_WIDTH = {
  md: "max-w-3xl",
  lg: "max-w-4xl",
  xl: "max-w-5xl",
  full: "max-w-none",
} as const;

type Props = {
  children: React.ReactNode;
  className?: string;
  maxWidth?: keyof typeof MAX_WIDTH;
};

export function ProPageShell({ children, className, maxWidth = "xl" }: Props) {
  return (
    <div className={cn("mx-auto w-full space-y-6", MAX_WIDTH[maxWidth], className)}>
      {children}
    </div>
  );
}
