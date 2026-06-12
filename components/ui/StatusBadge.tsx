import { InvoiceStatus, QuoteStatus, JobStatus } from "@prisma/client";

type AnyStatus = InvoiceStatus | QuoteStatus | JobStatus | string;

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  // Invoice
  PENDING:   { bg: "bg-slate-100",  text: "text-slate-600",  label: "Pending" },
  SENT:      { bg: "bg-blue-100",   text: "text-blue-700",   label: "Sent" },
  OVERDUE:   { bg: "bg-red-100",    text: "text-red-700",    label: "Overdue" },
  PAID:      { bg: "bg-green-100",  text: "text-green-700",  label: "Paid" },
  CANCELLED: { bg: "bg-slate-100",  text: "text-slate-500",  label: "Cancelled" },
  // Quote
  DRAFT:         { bg: "bg-slate-100",  text: "text-slate-600",  label: "Draft" },
  AWAITING_INFO: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Awaiting Info" },
  READY:         { bg: "bg-indigo-100", text: "text-indigo-700", label: "Ready" },
  ACCEPTED:      { bg: "bg-green-100",  text: "text-green-700",  label: "Accepted" },
  REJECTED:      { bg: "bg-red-100",    text: "text-red-700",    label: "Rejected" },
  EXPIRED:       { bg: "bg-orange-100", text: "text-orange-700", label: "Expired" },
  INVOICED:      { bg: "bg-blue-100",   text: "text-blue-700",   label: "Invoiced" },
  // Job
  NEW:         { bg: "bg-sky-100",    text: "text-sky-700",    label: "New" },
  IN_PROGRESS: { bg: "bg-indigo-100", text: "text-indigo-700", label: "In Progress" },
  COMPLETED:   { bg: "bg-green-100",  text: "text-green-700",  label: "Completed" },
};

interface StatusBadgeProps {
  status: AnyStatus;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const style = STATUS_STYLES[status] ?? {
    bg: "bg-slate-100",
    text: "text-slate-600",
    label: status,
  };

  return (
    <span
      className={[
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        style.bg,
        style.text,
        className,
      ].join(" ")}
    >
      {style.label}
    </span>
  );
}
