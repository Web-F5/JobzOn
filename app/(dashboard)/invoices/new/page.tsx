import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { TopBar } from "@/components/nav/TopBar";
import { NewInvoiceForm } from "@/components/invoices/NewInvoiceForm";

export const metadata: Metadata = { title: "New Invoice" };
export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  const clients = await prisma.client.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

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
          <NewInvoiceForm clients={clients} />
        </div>
      </main>
    </>
  );
}
