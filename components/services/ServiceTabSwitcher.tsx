"use client";

import Link from "next/link";

export function ServiceTabSwitcher({ active }: { active: "client" | "catalogue" }) {
  const tabs = [
    { key: "catalogue", label: "Service Types",    href: "/services" },
    { key: "client",    label: "Client Services",  href: "/services?tab=client" },
  ];

  return (
    <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
      {tabs.map(({ key, label, href }) => (
        <Link
          key={key}
          href={href}
          className={[
            "px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
            active === key
              ? "bg-white text-[var(--color-text)] shadow-sm"
              : "text-[var(--color-muted)] hover:text-[var(--color-text)]",
          ].join(" ")}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
