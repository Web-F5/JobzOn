import { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { TopBar } from "@/components/nav/TopBar";
import { AddClientButton } from "@/components/clients/ClientFormModal";
import { ImportClientsButton } from "@/components/clients/ImportClientsButton";
import { ClientsNextStepsBar } from "@/components/clients/ClientsNextStepsBar";
import { ClientListSearch } from "@/components/clients/ClientListSearch";
import { getBusinessSettings } from "@/lib/actions/settings";

export const metadata: Metadata = { title: "Clients" };
export const dynamic = "force-dynamic";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  const { action } = await searchParams;
  const autoAdd = action === "add";
  const { userId } = await auth();

  const [settings, [clients, quotesCount]] = await Promise.all([
    getBusinessSettings(),
    Promise.all([
      prisma.client.findMany({
        where: { userId: userId ?? "" },
        include: { _count: { select: { services: true, invoices: true } } },
        orderBy: { name: "asc" },
      }),
      prisma.quote.count({ where: { userId: userId ?? "" } }),
    ]),
  ]);
  const hasLinkedService = clients.some((c) => c._count.services > 0);

  return (
    <>
      <TopBar
        title="Clients"
        description="Manage your client accounts and services"
        actions={
          <div className="flex items-center gap-2">
            <ImportClientsButton />
            <AddClientButton defaultOpen={autoAdd} />
          </div>
        }
      />

      <main className="flex-1 p-6">
        {clients.length > 0 && <ClientsNextStepsBar hasLinkedService={hasLinkedService} hasQuote={quotesCount > 0} trainingWheels={settings.trainingWheels} />}

        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm overflow-hidden p-0">
          {clients.length === 0 ? (
            <div className="px-6 py-14 flex flex-col items-center gap-4 text-center">
              <p className="text-sm text-[var(--color-muted)]">No clients yet — add your first client, or import your contacts from Xero.</p>
              <div className="flex items-center gap-3">
                <AddClientButton defaultOpen={false} spinning />
                <ImportClientsButton />
              </div>
            </div>
          ) : (
            <div className="p-4">
              <ClientListSearch initial={clients} />
            </div>
          )}
        </div>
      </main>
    </>
  );
}
