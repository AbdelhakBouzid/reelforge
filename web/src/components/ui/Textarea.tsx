import { cn } from "../../lib/utils";

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
};

export function Textarea({ label, error, className, ...props }: TextareaProps) {
  return (
    <label className="block">
      {label ? <span className="mb-1.5 block text-sm font-semibold text-[rgb(var(--text))]">{label}</span> : null}
      <textarea className={cn("rf-input min-h-28 resize-y", className)} {...props} />
      {error ? <span className="mt-1 block text-xs text-rose-300">{error}</span> : null}
    </label>
  );
}