"use client";

import { useActionState } from "react";
import { saveElectricianSettings } from "@/lib/actions/settings";

type ElectricianSettingsData = {
  labourSellRate:       number;
  labourCostRate:       number;
  overheadAllowance:    number;
  contingencyAllowance: number;
  minimumJobCharge:     number;
  travelCallout:        number;
  quoteRounding:        number;
};

const inp  = "w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-blue-300";
const wrap = "flex items-center rounded-lg border border-[var(--color-border)] bg-white overflow-hidden focus-within:ring-2 focus-within:ring-blue-300";
const fix  = "px-3 py-2 text-sm text-[var(--color-muted)] bg-[var(--color-surface-raised)] border-r border-[var(--color-border)] select-none";
const fixR = "px-3 py-2 text-sm text-[var(--color-muted)] bg-[var(--color-surface-raised)] border-l border-[var(--color-border)] select-none";
const bare = "flex-1 px-3 py-2 text-sm bg-transparent focus:outline-none";

function RateField({ label, hint, prefix, suffix, children }: {
  label: string; hint: string; prefix?: string; suffix?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-[var(--color-text)]">{label}</label>
      {prefix || suffix ? (
        <div className={wrap}>
          {prefix && <span className={fix}>{prefix}</span>}
          {children}
          {suffix && <span className={fixR}>{suffix}</span>}
        </div>
      ) : children}
      <p className="text-xs text-[var(--color-muted)]">{hint}</p>
    </div>
  );
}

export function ElectricianSettingsForm({ initial }: { initial: ElectricianSettingsData | null }) {
  const [state, action, pending] = useActionState(saveElectricianSettings, {});

  const d = initial ?? {
    labourSellRate: 170, labourCostRate: 65, overheadAllowance: 0.1,
    contingencyAllowance: 0.05, minimumJobCharge: 500, travelCallout: 0, quoteRounding: 10,
  };

  return (
    <form action={action} className="space-y-5">
      {state.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{state.error}</p>
      )}
      {state.success && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">Rates saved.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <RateField label="Labour sell rate" hint="Your charge-out rate per hour (ex. GST)" prefix="$/hr">
          <input name="labourSellRate" type="number" step="1" min="0" defaultValue={d.labourSellRate} className={bare} />
        </RateField>
        <RateField label="Labour cost rate" hint="Your actual cost per hour (for margin calculation)" prefix="$/hr">
          <input name="labourCostRate" type="number" step="1" min="0" defaultValue={d.labourCostRate} className={bare} />
        </RateField>
        <RateField label="Overhead allowance" hint="Applied to every job (e.g. 10 = 10%)" suffix="%">
          <input name="overheadAllowance" type="number" step="0.5" min="0" max="50" defaultValue={d.overheadAllowance * 100} className={bare} />
        </RateField>
        <RateField label="Contingency allowance" hint="Buffer for unexpected costs (e.g. 5 = 5%)" suffix="%">
          <input name="contingencyAllowance" type="number" step="0.5" min="0" max="30" defaultValue={d.contingencyAllowance * 100} className={bare} />
        </RateField>
        <RateField label="Minimum job charge" hint="Smallest amount you'll invoice for a job" prefix="$">
          <input name="minimumJobCharge" type="number" step="10" min="0" defaultValue={d.minimumJobCharge} className={bare} />
        </RateField>
        <RateField label="Travel / callout fee" hint="Added to every job (0 = no callout fee)" prefix="$">
          <input name="travelCallout" type="number" step="10" min="0" defaultValue={d.travelCallout} className={bare} />
        </RateField>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-[var(--color-text)]">Quote rounding</label>
        <div className="flex items-center gap-3">
          <input name="quoteRounding" type="number" step="1" min="1" defaultValue={d.quoteRounding} className={inp + " w-32"} />
          <p className="text-xs text-[var(--color-muted)]">Round quote totals to the nearest $ (e.g. 10 = round to nearest $10)</p>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={pending}
          className="px-5 py-2 bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save Rates"}
        </button>
      </div>
    </form>
  );
}
