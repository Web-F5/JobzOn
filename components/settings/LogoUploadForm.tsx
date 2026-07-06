"use client";

import { useActionState, useRef, useState } from "react";
import Image from "next/image";
import { uploadLogo, removeLogo, type SettingsState } from "@/lib/actions/settings";
import { SubmitButton } from "@/components/ui/Button";

export function LogoUploadForm({ currentLogoUrl }: { currentLogoUrl: string | null }) {
  const [uploadState, uploadAction] = useActionState<SettingsState, FormData>(uploadLogo, {});
  const [removeState, removeAction] = useActionState<SettingsState, FormData>(removeLogo, {});
  const [preview, setPreview]       = useState<string | null>(null);
  const fileRef                     = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
  }

  const displayUrl = preview ?? currentLogoUrl;
  const error      = uploadState.error ?? removeState.error;
  const success    = uploadState.success || removeState.success;

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {success && !error && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          Logo updated successfully.
        </p>
      )}

      {/* Current / preview logo */}
      {displayUrl ? (
        <div className="flex items-start gap-6">
          <div className="relative w-48 h-24 border border-[var(--color-border)] rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayUrl}
              alt="Business logo"
              className="max-w-full max-h-full object-contain p-2"
            />
          </div>
          <div className="flex flex-col gap-2 justify-center">
            <p className="text-sm text-[var(--color-muted)]">Current logo</p>
            <form action={removeAction}>
              <button
                type="submit"
                className="text-sm text-red-500 hover:underline"
              >
                Remove logo
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="w-48 h-24 border-2 border-dashed border-[var(--color-border)] rounded-lg flex items-center justify-center">
          <p className="text-xs text-[var(--color-muted)]">No logo set</p>
        </div>
      )}

      {/* Upload form */}
      <form action={uploadAction} className="flex items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[var(--color-text)]">
            {currentLogoUrl ? "Replace logo" : "Upload logo"}
          </label>
          <input
            ref={fileRef}
            name="logo"
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            required
            onChange={handleFileChange}
            className="text-sm text-[var(--color-text)] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-[var(--color-border)] file:text-xs file:font-medium file:bg-white file:cursor-pointer hover:file:bg-slate-50"
          />
        </div>
        <SubmitButton>Upload</SubmitButton>
      </form>
    </div>
  );
}
