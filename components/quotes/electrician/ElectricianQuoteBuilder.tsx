"use client";

import { useState } from "react";
import { type EngineSettings } from "@/lib/electricianQuoteEngine";
import { GpoCalculator } from "./GpoCalculator";
import { LightCalculator } from "./LightCalculator";
import { NewCircuitCalculator } from "./NewCircuitCalculator";
import { SwitchboardCalculator } from "./SwitchboardCalculator";
import { CustomJobCalculator } from "./CustomJobCalculator";
import { UndergroundCalculator } from "./UndergroundCalculator";
import { DataTvCalculator } from "./DataTvCalculator";
import { MultiModuleBuilder } from "./MultiModuleBuilder";

interface Props {
  initialSettings?: Partial<EngineSettings>;
}

const TABS = [
  { id: "full",        label: "Full Job",      emoji: "📋" },
  { id: "gpo",         label: "GPO",           emoji: "🔌" },
  { id: "light",       label: "Lighting",      emoji: "💡" },
  { id: "circuit",     label: "New Circuit",   emoji: "⚡" },
  { id: "switchboard", label: "Switchboard",   emoji: "🗂" },
  { id: "custom",      label: "Custom Job",    emoji: "✏️" },
  { id: "underground", label: "Underground",   emoji: "⛏" },
  { id: "datatv",      label: "Data / TV",     emoji: "📡" },
] as const;

type TabId = typeof TABS[number]["id"];

export function ElectricianQuoteBuilder({ initialSettings }: Props) {
  const [active, setActive] = useState<TabId>("full");

  return (
    <div className="space-y-0">
      {/* Tab bar */}
      <div className="flex gap-1 flex-wrap border-b border-[var(--color-border)] pb-0 mb-6">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={[
              "px-4 py-2.5 text-sm font-medium rounded-t-lg border border-b-0 transition-colors -mb-px",
              active === tab.id
                ? "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] border-b-[var(--color-surface)]"
                : "bg-transparent border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]",
            ].join(" ")}
          >
            <span className="mr-1.5">{tab.emoji}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active module */}
      {active === "full"        && <MultiModuleBuilder    initialSettings={initialSettings} />}
      {active === "gpo"         && <GpoCalculator         initialSettings={initialSettings} />}
      {active === "light"       && <LightCalculator        initialSettings={initialSettings} />}
      {active === "circuit"     && <NewCircuitCalculator   initialSettings={initialSettings} />}
      {active === "switchboard" && <SwitchboardCalculator  initialSettings={initialSettings} />}
      {active === "custom"      && <CustomJobCalculator    initialSettings={initialSettings} />}
      {active === "underground" && <UndergroundCalculator  initialSettings={initialSettings} />}
      {active === "datatv"      && <DataTvCalculator       initialSettings={initialSettings} />}
    </div>
  );
}
