import { Metadata }   from "next";
import { redirect }   from "next/navigation";
import { auth }       from "@clerk/nextjs/server";
import { prisma }     from "@/lib/prisma";
import { TopBar }     from "@/components/nav/TopBar";
import { QuoteForm }  from "@/components/quotes/QuoteForm";
import { createQuote } from "@/lib/actions/quotes";

export const metadata: Metadata = { title: "New Quote" };
export const dynamic = "force-dynamic";

export default async function NewQuotePage() {
  const { userId } = await auth();

  const [clients, catalogueItems, products] = await Promise.all([
    prisma.client.findMany({ where: { userId: userId ?? "" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.serviceCatalogueItem.findMany({ where: { userId: userId ?? "", active: true }, orderBy: [{ type: "asc" }, { name: "asc" }] }),
    prisma.product.findMany({ where: { userId: userId ?? "", active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, description: true, unit: true, defaultPrice: true } }),
  ]);

  if (clients.length === 0) {
    redirect("/clients");
  }

  return (
    <>
      <TopBar
        title="New Quote"
        description="Create a quote to send to a client"
      />
      <main className="flex-1 p-6">
        <div className="max-w-3xl mx-auto">
          <QuoteForm clients={clients} catalogueItems={catalogueItems} products={products} action={createQuote} />
        </div>
      </main>
    </>
  );
}
