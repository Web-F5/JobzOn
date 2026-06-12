"use client";

/**
 * SendSmsButton
 *
 * Sends an invoice SMS (initial, reminder 1, or reminder 2) by calling
 * POST /api/invoice/[id]/send with the appropriate type.
 *
 * Only rendered when:
 *   - SMS is configured (MOBILE_MESSAGE_API_KEY is set)
 *   - The client has smsEnabled = true and a phone number
 *   - The invoice is in a sendable state (SENT or OVERDUE)
 */

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  invoiceId: string;
  type: "sms" | "sms_reminder1" | "sms_reminder2";
  label: string;
}

export function SendSmsButton({ invoiceId, type, label }: Props) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const router = useRouter();

  async function handleClick() {
    if (state === "sending") return;
    if (!confirm(`Send SMS: "${label}" to this client?`)) return;

    setState("sending");

    try {
      const res = await fetch(`/api/invoice/${invoiceId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      setState("sent");
      router.refresh();

      // Reset label after 3s
      setTimeout(() => setState("idle"), 3000);
    } catch (err) {
      setState("error");
      const msg = err instanceof Error ? err.message : "Unknown error";
      alert(`SMS failed: ${msg}`);
      setTimeout(() => setState("idle"), 3000);
    }
  }

  const colours = {
    idle:    "text-indigo-600 hover:underline",
    sending: "text-[var(--color-muted)] opacity-50 cursor-not-allowed",
    sent:    "text-green-600",
    error:   "text-red-500",
  };

  const labels = {
    idle:    label,
    sending: "Sending…",
    sent:    "Sent ✓",
    error:   "Failed",
  };

  return (
    <button
      onClick={handleClick}
      disabled={state === "sending"}
      title="Send via SMS (Mobile Message)"
      className={`text-xs flex items-center gap-1 ${colours[state]}`}
    >
      {/* Mobile phone icon */}
      <svg
        className="w-3 h-3"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
      </svg>
      {labels[state]}
    </button>
  );
}
