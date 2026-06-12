interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={[
        "bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "default" | "blue" | "green" | "red" | "orange";
}

const accentMap = {
  default: "border-l-slate-300",
  blue:    "border-l-blue-500",
  green:   "border-l-green-500",
  red:     "border-l-red-500",
  orange:  "border-l-orange-500",
};

export function StatCard({ label, value, sub, accent = "default" }: StatCardProps) {
  return (
    <Card className={`p-5 border-l-4 ${accentMap[accent]}`}>
      <p className="text-sm text-[var(--color-muted)] font-medium">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[var(--color-text)]">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-[var(--color-muted)]">{sub}</p>}
    </Card>
  );
}
