import { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { TopBar } from "@/components/nav/TopBar";
import { formatAUD } from "@/lib/gst";
import { AddProductButton, EditProductButton } from "@/components/products/ProductFormModal";
import { ProductsNextStepsBar } from "@/components/products/ProductsNextStepsBar";
import { getBusinessSettings } from "@/lib/actions/settings";
import { getSupplierPriceLists } from "@/lib/actions/supplierPriceList";
import { SupplierPriceListManager } from "@/components/settings/SupplierPriceListManager";

export const metadata: Metadata = { title: "Products" };
export const dynamic = "force-dynamic";


export default async function ProductsPage() {
  const { userId } = await auth();

  const [settings, priceLists, [products, clientCount, quotesCount, serviceCount]] = await Promise.all([
    getBusinessSettings(),
    getSupplierPriceLists(),
    Promise.all([
    prisma.product.findMany({
      where: { userId: userId ?? "" },
      orderBy: { name: "asc" },
    }),
    prisma.client.count({ where: { userId: userId ?? "" } }),
    prisma.quote.count({ where: { userId: userId ?? "" } }),
      prisma.serviceCatalogueItem.count({ where: { userId: userId ?? "" } }),
    ]),
  ]);

  return (
    <>
      <TopBar
        title="Products"
        description="Physical items and materials that can be added to quotes and invoices"
        actions={products.length > 0 ? <AddProductButton label={priceLists.length > 0 ? "+ Add Another Product" : undefined} /> : null}
      />

      <main className="flex-1 p-6 space-y-5">

        {products.length > 0 && (
          <ProductsNextStepsBar clientCount={clientCount} quotesCount={quotesCount} serviceCount={serviceCount} trainingWheels={settings.trainingWheels} />
        )}

        {/* Supplier price lists */}
        {priceLists.length > 0 && (
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm p-5">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-[var(--color-text)]">Supplier Price Lists</h2>
              <p className="text-xs text-[var(--color-muted)] mt-0.5">
                Available for material lookups when building quotes.
              </p>
            </div>
            <SupplierPriceListManager initial={priceLists} />
          </div>
        )}

        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--color-muted)] border-b border-[var(--color-border)] bg-[#e2e8f0] border-l-4 border-l-[#2563eb]">
                  <th className="px-5 py-3 font-medium">Product Name</th>
                  <th className="px-5 py-3 font-medium">Description</th>
                  <th className="px-5 py-3 font-medium">Unit</th>
                  <th className="px-5 py-3 font-medium text-right">Default Price (ex. GST)</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-14 text-center bg-[#334155] border-l-4 border-l-[#2563eb]">
                      {priceLists.length > 0 ? (
                        <div className="max-w-lg mx-auto space-y-3">
                          <p className="text-sm text-white/60">
                            A supplier price list has been attached. If you wish to add your own products
                            that are not in the list you can enter them here — note that manually added
                            products will need to be updated by hand when your prices change.
                          </p>
                          <div className="flex justify-center">
                            <AddProductButton spinning dark label="+ Add Your Own Product" autoOpen />
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center justify-center gap-3 text-base text-white/60">
                          <span>No products yet</span>
                          <AddProductButton spinning dark label="+ Add your first Product" autoOpen />
                          <span>to get started.</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.id} className="hover:bg-[#e2e8f0] transition-colors">
                      <td className="px-5 py-3 font-medium text-[var(--color-text)]">{p.name}</td>
                      <td className="px-5 py-3 text-[var(--color-muted)]">{p.description ?? "—"}</td>
                      <td className="px-5 py-3 text-[var(--color-muted)]">{p.unit}</td>
                      <td className="px-5 py-3 text-right font-semibold text-[var(--color-text)]">
                        {formatAUD(p.defaultPrice)}
                      </td>
                      <td className="px-5 py-3">
                        {p.active ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">Inactive</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <EditProductButton item={p} />
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
