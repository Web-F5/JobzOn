import { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { TopBar } from "@/components/nav/TopBar";
import { AddClientButton, EditClientButton } from "@/components/clients/ClientFormModal";
import { PortalLinkButton } from "@/components/clients/PortalLinkButton";
import { ClientsNextStepsBar } from "@/components/clients/ClientsNextStepsBar";

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

  const [clients, quotesCount] = await Promise.all([
    prisma.client.findMany({
      where: { userId: userId ?? "" },
      include: { _count: { select: { services: true, invoices: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.quote.count({ where: { userId: userId ?? "" } }),
  ]);
  const hasLinkedService = clients.some((c) => c._count.services > 0);

  return (
    <>
      <TopBar
        title="Clients"
        description="Manage your client accounts and services"
        actions={<AddClientButton defaultOpen={autoAdd} />}
      />

      <main className="flex-1 p-6">
        {clients.length > 0 && <ClientsNextStepsBar hasLinkedService={hasLinkedService} hasQuote={quotesCount > 0} />}

        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm overflow-hidden">
          {clients.length === 0 ? (
            <div className="px-6 py-14 flex flex-col items-center gap-4 text-center">
              <p className="text-sm text-[var(--color-muted)]">No clients yet — add your first client to get started.</p>
              <AddClientButton defaultOpen={false} spinning />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[var(--color-muted)] border-b border-[var(--color-border)] bg-slate-50">
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">Email</th>
                    <th className="px-5 py-3 font-medium">Phone</th>
                    <th className="px-5 py-3 font-medium text-center">Services</th>
                    <th className="px-5 py-3 font-medium text-center">Invoices</th>
                    <th className="px-5 py-3 font-medium text-center">SMS</th>
                    <th className="px-5 py-3 font-medium">Portal</th>
                    <th className="px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {clients.map((client: typeof clients[number]) => (
                    <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-[var(--color-text)]">{client.name}</td>
                      <td className="px-5 py-3 text-[var(--color-muted)]">{client.email}</td>
                      <td className="px-5 py-3 text-[var(--color-muted)]">
                        {client.phone ?? <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-3 text-center text-[var(--color-muted)]">{client._count.services}</td>
                      <td className="px-5 py-3 text-center text-[var(--color-muted)]">{client._count.invoices}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`inline-block w-2 h-2 rounded-full ${client.smsEnabled ? "bg-green-500" : "bg-slate-300"}`} />
                      </td>
                      <td className="px-5 py-3">
                        <PortalLinkButton clientId={client.id} token={client.portalToken} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <EditClientButton client={client} />
                          <a href={`/recurring-invoices?clientId=${client.id}`} className="text-[var(--color-muted)] hover:underline text-xs">
                            Services
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
