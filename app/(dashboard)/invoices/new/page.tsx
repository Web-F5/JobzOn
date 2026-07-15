import { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { TopBar } from "@/components/nav/TopBar";
import { NewInvoiceForm } from "@/components/invoices/NewInvoiceForm";

export const metadata: Metadata = { title: "New Invoice" };
export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  const { userId } = await auth();

  const [clients, catalogueItems, quotes, settings] = await Promise.all([
    prisma.client.findMany({
      where: { userId: userId ?? "" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.serviceCatalogueItem.findMany({
      where: { userId: userId ?? "", active: true },
      orderBy: [{ type: "asc" }, { name: "asc" }],
      select: { id: true, name: true, description: true, amountExGst: true },
    }),
    // Only accepted/ready quotes that haven't been invoiced yet
    prisma.quote.findMany({
      where: { userId: userId ?? "", invoice: null, status: { notIn: ["REJECTED", "EXPIRED", "INVOICED"] } },
      select: {
        id: true,
        quoteNumber: true,
        clientId: true,
        amountTotal: true,
        lineItems: {
          select: { description: true, quantity: true, unitPrice: true },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.businessSettings.findUnique({ where: { id: userId ?? "" } }),
  ]);

  return (
    <>
      <TopBar
        title="New Invoice"
        description="Create a manual invoice for any client"
        actions={
          <a href="/invoices" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-text)]">
            ← Back to Invoices
          </a>
        }
      />
      <main className="flex-1 p-6">
        <div className="max-w-2xl mx-auto">
          <NewInvoiceForm
            clients={clients}
            catalogueItems={catalogueItems}
            quotes={quotes}
            defaultTermsDays={settings?.paymentTermsDays ?? 14}
          />
        </div>
      </main>
    </>
  );
}
