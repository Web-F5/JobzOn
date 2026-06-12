"use client";

import { useTransition, useState } from "react";
import { regeneratePortalToken } from "@/lib/actions/portal";
import { portalUrl } from "@/lib/portal";

interface Props {
  clientId: string;
  token: string | null;
}

export function PortalLinkButton({ clientId, token: initialToken }: Props) {
  const [token, setToken]       = useState(initialToken);
  const [copied, setCopied]     = useState(false);
  const [pending, startTransition] = useTransition();

  const url = token ? portalUrl(token) : null;

  function copyLink() {
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleRegenerate() {
    if (!confirm("Regenerate portal link? The old link will stop working immediately.")) return;
    startTransition(async () => {
      const result = await regeneratePortalToken(clientId);
      if (result.token) setToken(result.token);
    });
  }

  if (!url) {
    return (
      <button
        onClick={handleRegenerate}
        disabled={pending}
        className="text-[var(--color-brand)] hover:underline text-xs disabled:opacity-50"
      >
        {pending ? "Generating…" : "Create Portal Link"}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={copyLink}
        className="text-[var(--color-brand)] hover:underline text-xs"
        title={url}
      >
        {copied ? "✓ Copied!" : "Copy Portal Link"}
      </button>
      <span className="text-slate-300 text-xs">·</span>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[var(--color-muted)] hover:underline text-xs"
      >
        Preview
      </a>
    </div>
  );
}
