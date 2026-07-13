import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { TopBar } from "@/components/nav/TopBar";
import { formatAUD } from "@/lib/gst";
import { formatDate, isWithinDays, isPast } from "@/lib/dates";
import { AddServiceButton, EditServiceButton } from "@/components/services/ServiceFormModal";
import { ManualInvoiceButton } from "@/components/invoices/ManualInvoiceButton";
import { AddCatalogueItemButton, EditCatalogueItemButton } from "@/components/catalogue/CatalogueFormModal";
import { SpinningAddButton } from "@/components/catalogue/SpinningAddButton";
import { ServiceTabSwitcher } from "@/components/services/ServiceTabSwitcher";
import { CatalogueNextStepsBar, ClientServicesNextStepsBar } from "@/components/services/NextStepsBar";

export const metadata: Metadata = { title: "Services & Renewals" };
export const dynamic = "force-dynamic";

const SERVICE_TYPE_LABEL: Record<string, string> = {
  DOMAIN: "Domain", HOSTING: "Hosting", SSL: "SSL Certificate", OTHER: "Other",
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

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; action?: string }>;
}) {
  const { tab = "client", action } = await searchParams;
  const autoAdd = action === "add";

  const [services, clients, catalogueItems] = await Promise.all([
    prisma.service.findMany({
      where: { active: true },
      include: { client: true },
      orderBy: { renewalDate: "asc" },
    }),
    prisma.client.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.serviceCatalogueItem.findMany({
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
  ]);

  const isClientTab = tab !== "catalogue";

  const topBarActions = isClientTab
    ? <AddServiceButton clients={clients} defaultOpen={autoAdd} />
    : catalogueItems.length > 0 ? <AddCatalogueItemButton /> : null;

  return (
    <>
      <TopBar
        title="Services & Renewals"
        description={isClientTab
          ? "All active client services sorted by renewal date"
          : "Define reusable service types that can be assigned to clients"}
        actions={topBarActions}
      />

      <main className="flex-1 p-6 space-y-5">
        <div className="flex items-center gap-4 flex-wrap">
          <ServiceTabSwitcher active={isClientTab ? "client" : "catalogue"} />
          {!isClientTab && catalogueItems.length > 0 && <CatalogueNextStepsBar />}
          {isClientTab && services.length > 0 && <ClientServicesNextStepsBar clients={clients} />}
        </div>

        {isClientTab ? (
          /* ── Client Services tab ─────────────────────────────────── */
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
                  {services.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-sm text-[var(--color-muted)]">
                        No services yet. Add one using the button above.
                      </td>
                    </tr>
                  ) : (
                    services.map((svc: typeof services[number]) => (
                      <tr key={svc.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 font-medium text-[var(--color-text)]">{svc.client.name}</td>
                        <td className="px-5 py-3 text-[var(--color-muted)]">{svc.description}</td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                            {SERVICE_TYPE_LABEL[svc.type] ?? svc.type}
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ── Service Types (Catalogue) tab ───────────────────────── */
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[var(--color-muted)] border-b border-[var(--color-border)] bg-slate-50">
                    <th className="px-5 py-3 font-medium">Service Type Name</th>
                    <th className="px-5 py-3 font-medium">Description</th>
                    <th className="px-5 py-3 font-medium text-right">Default Price (ex. GST)</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {catalogueItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-14 text-center">
                        <p className="text-sm text-[var(--color-muted)] mb-5">No service types yet.</p>
                        <div className="flex justify-center">
                          <SpinningAddButton />
                        </div>
                      </td>
                    </tr>
                  ) : (
                    catalogueItems.map((item: typeof catalogueItems[number]) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 font-medium text-[var(--color-text)]">{item.name}</td>
                        <td className="px-5 py-3 text-[var(--color-muted)]">{item.description ?? "—"}</td>
                        <td className="px-5 py-3 text-right font-semibold text-[var(--color-text)]">
                          {formatAUD(item.amountExGst)}
                        </td>
                        <td className="px-5 py-3">
                          {item.active ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">Inactive</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <EditCatalogueItemButton item={item} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
