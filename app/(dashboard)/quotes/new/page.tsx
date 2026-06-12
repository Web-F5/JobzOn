import { Metadata }   from "next";
import { redirect }   from "next/navigation";
import { prisma }     from "@/lib/prisma";
import { TopBar }     from "@/components/nav/TopBar";
import { QuoteForm }  from "@/components/quotes/QuoteForm";
import { createQuote } from "@/lib/actions/quotes";

export const metadata: Metadata = { title: "New Quote" };

export default async function NewQuotePage() {
  const clients = await prisma.client.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

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
          <QuoteForm clients={clients} action={createQuote} />
        </div>
      </main>
    </>
  );
}
