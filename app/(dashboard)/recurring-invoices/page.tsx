import { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { TopBar } from "@/components/nav/TopBar";
import { formatAUD } from "@/lib/gst";
import { formatDate, isWithinDays, isPast } from "@/lib/dates";
import { AddServiceButton, EditServiceButton } from "@/components/services/ServiceFormModal";
import { ManualInvoiceButton } from "@/components/invoices/ManualInvoiceButton";
import { SpinningAddButton } from "@/components/catalogue/SpinningAddButton";
import { ClientServicesNextStepsBar } from "@/components/services/NextStepsBar";
import { SpinningBorderButton } from "@/components/ui/SpinningBorderButton";

export const metadata: Metadata = { title: "Recurring Invoices" };
export const dynamic = "force-dynamic";

const SERVICE_LABEL: Record<string, string> = {
  DOMAIN: "Domain", HOSTING: "Hosting", SSL: "SSL Certificate", OTHER: "Other",
};

function RenewalBadge({ renewalDate }: { renewalDate: Date | null }) {
  if (!renewalDate) return null;
  if (isPast(renewalDate))
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Overdue</span>;
  if (isWithinDays(renewalDate, 30))
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">Due soon</span>;
  if (isWithinDays(renewalDate, 60))
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Upcoming</span>;
  return null;
}

export default async function RecurringInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  const { action } = await searchParams;
  const autoAdd = action === "add";
  const { userId } = await auth();

  const [services, clients, catalogueItems, quotesCount, productCount] = await Promise.all([
    prisma.service.findMany({
      where: { userId: userId ?? "", active: true },
      include: { client: true },
      orderBy: [{ renewalDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
    }),
    prisma.client.findMany({
      where: { userId: userId ?? "" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.serviceCatalogueItem.findMany({
      where: { userId: userId ?? "" },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
    prisma.quote.count({ where: { userId: userId ?? "" } }),
    prisma.product.count({ where: { userId: userId ?? "", active: true } }),
  ]);

  const hasCatalogue = catalogueItems.length > 0 || productCount > 0;

  return (
    <>
      <TopBar
        title="Recurring Invoices"
        description="Client services that generate invoices automatically on renewal"
        actions={
          clients.length > 0 && hasCatalogue
            ? <AddServiceButton clients={clients} catalogueItems={catalogueItems} defaultOpen={autoAdd} />
            : null
        }
      />

      <main className="flex-1 p-6 space-y-5">

        {services.length > 0 && (
          <ClientServicesNextStepsBar clients={clients} catalogueItems={catalogueItems} quotesCount={quotesCount} />
        )}

        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--color-muted)] border-b border-[var(--color-border)] bg-slate-50">
                  <th className="px-5 py-3 font-medium">Client</th>
                  <th className="px-5 py-3 font-medium">Description</th>
                  <th className="px-5 py-3 font-medium">Service</th>
                  <th className="px-5 py-3 font-medium">Next Invoice</th>
                  <th className="px-5 py-3 font-medium text-right">Amount (inc. GST)</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {services.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center bg-[#1e293b]">
                      {!hasCatalogue ? (
                        <div className="space-y-4">
                          <p className="text-base text-white/60">Please add a Service or Product before creating a Recurring Invoice.</p>
                          <div className="flex items-center justify-center gap-4 flex-wrap">
                            <SpinningBorderButton href="/services" dark>+ Add your first Service</SpinningBorderButton>
                            <span className="text-white/40 text-sm font-medium">OR</span>
                            <SpinningBorderButton href="/products" dark>+ Add your first Product</SpinningBorderButton>
                          </div>
                        </div>
                      ) : clients.length === 0 ? (
                        <div className="space-y-4">
                          <p className="text-base text-white/60">Please add a Client before creating a Recurring Invoice.</p>
                          <div className="flex justify-center">
                            <SpinningBorderButton href="/clients?action=add" dark>+ Add your first Client</SpinningBorderButton>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <p className="text-base text-white/60">No recurring invoices set up yet.</p>
                          <div className="flex justify-center">
                            <AddServiceButton clients={clients} catalogueItems={catalogueItems} spinning variant="orange" dark />
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  services.map((svc: typeof services[number]) => (
                    <tr key={svc.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-[var(--color-text)]">{svc.client.name}</td>
                      <td className="px-5 py-3 text-[var(--color-muted)]">{svc.description}</td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                          {SERVICE_LABEL[svc.type] ?? svc.type}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-[var(--color-muted)]">
                        {svc.renewalDate ? formatDate(svc.renewalDate) : <span className="text-slate-300">Once-off</span>}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-[var(--color-text)]">
                        {formatAUD(svc.amountExGst * 1.1)}
                      </td>
                      <td className="px-5 py-3">
                        {svc.renewalDate && <RenewalBadge renewalDate={svc.renewalDate} />}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <EditServiceButton service={svc} clients={clients} catalogueItems={catalogueItems} />
                          <ManualInvoiceButton serviceId={svc.id} />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </>
  );
}
