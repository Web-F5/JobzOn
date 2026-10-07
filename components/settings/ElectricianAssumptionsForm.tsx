"use client";

import { useActionState, useTransition, useState } from "react";
import {
  saveElectricianAssumptions, resetElectricianAssumptions,
  type SettingsState,
} from "@/lib/actions/settings";
import { DEFAULT_ASSUMPTIONS, type ElectricianAssumptions } from "@/lib/electricianAssumptions";

interface Props { initial: ElectricianAssumptions }

const inp  = "w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-orange-200";
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

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-[var(--color-text)]">{title}</h3>
        {description && <p className="text-xs text-[var(--color-muted)] mt-0.5">{description}</p>}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">{children}</div>
    </div>
  );
}

export function ElectricianAssumptionsForm({ initial }: Props) {
  const [state, formAction, isPending] = useActionState<SettingsState, FormData>(saveElectricianAssumptions, {});
  const [resetPending, startReset]     = useTransition();

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

      {state.error  && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{state.error}</div>}
      {state.success && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">Assumptions saved.</div>}
      {resetMsg     && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">{resetMsg}</div>}

      <form key={key} action={formAction} className="space-y-8">

        {/* GPO */}
        <Section title="🔌 GPO" description="Power outlet installation assumptions">
          <HrsField name="gpoSetupHrs"        label="Group setup / run"    value={initial.gpoSetupHrs}        hint="hrs per group" />
          <HrsField name="gpoOutletSepRate"   label="Separate-location outlet" value={initial.gpoOutletSepRate} hint="hrs ea (beyond first)" />
          <HrsField name="gpoOutletOpenFrame" label="Open-frame rough-in" value={initial.gpoOutletOpenFrame} hint="hrs per outlet" />
        </Section>

        <div className="border-t border-[var(--color-border)]" />

        {/* Lighting */}
        <Section title="💡 Lighting" description="Labour hours per light type">
          <HrsField name="ltDownlightHrs"  label="Downlight / batten / pendant" value={initial.ltDownlightHrs}  hint="hrs ea" />
          <HrsField name="ltOtherHrs"      label="Other light type"              value={initial.ltOtherHrs}      hint="hrs ea" />
          <HrsField name="ltCeilingFanHrs" label="Ceiling fan (first)"           value={initial.ltCeilingFanHrs} hint="hrs ea" />
          <HrsField name="ltIxlHrs"        label="IXL new position"              value={initial.ltIxlHrs}        hint="hrs ea" />
          <HrsField name="ltExteriorDiff"  label="Exterior difficulty"           value={initial.ltExteriorDiff}  hint="extra hrs per exterior light" />
        </Section>

        <div className="border-t border-[var(--color-border)]" />

        {/* New Circuit */}
        <Section title="⚡ New Circuit" description="Per-circuit labour">
          <HrsField name="ncConnectHrs" label="Connect / terminate" value={initial.ncConnectHrs} hint="hrs per circuit" />
          <HrsField name="ncWireHrs"    label="Wire / pull"         value={initial.ncWireHrs}    hint="hrs per circuit" />
        </Section>

        <div className="border-t border-[var(--color-border)]" />

        {/* Switchboard */}
        <Section title="🗂 Switchboard" description="Board work labour and costs">
          <HrsField    name="sbRcboHrs"       label="Per RCBO / RCD"     value={initial.sbRcboHrs}       hint="hrs ea" />
          <HrsField    name="sbNewHrs"        label="New board base"     value={initial.sbNewHrs}        hint="hrs" />
          <HrsField    name="sbUpgradeHrs"    label="Upgrade base"       value={initial.sbUpgradeHrs}    hint="hrs" />
          <HrsField    name="sbModHrs"        label="Modification base"  value={initial.sbModHrs}        hint="hrs" />
          <DollarField name="sbInspectorCost" label="Inspector fee"      value={initial.sbInspectorCost} hint="added when inspector required" />
        </Section>

        <div className="border-t border-[var(--color-border)]" />

        {/* Underground */}
        <Section title="⛏ Underground" description="Trenching and cable installation">
          <HrsField name="ugHandDigRate"   label="Hand dig rate"     value={initial.ugHandDigRate}   hint="hrs per metre" />
          <HrsField name="ugCablePullRate" label="Cable pull rate"   value={initial.ugCablePullRate} hint="hrs per cable-metre" />
        </Section>

        <div className="border-t border-[var(--color-border)]" />

        {/* Data / TV */}
        <Section title="📡 Data / TV" description="Base labour per outlet location">
          <HrsField name="dtvDataNewHrs" label="Data (Cat6) new location" value={initial.dtvDataNewHrs} hint="hrs per location" />
          <HrsField name="dtvTvNewHrs"   label="TV coax new location"     value={initial.dtvTvNewHrs}   hint="hrs per location" />
        </Section>

        <div className="border-t border-[var(--color-border)]" />

        {/* Materials */}
        <Section title="🧰 Material Costs" description="Default material unit costs used in calculations">
          <DollarField name="matGpoCost"      label="Standard double GPO"  value={initial.matGpoCost}      hint="cost per outlet" />
          <DollarField name="matCable25Cost"  label="2.5 mm² TPS cable"    value={initial.matCable25Cost}  hint="cost per metre" />
          <DollarField name="matRcboCost"     label="RCBO (10–20 A)"        value={initial.matRcboCost}     hint="cost per unit" />
        </Section>

        <div className="flex items-center justify-between pt-2">
          <button type="submit" disabled={isPending}
            className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50">
            {isPending ? "Saving…" : "Save Assumptions"}
          </button>
        </div>
      </form>

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
