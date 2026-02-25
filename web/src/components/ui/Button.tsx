import { cn } from "../../lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
  loading?: boolean;
};

export function Button({ className, variant = "primary", loading = false, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "rf-btn disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "rf-btn-primary",
        variant === "ghost" && "rf-btn-ghost",
        variant === "danger" && "rf-btn bg-rose-500 text-white hover:bg-rose-600",
        className,
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? "Loading..." : children}
    </button>
  );
}