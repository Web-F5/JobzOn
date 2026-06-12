import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { TopBar } from "@/components/nav/TopBar";
import { formatAUD } from "@/lib/gst";
import { formatDate, isWithinDays, isPast } from "@/lib/dates";
import { AddServiceButton, EditServiceButton } from "@/components/services/ServiceFormModal";
import { ManualInvoiceButton } from "@/components/invoices/ManualInvoiceButton";

export const metadata: Metadata = { title: "Services & Renewals" };
export const dynamic = "force-dynamic";

const SERVICE_TYPE_LABEL: Record<string, string> = {
  DOMAIN: "Domain", HOSTING: "Hosting", SSL: "SSL", OTHER: "Other",
};

function RenewalBadge({ renewalDate }: { renewalDate: Date }) {
  if (isPast(renewalDate))
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Overdue</span>;
  if (isWithinDays(renewalDate, 30))
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">Due soon</span>;
  if (isWithinDays(renewalDate, 60))
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Upcoming</span>;
  return null;
}

export default async function ServicesPage() {
  const [services, clients] = await Promise.all([
    prisma.service.findMany({
      where: { active: true },
      include: { client: true },
      orderBy: { renewalDate: "asc" },
    }),
    prisma.client.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <>
      <TopBar
        title="Services & Renewals"
        description="All active client services sorted by renewal date"
        actions={<AddServiceButton clients={clients} />}
      />

      <main className="flex-1 p-6">
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--color-muted)] border-b border-[var(--color-border)] bg-slate-50">
                  <th className="px-5 py-3 font-medium">Client</th>
                  <th className="px-5 py-3 font-medium">Description</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Renewal Date</th>
                  <th className="px-5 py-3 font-medium text-right">Amount (inc. GST)</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {services.map((svc) => (
                  <tr key={svc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-[var(--color-text)]">{svc.client.name}</td>
                    <td className="px-5 py-3 text-[var(--color-muted)]">{svc.description}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                        {SERVICE_TYPE_LABEL[svc.type]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[var(--color-muted)]">{formatDate(svc.renewalDate)}</td>
                    <td className="px-5 py-3 text-right font-semibold text-[var(--color-text)]">
                      {formatAUD(svc.amountExGst * 1.1)}
                    </td>
                    <td className="px-5 py-3">
                      <RenewalBadge renewalDate={svc.renewalDate} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <EditServiceButton service={svc} clients={clients} />
                        <ManualInvoiceButton serviceId={svc.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
