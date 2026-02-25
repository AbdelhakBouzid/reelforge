import { cn } from "../../lib/utils";

type BadgeProps = {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warn" | "danger";
};

export function Badge({ children, tone = "neutral" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        tone === "neutral" && "bg-white/10 text-white/90",
        tone === "success" && "bg-emerald-500/20 text-emerald-200",
        tone === "warn" && "bg-amber-500/20 text-amber-200",
        tone === "danger" && "bg-rose-500/20 text-rose-200",
      )}
    >
      {children}
    </span>
  );
}