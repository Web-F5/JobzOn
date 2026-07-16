import { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { TopBar } from "@/components/nav/TopBar";
import { formatAUD } from "@/lib/gst";
import { AddProductButton, EditProductButton } from "@/components/products/ProductFormModal";
import { ProductsNextStepsBar } from "@/components/products/ProductsNextStepsBar";

export const metadata: Metadata = { title: "Products" };
export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const { userId } = await auth();

  const [products, clientCount, quotesCount] = await Promise.all([
    prisma.product.findMany({
      where: { userId: userId ?? "" },
      orderBy: { name: "asc" },
    }),
    prisma.client.count({ where: { userId: userId ?? "" } }),
    prisma.quote.count({ where: { userId: userId ?? "" } }),
  ]);

  return (
    <>
      <TopBar
        title="Products"
        description="Physical items and materials that can be added to quotes and invoices"
        actions={products.length > 0 ? <AddProductButton /> : null}
      />

      <main className="flex-1 p-6 space-y-5">

        {products.length > 0 && (
          <ProductsNextStepsBar clientCount={clientCount} quotesCount={quotesCount} />
        )}

        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--color-muted)] border-b border-[var(--color-border)] bg-[#e2e8f0]">
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
                    <td colSpan={6} className="px-5 py-14 text-center bg-[#334155]">
                      <div className="flex flex-wrap items-center justify-center gap-3 text-base text-white/60">
                        <span>No products yet</span>
                        <AddProductButton spinning dark label="+ Add your first Product" />
                        <span>to get started.</span>
                      </div>
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
