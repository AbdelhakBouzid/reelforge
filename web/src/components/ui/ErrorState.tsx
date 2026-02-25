import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";

export function ErrorState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rf-card flex flex-col items-center gap-3 p-8 text-center">
      <div className="rounded-full bg-rose-500/20 p-3">
        <AlertTriangle className="h-5 w-5 text-rose-300" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="text-sm text-[rgb(var(--text-muted))]">{description}</p>
      {actionLabel && onAction ? (
        <Button type="button" variant="ghost" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}