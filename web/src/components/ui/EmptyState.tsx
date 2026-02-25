import { Inbox } from "lucide-react";

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rf-card flex flex-col items-center gap-2 p-8 text-center">
      <div className="rounded-full bg-white/10 p-3">
        <Inbox className="h-5 w-5 text-white/80" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="text-sm text-[rgb(var(--text-muted))]">{description}</p>
    </div>
  );
}