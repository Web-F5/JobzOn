import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { TopBar } from "@/components/nav/TopBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/dates";

export const metadata: Metadata = { title: "Jobs" };
export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const jobs = await prisma.job.findMany({
    include: {
      _count: { select: { additionalTasks: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get client names via quoteId → quote → client
  const jobsWithClients = await Promise.all(
    jobs.map(async (job) => {
      const quote = await prisma.quote.findUnique({
        where: { id: job.quoteId },
        include: { client: true },
      });
      return { ...job, client: quote?.client };
    })
  );

  return (
    <>
      <TopBar
        title="Jobs"
        description="Active and completed jobs from accepted quotes"
      />

      <main className="flex-1 p-6">
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm overflow-hidden">
          {jobs.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-sm text-[var(--color-muted)]">No jobs yet</p>
              <p className="text-xs text-[var(--color-muted)] mt-1">
                Jobs are created when a quote is accepted
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[var(--color-muted)] border-b border-[var(--color-border)] bg-slate-50">
                    <th className="px-5 py-3 font-medium">Job #</th>
                    <th className="px-5 py-3 font-medium">Client</th>
                    <th className="px-5 py-3 font-medium">Title</th>
                    <th className="px-5 py-3 font-medium">Started</th>
                    <th className="px-5 py-3 font-medium">Completed</th>
                    <th className="px-5 py-3 font-medium text-center">Extra Tasks</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {jobsWithClients.map((job: typeof jobsWithClients[number]) => (
                    <tr key={job.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-mono text-xs text-[var(--color-muted)]">
                        {job.jobNumber}
                      </td>
                      <td className="px-5 py-3 font-medium text-[var(--color-text)]">
                        {job.client?.name ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-[var(--color-text)]">{job.title}</td>
                      <td className="px-5 py-3 text-[var(--color-muted)]">
                        {job.startedAt ? formatDate(job.startedAt) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-3 text-[var(--color-muted)]">
                        {job.completedAt ? formatDate(job.completedAt) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-3 text-center text-[var(--color-muted)]">
                        {job._count.additionalTasks > 0 ? job._count.additionalTasks : "—"}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={job.status} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2 text-xs">
                          <button className="text-[var(--color-brand)] hover:underline">View</button>
                          {job.status === "COMPLETED" && (
                            <button className="text-green-600 hover:underline">Invoice</button>
                          )}
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
