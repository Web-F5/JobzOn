"use client";

import { useActionState } from "react";
import { saveBusinessPreferences, type SettingsState } from "@/lib/actions/settings";
import { SubmitButton } from "@/components/ui/Button";

export function BusinessPreferencesForm({ hideProducts }: { hideProducts: boolean }) {
  const [state, formAction] = useActionState<SettingsState, FormData>(saveBusinessPreferences, {});

  return (
    <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm p-6">
      <h2 className="font-semibold text-[var(--color-text)] mb-1">Business Preferences</h2>
      <p className="text-sm text-[var(--color-muted)] mb-5">
        Customise which features are visible in your workspace.
      </p>

      {state.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-4">
          Preferences saved.
        </p>
      )}

      <form action={formAction} className="space-y-4">
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            name="hideProducts"
            defaultChecked={hideProducts}
            className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[var(--color-brand)] focus:ring-[var(--color-brand)]"
          />
          <div>
            <p className="text-sm font-medium text-[var(--color-text)]">Hide Products</p>
            <p className="text-xs text-[var(--color-muted)] mt-0.5">
              For service-only businesses. Hides the Products menu item, product buttons in Next Steps bars, and product fields in quote/invoice forms.
            </p>
          </div>
        </label>

        <div className="pt-2 border-t border-[var(--color-border)] flex justify-end">
          <SubmitButton>Save Preferences</SubmitButton>
        </div>
      </form>
    </section>
  );
}
