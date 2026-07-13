"use client";

interface SpinningBorderButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  size?: "sm" | "md";
}

export function SpinningBorderButton({ onClick, children, size = "md" }: SpinningBorderButtonProps) {
  const padding = size === "sm" ? "px-4 py-2" : "px-5 py-2.5";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative inline-flex items-center gap-2 ${padding} text-sm font-semibold text-orange-600 hover:text-white bg-white rounded-lg overflow-hidden transition-colors`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute w-[200%] h-[200%] -top-1/2 -left-1/2"
        style={{
          background: "conic-gradient(from 0deg, transparent 60%, #f97316 80%, transparent 100%)",
          animation: "border-spin 2.5s linear infinite",
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-[2px] rounded-[6px] bg-white group-hover:bg-orange-500 transition-colors"
      />
      <span className="relative">{children}</span>
    </button>
  );
}
