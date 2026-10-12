import { Metadata }    from "next";
import { notFound }    from "next/navigation";
import Link            from "next/link";
import { prisma }      from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { TopBar }      from "@/components/nav/TopBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatAUD }   from "@/lib/gst";
import { formatDate }  from "@/lib/dates";
import {
  parseElectricalQuote, engineSettingsFrom, calculateElectricalQuote,
  type ElectricalQuoteInputs,
} from "@/lib/electricalQuoteData";

export const metadata: Metadata = { title: "Job" };
export const dynamic = "force-dynamic";

// ── Item display helpers ──────────────────────────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
  qty: "Qty", mechs1way: "1-way mechs", mechs2way: "2-way mechs", mechsIntermediate: "Intermediate mechs",
  rcboQty: "RCBOs", rcdQty: "RCDs", rcboOverride: "RCBO", portsEach: "Ports each",
  materialCostEa: "Material cost each", labourHrsEa: "Labour each",
};
const METRE_FIELDS  = new Set(["cableRun", "cableLength", "length", "runLength", "antennaCableRun", "protectionLength"]);
const DOLLAR_FIELDS = new Set(["materialCostEa", "extraMaterial", "extraMaterials", "extraPlantCost"]);
const HOUR_FIELDS   = new Set(["labourHrsEa", "extraLabour"]);
// Values that just mean "not set / default", left out to keep each row readable
const BLANK_VALUES  = new Set<unknown>([0, "", "No", "AUTO", "Not used", null, undefined]);

function fieldLabel(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  const words = key.replace(/([A-Z])/g, " $1").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function fieldValue(key: string, value: unknown): string {
  if (typeof value === "number") {
    if (METRE_FIELDS.has(key))  return `${value} m`;
    if (DOLLAR_FIELDS.has(key)) return formatAUD(value);
    if (HOUR_FIELDS.has(key))   return `${value} hrs`;
  }
  return String(value);
}

/** One entered item (a GPO group, a circuit, a board…) as a row of its non-default fields. */
function ItemRow({ title, item, omit = [] }: { title: string; item: object; omit?: string[] }) {
  const fields = Object.entries(item).filter(([k, v]) => !omit.includes(k) && !BLANK_VALUES.has(v) && typeof v !== "object");
  return (
    <tr>
      <td className="px-5 py-3 font-medium text-[var(--color-text)] whitespace-nowrap align-top">{title}</td>
      <td className="px-5 py-3 text-[var(--color-muted)]">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {fields.map(([k, v]) => (
            <span key={k}><span className="text-xs">{fieldLabel(k)}:</span>{" "}
              <span className="text-[var(--color-text)]">{fieldValue(k, v)}</span></span>
          ))}
        </div>
      </td>
    </tr>
  );
}

interface ModuleSection { name: string; engineName?: string; rows: { title: string; item: object; omit?: string[] }[] }

/** The items entered in each wizard module, using the engine's own "is this row active" rules. */
function moduleSections(i: ElectricalQuoteInputs): ModuleSection[] {
  const named = <T extends object>(items: T[], label: string) => items.map((item, n) => ({ title: `${label} ${n + 1}`, item }));
  const sections: ModuleSection[] = [
    { name: "GPO", engineName: "GPO",            rows: named(i.gpoGroups.filter(g => g.qty > 0), "Group") },
    { name: "Lighting", engineName: "Lighting & Fans",       rows: named(i.lightPoints.filter(p => p.qty > 0), "Light group") },
    { name: "Light controls", rows: named(i.lightControls.filter(c => c.locations > 0), "Control group") },
    { name: "New Circuit", engineName: "New Circuit",    rows: named(i.circuits.filter(c => c.cableRun > 0), "Circuit") },
    { name: "Switchboard", engineName: "Switchboard",    rows: named(i.sbEntries.filter(e => e.board !== "Not used"), "Board") },
    { name: "Custom Job", engineName: "Custom Job",     rows: i.customItems.filter(c => c.qty > 0).map(item => ({ title: item.name || "Custom item", item, omit: ["name"] })) },
    { name: "Underground", engineName: "Underground",    rows: [
        ...(i.ugSetup.runLength > 0 ? [{ title: "Trench", item: i.ugSetup, omit: ["quoteType", "storeys", "underfloor", "roofAccess", "openFrame"] }] : []),
        ...named(i.ugCables.filter(c => c.qty > 0 && c.length > 0), "Cable"),
      ] },
    { name: "Data / TV", engineName: "Data / TV",      rows: [
        ...named(i.dtvGroups.filter(g => g.locations > 0), "Group"),
        ...(i.antenna.active === "Yes" ? [{ title: "Antenna system", item: i.antenna, omit: ["active"] }] : []),
      ] },
  ];
  return sections.filter(s => s.rows.length > 0);
}

const card = "bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden";
const cardHead = "px-5 py-4 border-b border-[var(--color-border)] text-sm font-semibold text-[var(--color-text)]";

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "font-semibold text-[var(--color-text)]" : "text-[var(--color-muted)]"}`}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await requireUserId();

  const job = await prisma.job.findFirst({ where: { id, userId } });
  if (!job) notFound();

  const quote = await prisma.quote.findFirst({
    where:   { id: job.quoteId, userId },
    include: {
      client:    { select: { name: true, email: true, phone: true } },
      lineItems: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!quote) notFound();

  // Electrical quotes: rebuild the breakdown from what was entered in the wizard
  const [electrical, es] = quote.electricianJobId
    ? await Promise.all([
        prisma.electricianQuoteJob.findFirst({ where: { id: quote.electricianJobId, userId } }),
        prisma.electricianSettings.findUnique({ where: { id: userId } }),
      ])
    : [null, null];
  const inputs   = electrical ? parseElectricalQuote(electrical) : null;
  const calc     = inputs ? calculateElectricalQuote(inputs, engineSettingsFrom(es)) : null;
  const sections = inputs ? moduleSections(inputs) : [];
  // The breakdown is recalculated with today's rates, so it can drift from the accepted price
  const drifted  = calc ? Math.abs(calc.result.totalIncGst - quote.amountTotal) >= 0.01 : false;

  return (
    <>
      <TopBar
        title={job.jobNumber}
        description={`${quote.client.name} · ${job.title}`}
        actions={
          <div className="flex items-center gap-3">
            <StatusBadge status={job.status} />
            <a href={`/api/quote/${quote.id}/pdf`} target="_blank" rel="noopener noreferrer"
              className="px-3 py-2 border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)] text-sm rounded-lg transition-colors">
              Quote PDF
            </a>
            <a href={`/api/quote/${quote.id}/pdf?download=1`}
              className="px-3 py-2 border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)] text-sm rounded-lg transition-colors">
              Download
            </a>
          </div>
        }
      />

      <main className="flex-1 p-6 space-y-6 max-w-4xl">

        {/* Breadcrumb */}
        <nav className="text-xs text-[var(--color-muted)] flex items-center gap-1.5">
          <Link href="/jobs" className="hover:text-[var(--color-text)]">Jobs</Link>
          <span>›</span>
          <span className="text-[var(--color-text)]">{job.jobNumber}</span>
        </nav>

        {/* Metadata strip */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-[var(--color-muted)] mb-0.5">Client</p>
            <p className="font-semibold text-[var(--color-text)]">{quote.client.name}</p>
            <p className="text-xs text-[var(--color-muted)]">{quote.client.phone || quote.client.email}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--color-muted)] mb-0.5">Quote</p>
            <Link href={`/quotes/${quote.id}`} className="font-medium text-[var(--color-brand)] hover:underline">{quote.quoteNumber}</Link>
            {quote.acceptedAt && (
              <p className="text-xs text-[var(--color-muted)]">
                Accepted {formatDate(quote.acceptedAt)}{quote.acceptedByName ? ` by ${quote.acceptedByName}` : ""}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-[var(--color-muted)] mb-0.5">Accepted price</p>
            <p className="font-semibold text-[var(--color-text)]">{formatAUD(quote.amountTotal)}</p>
            <p className="text-xs text-[var(--color-muted)]">inc. GST</p>
          </div>
          {electrical?.jobAddress && (
            <div>
              <p className="text-xs text-[var(--color-muted)] mb-0.5">Job address</p>
              <p className="font-medium text-[var(--color-text)]">{electrical.jobAddress}</p>
            </div>
          )}
        </div>

        {electrical?.jobDescription && (
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
            <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-2">Job description</p>
            <p className="text-sm text-[var(--color-text)] whitespace-pre-wrap">{electrical.jobDescription}</p>
          </div>
        )}

        {/* Electrical quote: what was entered in the quote builder */}
        {inputs && calc && (
          <>
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 text-sm">
              <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-2">Site conditions</p>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-[var(--color-muted)]">
                <span>Quote type: <span className="text-[var(--color-text)]">{inputs.setup.quoteType}</span></span>
                <span>Storeys: <span className="text-[var(--color-text)]">{inputs.setup.storeys}</span></span>
                <span>Underfloor access: <span className="text-[var(--color-text)]">{inputs.setup.underfloor}</span></span>
                <span>Roof access: <span className="text-[var(--color-text)]">{inputs.setup.roofAccess}</span></span>
                <span>Open frame: <span className="text-[var(--color-text)]">{inputs.setup.openFrame}</span></span>
                <span>Crew: <span className="text-[var(--color-text)]">{calc.result.crewSummary}</span></span>
              </div>
            </div>

            {sections.map(section => {
              const contrib = calc.result.modules.find(m => m.name === section.engineName);
              return (
                <div key={section.name} className={card}>
                  <div className={`${cardHead} flex items-center justify-between`}>
                    <span>{section.name}</span>
                    {contrib && (
                      <span className="text-xs font-normal text-[var(--color-muted)]">
                        {contrib.labourHrs.toFixed(2)} labour hrs · {formatAUD(contrib.materials)} materials
                        {contrib.externalCosts > 0 ? ` · ${formatAUD(contrib.externalCosts)} external` : ""}
                      </span>
                    )}
                  </div>
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {section.rows.map(r => <ItemRow key={r.title} title={r.title} item={r.item} omit={r.omit} />)}
                    </tbody>
                  </table>
                </div>
              );
            })}

            <div className={card}>
              <div className={cardHead}>Price build-up</div>
              <div className="p-5 text-sm space-y-1">
                <Row label={`Labour (${calc.result.baselineHrs.toFixed(2)} hrs incl. ${calc.result.setupHrs.toFixed(2)} setup)`} value={formatAUD(calc.result.labourSellValue)} />
                <Row label="Materials (cost)" value={formatAUD(calc.result.rawMaterials)} />
                <Row label="Materials markup" value={formatAUD(calc.result.materialMarkup)} />
                {calc.result.externalCosts > 0 && <Row label="External costs" value={formatAUD(calc.result.externalCosts)} />}
                {calc.result.travelCallout > 0 && <Row label="Travel / callout" value={formatAUD(calc.result.travelCallout)} />}
                <Row label={`Overhead (${(calc.settings.overheadAllowance * 100).toFixed(0)}%)`} value={formatAUD(calc.result.overheadAmount)} />
                <Row label={`Contingency (${(calc.settings.contingencyAllowance * 100).toFixed(0)}%)`} value={formatAUD(calc.result.contingencyAmount)} />
                <div className="border-t border-[var(--color-border)] pt-2 mt-2 space-y-1">
                  <Row label="Subtotal ex GST" value={formatAUD(calc.result.subtotalExGst)} />
                  <Row label="GST (10%)" value={formatAUD(calc.result.gst)} />
                  <Row label="Total inc GST" value={formatAUD(calc.result.totalIncGst)} strong />
                </div>
                {drifted && (
                  <p className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-yellow-800">
                    This build-up uses your current rates and comes to {formatAUD(calc.result.totalIncGst)}. The price the client
                    accepted is {formatAUD(quote.amountTotal)}; your rates or the quote details have changed since.
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        {/* Regular quote: its line items */}
        {!inputs && (
          <div className={card}>
            <div className={cardHead}>Quote items</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-[var(--color-muted)] bg-slate-50 border-b border-[var(--color-border)]">
                  <th className="px-5 py-2.5 text-left font-medium">Description</th>
                  <th className="px-5 py-2.5 text-right font-medium">Qty</th>
                  <th className="px-5 py-2.5 text-right font-medium">Unit (ex-GST)</th>
                  <th className="px-5 py-2.5 text-right font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {quote.lineItems.map(li => (
                  <tr key={li.id}>
                    <td className="px-5 py-3 text-[var(--color-text)]">{li.description}</td>
                    <td className="px-5 py-3 text-right text-[var(--color-muted)]">{li.quantity}</td>
                    <td className="px-5 py-3 text-right text-[var(--color-muted)]">{formatAUD(li.unitPrice)}</td>
                    <td className="px-5 py-3 text-right font-medium text-[var(--color-text)]">{formatAUD(li.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-[var(--color-border)]">
                <tr>
                  <td colSpan={3} className="px-5 py-2.5 text-right text-xs text-[var(--color-muted)]">Subtotal (ex. GST)</td>
                  <td className="px-5 py-2.5 text-right text-sm text-[var(--color-muted)]">{formatAUD(quote.amountExGst)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="px-5 py-2 text-right text-xs text-[var(--color-muted)]">GST (10%)</td>
                  <td className="px-5 py-2 text-right text-sm text-[var(--color-muted)]">{formatAUD(quote.gst)}</td>
                </tr>
                <tr className="bg-slate-50">
                  <td colSpan={3} className="px-5 py-3 text-right text-sm font-semibold text-[var(--color-text)]">Total (inc. GST)</td>
                  <td className="px-5 py-3 text-right text-base font-bold text-[var(--color-brand)]">{formatAUD(quote.amountTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {job.notes && (
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
            <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-2">Notes</p>
            <p className="text-sm text-[var(--color-text)] whitespace-pre-wrap">{job.notes}</p>
          </div>
        )}

      </main>
    </>
  );
}
