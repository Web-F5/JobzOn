"use client";

import { useActionState, useTransition, useState } from "react";
import {
  saveElectricianAssumptions, resetElectricianAssumptions,
  type SettingsState,
} from "@/lib/actions/settings";
import { type ElectricianAssumptions } from "@/lib/electricianAssumptions";

interface Props { initial: ElectricianAssumptions }

const wrap = "flex items-center rounded-lg border border-[var(--color-border)] bg-white overflow-hidden focus-within:ring-2 focus-within:ring-orange-200";
const fix  = "px-3 py-2 text-sm text-[var(--color-muted)] bg-[var(--color-surface-raised)] border-r border-[var(--color-border)] select-none shrink-0";
const bare = "flex-1 px-3 py-2 text-sm bg-transparent focus:outline-none";

function HrsField({ name, label, value, hint }: { name: string; label: string; value: number; hint?: string }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-[var(--color-muted)]">{label}</label>
      <div className={wrap}>
        <input name={name} type="number" step="0.001" min="0" defaultValue={value} className={bare} />
        <span className={fix.replace("border-r","border-l")}>hrs</span>
      </div>
      {hint && <p className="text-xs text-[var(--color-muted)]">{hint}</p>}
    </div>
  );
}

function DollarField({ name, label, value, hint }: { name: string; label: string; value: number; hint?: string }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-[var(--color-muted)]">{label}</label>
      <div className={wrap}>
        <span className={fix}>$</span>
        <input name={name} type="number" step="0.01" min="0" defaultValue={value} className={bare} />
      </div>
      {hint && <p className="text-xs text-[var(--color-muted)]">{hint}</p>}
    </div>
  );
}

type FieldDef = { name: keyof ElectricianAssumptions; label: string; hint?: string; kind?: "dollar" };

interface SectionDef { id: string; icon: string; label: string; description: string; fields: FieldDef[] }

const SECTIONS: SectionDef[] = [
  {
    id: "gpo", icon: "🔌", label: "GPO", description: "Power outlet installation assumptions",
    fields: [
      { name: "gpoSetupHrs",        label: "Group setup / run",        hint: "hrs per group" },
      { name: "gpoOutletSepRate",   label: "Separate-location outlet", hint: "hrs ea (beyond first)" },
      { name: "gpoOutletOpenFrame", label: "Open-frame rough-in",      hint: "hrs per outlet" },
    ],
  },
  {
    id: "lighting", icon: "💡", label: "Lighting", description: "Labour hours per light type",
    fields: [
      { name: "ltDownlightHrs",  label: "Downlight / batten / pendant", hint: "hrs ea" },
      { name: "ltOtherHrs",      label: "Other light type",             hint: "hrs ea" },
      { name: "ltCeilingFanHrs", label: "Ceiling fan (first)",          hint: "hrs ea" },
      { name: "ltIxlHrs",        label: "IXL new position",             hint: "hrs ea" },
      { name: "ltExteriorDiff",  label: "Exterior difficulty",          hint: "extra hrs per exterior light" },
    ],
  },
  {
    id: "circuit", icon: "⚡", label: "New Circuit", description: "Per-circuit labour",
    fields: [
      { name: "ncConnectHrs", label: "Connect / terminate", hint: "hrs per circuit" },
      { name: "ncWireHrs",    label: "Wire / pull",         hint: "hrs per circuit" },
    ],
  },
  {
    id: "switchboard", icon: "🗂", label: "Switchboard", description: "Board work labour and costs",
    fields: [
      { name: "sbRcboHrs",       label: "Per RCBO / RCD",    hint: "hrs ea" },
      { name: "sbNewHrs",        label: "New board base",    hint: "hrs" },
      { name: "sbUpgradeHrs",    label: "Upgrade base",      hint: "hrs" },
      { name: "sbModHrs",        label: "Modification base", hint: "hrs" },
      { name: "sbInspectorCost", label: "Inspector fee",     hint: "added when inspector required", kind: "dollar" },
    ],
  },
  {
    id: "underground", icon: "⛏", label: "Underground", description: "Trenching and cable installation",
    fields: [
      { name: "ugHandDigRate",   label: "Hand dig rate",   hint: "hrs per metre" },
      { name: "ugCablePullRate", label: "Cable pull rate", hint: "hrs per cable-metre" },
    ],
  },
  {
    id: "datatv", icon: "📡", label: "Data / TV", description: "Base labour per outlet location",
    fields: [
      { name: "dtvDataNewHrs", label: "Data (Cat6) new location", hint: "hrs per location" },
      { name: "dtvTvNewHrs",   label: "TV coax new location",     hint: "hrs per location" },
    ],
  },
  {
    id: "materials", icon: "🧰", label: "Material Costs", description: "Default material unit costs used in calculations",
    fields: [
      { name: "matGpoCost",     label: "Standard double GPO", hint: "cost per outlet", kind: "dollar" },
      { name: "matCable25Cost", label: "2.5 mm² TPS cable",   hint: "cost per metre",  kind: "dollar" },
      { name: "matRcboCost",    label: "RCBO (10–20 A)",      hint: "cost per unit",   kind: "dollar" },
    ],
  },
];

// One form per section so each tab saves only its own fields.
function SectionForm({ section, initial, hidden, dirty, onDirtyChange }: {
  section: SectionDef;
  initial: ElectricianAssumptions;
  hidden: boolean;
  dirty: boolean;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [state, formAction, isPending] = useActionState<SettingsState, FormData>(
    async (prev, formData) => {
      const result = await saveElectricianAssumptions(prev, formData);
      if (result.success) onDirtyChange(false);
      return result;
    },
    {},
  );

  return (
    <form action={formAction} onChange={() => onDirtyChange(true)} hidden={hidden} className="space-y-5">
      <p className="text-xs text-[var(--color-muted)]">{section.description}</p>

      {state.error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{state.error}</div>}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {section.fields.map(f => f.kind === "dollar"
          ? <DollarField key={f.name} name={f.name} label={f.label} value={initial[f.name]} hint={f.hint} />
          : <HrsField    key={f.name} name={f.name} label={f.label} value={initial[f.name]} hint={f.hint} />)}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={isPending}
          className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50">
          {isPending ? "Saving…" : `Save ${section.label}`}
        </button>
        {dirty && !isPending && <span className="text-xs text-amber-700">Unsaved changes</span>}
        {state.success && !dirty && !isPending && <span className="text-xs text-green-700">{section.label} assumptions saved.</span>}
      </div>
    </form>
  );
}

export function ElectricianAssumptionsForm({ initial }: Props) {
  const [resetPending, startReset] = useTransition();
  const [active, setActive]        = useState(SECTIONS[0].id);
  const [dirty, setDirty]          = useState<Record<string, boolean>>({});

  // Reset-to-default confirmation
  const [resetPhase, setResetPhase] = useState<"idle" | "confirm">("idle");
  const [resetInput, setResetInput] = useState("");
  const [resetMsg,   setResetMsg]   = useState<string | null>(null);
  const [key, setKey]               = useState(0); // force form re-mount on reset

  function doReset() {
    startReset(async () => {
      const result = await resetElectricianAssumptions();
      if (result.error) {
        setResetMsg(result.error);
      } else {
        setResetMsg("Assumptions reset to defaults.");
        setResetPhase("idle");
        setResetInput("");
        setKey(k => k + 1);
        setDirty({});
        setTimeout(() => setResetMsg(null), 3000);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
        These assumptions drive how labour and material hours are calculated for each module.
        Default values are based on industry averages from Ben&apos;s estimating spreadsheet.
        Only change these if you have firm data for your own crew and market.
      </div>

      {resetMsg     && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">{resetMsg}</div>}

      <div>
        {/* Section tabs */}
        <div role="tablist" className="flex flex-wrap gap-x-1 border-b border-[var(--color-border)] mb-5">
          {SECTIONS.map(sec => (
            <button key={sec.id} type="button" role="tab" aria-selected={sec.id === active}
              onClick={() => setActive(sec.id)}
              className={[
                "px-3 py-2 -mb-px text-sm border-b-2 whitespace-nowrap transition-colors",
                sec.id === active
                  ? "border-orange-500 text-orange-600 font-semibold"
                  : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]",
              ].join(" ")}>
              {sec.icon} {sec.label}
              {dirty[sec.id] && <span title="Unsaved changes" className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-amber-500 align-middle" />}
            </button>
          ))}
        </div>

        {/* All sections stay mounted so unsaved edits survive switching tabs */}
        <div key={key}>
          {SECTIONS.map(sec => (
            <SectionForm key={sec.id} section={sec} initial={initial} hidden={sec.id !== active}
              dirty={!!dirty[sec.id]}
              onDirtyChange={d => setDirty(prev => ({ ...prev, [sec.id]: d }))} />
          ))}
        </div>
      </div>

      {/* Reset to default */}
      <div className="pt-4 border-t border-[var(--color-border)]">
        {resetPhase === "idle" ? (
          <button onClick={() => setResetPhase("confirm")}
            className="text-sm text-red-600 hover:text-red-700 hover:underline font-medium">
            Reset assumptions to default values…
          </button>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 space-y-4">
            <p className="text-sm font-medium text-red-800">
              Are you sure you want to reset your assumptions to default? Type <strong>YES</strong> to confirm.
            </p>
            <p className="text-xs text-red-600">
              This will replace all your custom assumptions with Ben&apos;s spreadsheet defaults. This cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="text" value={resetInput} onChange={e => setResetInput(e.target.value)}
                placeholder="Type YES" maxLength={3}
                className="w-28 px-3 py-2 text-sm rounded-lg border border-red-300 focus:outline-none focus:ring-2 focus:ring-red-200 uppercase"
              />
              <button
                disabled={resetInput.trim().toUpperCase() !== "YES" || resetPending}
                onClick={doReset}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg disabled:opacity-40 transition-colors">
                {resetPending ? "Resetting…" : "Reset to Default"}
              </button>
              <button onClick={() => { setResetPhase("idle"); setResetInput(""); }}
                className="px-4 py-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)] rounded-lg transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
