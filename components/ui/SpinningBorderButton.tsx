"use client";

interface SpinningBorderButtonProps {
  onClick?: () => void;
  href?: string;
  children: React.ReactNode;
  size?: "sm" | "md";
  variant?: "orange" | "green";
  dark?: boolean;
}

export function SpinningBorderButton({ onClick, href, children, size = "md", variant = "orange", dark = false }: SpinningBorderButtonProps) {
  const padding = size === "sm" ? "px-4 py-2" : "px-5 py-2.5";
  const isGreen = variant === "green";
  const textColor = isGreen ? "text-green-500 hover:text-white" : "text-orange-500 hover:text-white";
  const spinColor = isGreen ? "#16a34a" : "#f97316";
  const hoverBg  = isGreen ? "group-hover:bg-green-600" : "group-hover:bg-orange-500";
  const bg       = dark ? "bg-[#1e293b]" : "bg-white";
  const cls = `group relative inline-flex items-center gap-2 ${padding} text-sm font-semibold ${textColor} ${bg} rounded-lg overflow-hidden transition-colors`;

  const inner = (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute w-[200%] h-[200%] -top-1/2 -left-1/2"
        style={{
          background: `conic-gradient(from 0deg, transparent 60%, ${spinColor} 80%, transparent 100%)`,
          animation: "border-spin 2.5s linear infinite",
        }}
      />
      <span aria-hidden className={`pointer-events-none absolute inset-[2px] rounded-[6px] ${bg} ${hoverBg} transition-colors`} />
      <span className="relative inline-flex items-center gap-1.5">{children}</span>
    </>
  );

  if (href) {
    return <a href={href} className={cls}>{inner}</a>;
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}
