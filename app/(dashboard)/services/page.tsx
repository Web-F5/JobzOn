import { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { TopBar } from "@/components/nav/TopBar";
import { formatAUD } from "@/lib/gst";
import { AddCatalogueItemButton, EditCatalogueItemButton } from "@/components/catalogue/CatalogueFormModal";
import { SpinningAddButton } from "@/components/catalogue/SpinningAddButton";
import { CatalogueNextStepsBar } from "@/components/services/NextStepsBar";

export const metadata: Metadata = { title: "Services" };
export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const { userId } = await auth();

  const [catalogueItems, clients, servicesCount, quotesCount] = await Promise.all([
    prisma.serviceCatalogueItem.findMany({
      where: { userId: userId ?? "" },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
    prisma.client.findMany({
      where: { userId: userId ?? "" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.service.count({ where: { userId: userId ?? "", active: true } }),
    prisma.quote.count({ where: { userId: userId ?? "" } }),
  ]);

  return (
    <>
      <TopBar
        title="Services"
        description="Define reusable services that can be added to quotes, invoices and recurring billing"
        actions={catalogueItems.length > 0 ? <AddCatalogueItemButton /> : null}
      />

      <main className="flex-1 p-6 space-y-5">

        {catalogueItems.length > 0 && (
          <CatalogueNextStepsBar
            clients={clients}
            catalogueItems={catalogueItems}
            servicesCount={servicesCount}
            quotesCount={quotesCount}
          />
        )}

        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--color-muted)] border-b border-[var(--color-border)] bg-[#e2e8f0]">
                  <th className="px-5 py-3 font-medium">Service Name</th>
                  <th className="px-5 py-3 font-medium">Description</th>
                  <th className="px-5 py-3 font-medium text-right">Default Price (ex. GST)</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {catalogueItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-14 text-center bg-[#334155] border-l-4 border-l-[#cbd5e1]">
                      <div className="flex flex-wrap items-center justify-center gap-3 text-base text-white/60">
                        <span>No services yet</span>
                        <SpinningAddButton dark />
                        <span>to get started.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  catalogueItems.map((item: typeof catalogueItems[number]) => (
                    <tr key={item.id} className="hover:bg-[#e2e8f0] transition-colors">
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

      </main>
    </>
  );
}
