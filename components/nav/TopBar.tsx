interface TopBarProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  center?: React.ReactNode;
}

export function TopBar({ title, description, actions, center }: TopBarProps) {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-[var(--color-surface)] border-b border-[var(--color-border)] shrink-0">
      <div>
        <h1 className="text-lg font-semibold text-[var(--color-text)]">{title}</h1>
        {description && (
          <p className="text-sm text-[var(--color-muted)] mt-0.5">{description}</p>
        )}
      </div>
      {center && <div className="flex items-center">{center}</div>}
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </header>
  );
}
