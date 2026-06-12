"use client";

import { useFormStatus } from "react-dom";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size    = "sm" | "md";

const VARIANT: Record<Variant, string> = {
  primary:   "bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white",
  secondary: "bg-white hover:bg-slate-50 text-[var(--color-text)] border border-[var(--color-border)]",
  danger:    "bg-red-600 hover:bg-red-700 text-white",
  ghost:     "hover:bg-slate-100 text-[var(--color-muted)]",
};

const SIZE: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading,
  disabled,
  children,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={[
        "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        VARIANT[variant],
        SIZE[size],
        className,
      ].join(" ")}
    >
      {loading && (
        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}
      {children}
    </button>
  );
}

/** Submit button that auto-shows a spinner while the form action is pending */
export function SubmitButton({
  children,
  variant = "primary",
  size = "md",
  className = "",
}: {
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} size={size} loading={pending} className={className}>
      {children}
    </Button>
  );
}
