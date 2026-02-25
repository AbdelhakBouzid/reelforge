import { cn } from "../../lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <label className="block">
      {label ? <span className="mb-1.5 block text-sm font-semibold text-[rgb(var(--text))]">{label}</span> : null}
      <input className={cn("rf-input", className)} {...props} />
      {error ? <span className="mt-1 block text-xs text-rose-300">{error}</span> : null}
    </label>
  );
}