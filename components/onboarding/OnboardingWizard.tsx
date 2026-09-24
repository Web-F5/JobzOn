"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  saveOnboardingTrade,
  saveOnboardingDetails,
  saveOnboardingRates,
  completeOnboarding,
} from "@/lib/actions/onboarding";
import { AddressAutocomplete } from "@/components/clients/AddressAutocomplete";

// ─── Types ────────────────────────────────────────────────────────────────────

interface InitialData {
  trade:         string;
  businessName:  string;
  abn:           string;
  phone:         string;
  address:       string;
  suburb:        string;
  state:         string;
  postcode:      string;
  emailOutgoing: string;
  emailQuotes:   string;
  logoUrl:       string | null;
}

interface AbnResult { abn: string; name: string; state: string; postcode: string }

const AUS_STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];

const inp = [
  "w-full px-3 py-2 text-sm rounded-lg border transition-colors",
  "bg-[#1e293b] text-white placeholder:text-slate-500",
  "border-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500",
].join(" ");

const STEPS = ["Your Trade", "Business Details", "Your Rates", "All Done!"];

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="w-full max-w-xl mb-8">
      <div className="flex items-center gap-2">
        {Array.from({ length: total }, (_, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors ${
              i < step  ? "bg-[#10b981] text-white" :
              i === step ? "bg-blue-500 text-white" :
              "bg-[#334155] text-slate-400"
            }`}>
              {i < step ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : i + 1}
            </div>
            {i < total - 1 && (
              <div className={`h-0.5 flex-1 transition-colors ${i < step ? "bg-[#10b981]" : "bg-[#334155]"}`} />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2">
        {STEPS.map((label, i) => (
          <span key={i} className={`text-xs ${i === step ? "text-white" : "text-slate-500"}`}
            style={{ width: `${100 / STEPS.length}%`, textAlign: i === 0 ? "left" : i === STEPS.length - 1 ? "right" : "center" }}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Step 1 — Trade selection ─────────────────────────────────────────────────

function TradeStep({ trade, onNext }: { trade: string; onNext: (t: string) => void }) {
  const [selected, setSelected] = useState(trade);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const TRADES = [
    {
      value: "electrician",
      label: "Electrician",
      icon: "⚡",
      desc: "Access the full electrician quoting tool with job modules, labour time estimates, and material pricing.",
    },
    {
      value: "general",
      label: "General Business",
      icon: "🏢",
      desc: "Standard job management and invoicing — quotes, recurring services, and client management.",
    },
  ];

  function handleNext() {
    const fd = new FormData();
    fd.set("trade", selected);
    startTransition(async () => {
      const res = await saveOnboardingTrade({}, fd);
      if (res.error) { setError(res.error); return; }
      onNext(selected);
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">What best describes your business?</h2>
        <p className="text-sm text-slate-400">This helps us show you the right tools for your trade.</p>
      </div>

      {error && <p className="text-sm text-red-400 bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">{error}</p>}

      <div className="space-y-3">
        {TRADES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setSelected(t.value)}
            className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
              selected === t.value
                ? "border-blue-500 bg-blue-500/10"
                : "border-[#334155] bg-[#1e293b] hover:border-[#475569]"
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{t.icon}</span>
              <div>
                <p className="font-semibold text-white">{t.label}</p>
                <p className="text-sm text-slate-400 mt-0.5">{t.desc}</p>
              </div>
              {selected === t.value && (
                <div className="ml-auto shrink-0 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
          </button>
        ))}

        {/* Coming soon */}
        <div className="w-full text-left p-4 rounded-xl border-2 border-dashed border-[#334155] opacity-50 cursor-not-allowed">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔧</span>
            <div>
              <p className="font-semibold text-slate-300">More trades coming soon…</p>
              <p className="text-sm text-slate-500 mt-0.5">Plumbers, plasterers, painters and more.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={handleNext}
          disabled={pending}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
        >
          {pending ? "Saving…" : "Next →"}
        </button>
      </div>
    </div>
  );
}

// ─── Step 2 — Business details ────────────────────────────────────────────────

function DetailsStep({ initial, onNext, onBack }: {
  initial: Pick<InitialData, "businessName" | "abn" | "phone" | "address" | "suburb" | "state" | "postcode" | "emailOutgoing" | "emailQuotes">;
  onNext: () => void;
  onBack: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [businessName, setBusinessName] = useState(initial.businessName);
  const [abn,          setAbn]          = useState(initial.abn);
  const [suburb,       setSuburb]       = useState(initial.suburb);
  const [stateVal,     setStateVal]     = useState(initial.state || "VIC");
  const [postcode,     setPostcode]     = useState(initial.postcode);

  // ABN lookup
  const [abnResults, setAbnResults] = useState<AbnResult[]>([]);
  const [abnLoading, setAbnLoading] = useState(false);
  const [abnOpen,    setAbnOpen]    = useState(false);
  const abnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abnRef      = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (abnRef.current && !abnRef.current.contains(e.target as Node)) setAbnOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleAbnSearch(name: string) {
    setBusinessName(name);
    if (abnTimerRef.current) clearTimeout(abnTimerRef.current);
    if (name.trim().length < 3) { setAbnResults([]); setAbnOpen(false); return; }
    abnTimerRef.current = setTimeout(async () => {
      setAbnLoading(true);
      try {
        const res  = await fetch(`/api/abn/search?name=${encodeURIComponent(name)}`);
        const data = await res.json();
        setAbnResults(data.results ?? []);
        setAbnOpen((data.results ?? []).length > 0);
      } finally { setAbnLoading(false); }
    }, 400);
  }

  function selectAbn(r: AbnResult) {
    setBusinessName(r.name);
    setAbn(r.abn.replace(/(\d{2})(\d{3})(\d{3})(\d{3})/, "$1 $2 $3 $4"));
    setAbnOpen(false);
    setAbnResults([]);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("businessName", businessName);
    fd.set("abn",          abn);
    fd.set("suburb",       suburb);
    fd.set("state",        stateVal);
    fd.set("postcode",     postcode);

    startTransition(async () => {
      const res = await saveOnboardingDetails({}, fd);
      if (res.error) { setError(res.error); return; }
      onNext();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">Tell us about your business</h2>
        <p className="text-sm text-slate-400">
          This information appears on your invoices and quotes. Fill in as much as you can — it can always be edited later in <span className="text-white">Settings ⚙</span>.
        </p>
      </div>

      {error && <p className="text-sm text-red-400 bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">{error}</p>}

      <div className="space-y-4">

        {/* Business name + ABN lookup */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1 relative" ref={abnRef}>
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Business Name <span className="text-red-400">*</span></label>
            <div className="relative">
              <input
                value={businessName}
                onChange={(e) => handleAbnSearch(e.target.value)}
                placeholder="e.g. Sparky's Electrical"
                required
                className={inp}
              />
              {abnLoading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">searching…</span>}
            </div>
            {abnOpen && abnResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-[#1e293b] border border-[#334155] rounded-lg shadow-xl overflow-hidden">
                {abnResults.map((r) => (
                  <button key={r.abn} type="button" onClick={() => selectAbn(r)}
                    className="w-full text-left px-3 py-2.5 text-sm hover:bg-[#334155] transition-colors border-b border-[#334155] last:border-0">
                    <span className="font-medium text-white">{r.name}</span>
                    <span className="ml-2 text-xs text-slate-400">ABN {r.abn} · {r.state} {r.postcode}</span>
                  </button>
                ))}
              </div>
            )}
            <p className="text-xs text-slate-500">Type 3+ characters to look up your ABN automatically</p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">ABN</label>
            <input value={abn} onChange={(e) => setAbn(e.target.value)} placeholder="XX XXX XXX XXX" className={inp} />
          </div>
        </div>

        {/* Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Business Phone</label>
            <input name="phone" type="tel" defaultValue={initial.phone} placeholder="0400 000 000" className={inp} />
          </div>
        </div>

        {/* Address */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Street Address <span className="text-slate-600 normal-case font-normal">(optional)</span></label>
          <AddressAutocomplete
            defaultValue={initial.address}
            inputClassName={inp}
            onSelect={({ suburb: s, state: st, postcode: p }) => {
              if (s)  setSuburb(s);
              if (st) setStateVal(st);
              if (p)  setPostcode(p);
            }}
          />
        </div>

        <div className="grid grid-cols-[1fr_80px_90px] gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Suburb / Town</label>
            <AddressAutocomplete
              searchType="locality"
              value={suburb}
              inputClassName={inp}
              onSelect={({ suburb: s, state: st, postcode: p }) => {
                if (s)  setSuburb(s);
                if (st) setStateVal(st);
                if (p)  setPostcode(p);
              }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">State</label>
            <select value={stateVal} onChange={(e) => setStateVal(e.target.value)} className={inp + " cursor-pointer"}>
              <option value="">—</option>
              {AUS_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Postcode</label>
            <input value={postcode} onChange={(e) => setPostcode(e.target.value)} placeholder="3660" maxLength={4} className={inp} />
          </div>
        </div>

        {/* Emails */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Business Email</label>
            <input name="emailOutgoing" type="email" defaultValue={initial.emailOutgoing} placeholder="accounts@yourbusiness.com.au" className={inp} />
            <p className="text-xs text-slate-500">Printed on invoices &amp; quotes</p>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Quote Enquiries Email <span className="text-slate-600 normal-case font-normal">(optional)</span></label>
            <input name="emailQuotes" type="email" defaultValue={initial.emailQuotes} placeholder="quotes@yourbusiness.com.au" className={inp} />
            <p className="text-xs text-slate-500">Leave blank if same as Business Email</p>
          </div>
        </div>

        {/* Logo upload */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Business Logo <span className="text-slate-600 normal-case font-normal">(optional — max 2 MB)</span></label>
          <input name="logo" type="file" accept="image/*" className="text-sm text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer" />
          <p className="text-xs text-slate-500">Appears on invoice and quote PDFs. Can be changed anytime in Settings.</p>
        </div>

      </div>

      <div className="flex justify-between pt-2">
        <button type="button" onClick={onBack} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">← Back</button>
        <button type="submit" disabled={pending}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60">
          {pending ? "Saving…" : "Next →"}
        </button>
      </div>
    </form>
  );
}

// ─── Step 3 — Electrician rates ───────────────────────────────────────────────

function RatesStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error,   setError]        = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await saveOnboardingRates({}, fd);
      if (res.error) { setError(res.error); return; }
      onNext();
    });
  }

  const numInp = inp + " w-full";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">Your Business Rates</h2>
        <p className="text-sm text-slate-400">
          These defaults are pre-filled based on typical electrician rates. Adjust them to match your business — they drive all your quotes automatically.
        </p>
      </div>

      {error && <p className="text-sm text-red-400 bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">{error}</p>}

      <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white">Labour</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <RateField label="Sell rate / hr" hint="What you charge the client per hour" prefix="$">
            <input name="labourSellRate" type="number" step="1" min="0" defaultValue={170} className={numInp} />
          </RateField>
          <RateField label="Internal cost / hr" hint="Your actual cost including wages &amp; super" prefix="$">
            <input name="labourCostRate" type="number" step="1" min="0" defaultValue={65} className={numInp} />
          </RateField>
        </div>
      </div>

      <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white">Job Costs</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <RateField label="Overhead allowance" hint="Applied to every job (e.g. 10 = 10%)" suffix="%">
            <input name="overheadAllowance" type="number" step="0.5" min="0" max="50" defaultValue={10} className={numInp} />
          </RateField>
          <RateField label="Contingency allowance" hint="Buffer for unexpected costs (e.g. 5 = 5%)" suffix="%">
            <input name="contingencyAllowance" type="number" step="0.5" min="0" max="30" defaultValue={5} className={numInp} />
          </RateField>
          <RateField label="Minimum job charge" hint="Smallest amount you'll invoice for a job" prefix="$">
            <input name="minimumJobCharge" type="number" step="10" min="0" defaultValue={500} className={numInp} />
          </RateField>
          <RateField label="Travel / callout fee" hint="Added to every job (0 = no callout fee)" prefix="$">
            <input name="travelCallout" type="number" step="10" min="0" defaultValue={0} className={numInp} />
          </RateField>
        </div>
      </div>

      <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white">Quote Presentation</h3>
        <RateField label="Quote rounding" hint="Final price rounded to nearest $ amount (e.g. 10 = nearest $10)" prefix="$">
          <input name="quoteRounding" type="number" step="1" min="1" defaultValue={10} className={numInp + " w-32"} />
        </RateField>
      </div>

      <p className="text-xs text-slate-500 text-center">All rates can be changed anytime in Settings ⚙</p>

      <div className="flex justify-between pt-2">
        <button type="button" onClick={onBack} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">← Back</button>
        <button type="submit" disabled={pending}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60">
          {pending ? "Saving…" : "Next →"}
        </button>
      </div>
    </form>
  );
}

function RateField({ label, hint, prefix, suffix, children }: {
  label: string; hint: string; prefix?: string; suffix?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</label>
      <div className="flex items-center gap-2">
        {prefix && <span className="text-sm text-slate-400 shrink-0">{prefix}</span>}
        {children}
        {suffix && <span className="text-sm text-slate-400 shrink-0">{suffix}</span>}
      </div>
      <p className="text-xs text-slate-500">{hint}</p>
    </div>
  );
}

// ─── Step 4 — Ready ───────────────────────────────────────────────────────────

function ReadyStep({ trade, onDone }: { trade: string; onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleDone() {
    startTransition(async () => {
      await completeOnboarding();
      router.refresh();
      router.replace("/");
    });
  }

  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-center">
        <div className="w-20 h-20 rounded-full bg-[#10b981]/20 border-2 border-[#10b981] flex items-center justify-center">
          <svg className="w-10 h-10 text-[#10b981]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white mb-2">You're all set!</h2>
        <p className="text-slate-400 max-w-sm mx-auto">
          Your workspace is ready. Here's what to do next:
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
        {trade === "electrician" ? (
          <>
            <NextAction icon="⚡" title="Add your first Service" desc="Set up your service catalogue with your standard job types and pricing." href="/services" />
            <NextAction icon="👤" title="Add a Client" desc="Add your first client so you can create quotes and invoices." href="/clients" />
            <NextAction icon="📋" title="Create a Quote" desc="Use the electrician quoting tool to build your first job quote." href="/quotes/new" />
            <NextAction icon="⚙️" title="Review your Settings" desc="Update payment details, bank info, and business logo." href="/settings" />
          </>
        ) : (
          <>
            <NextAction icon="🔧" title="Add a Service" desc="Set up your service catalogue — reusable items for quotes and invoices." href="/services" />
            <NextAction icon="👤" title="Add a Client" desc="Add your first client to get started with invoicing." href="/clients" />
            <NextAction icon="📋" title="Create a Quote" desc="Send a professional quote to your first client." href="/quotes/new" />
            <NextAction icon="⚙️" title="Review your Settings" desc="Add payment details and your business logo." href="/settings" />
          </>
        )}
      </div>

      <button
        onClick={handleDone}
        disabled={pending}
        className="inline-flex items-center gap-2 px-8 py-3 bg-[#10b981] hover:bg-green-400 text-white font-semibold rounded-xl transition-colors disabled:opacity-60 text-base"
      >
        {pending ? "Loading…" : "Go to JobzOn →"}
      </button>
    </div>
  );
}

function NextAction({ icon, title, desc, href }: { icon: string; title: string; desc: string; href: string }) {
  return (
    <a href={href}
      className="flex items-start gap-3 p-4 bg-[#1e293b] border border-[#334155] rounded-xl hover:border-[#475569] transition-colors group">
      <span className="text-xl shrink-0">{icon}</span>
      <div>
        <p className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">{title}</p>
        <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
      </div>
    </a>
  );
}

// ─── Main wizard ──────────────────────────────────────────────────────────────

export function OnboardingWizard({ initial }: { initial: InitialData }) {
  const [step,  setStep]  = useState(0);
  const [trade, setTrade] = useState(initial.trade);

  // Skip rates step for non-electricians
  const totalSteps = trade === "electrician" ? 4 : 3;
  const stepLabels = trade === "electrician" ? STEPS : ["Your Trade", "Business Details", "All Done!"];

  function goNext() { setStep((s) => s + 1); }
  function goBack() { setStep((s) => s - 1); }

  return (
    <div className="w-full max-w-xl">
      {/* Logo */}
      <div className="flex justify-center mb-8">
        <img src="/jobzon-logo.svg" alt="JobzOn" className="h-10 object-contain" />
      </div>

      {/* Progress */}
      <div className="w-full mb-8">
        <div className="flex items-center gap-2">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors ${
                i < step  ? "bg-[#10b981] text-white" :
                i === step ? "bg-blue-500 text-white" :
                "bg-[#334155] text-slate-400"
              }`}>
                {i < step ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : i + 1}
              </div>
              {i < totalSteps - 1 && (
                <div className={`h-0.5 flex-1 transition-colors ${i < step ? "bg-[#10b981]" : "bg-[#334155]"}`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2">
          {stepLabels.map((label, i) => (
            <span key={i} className={`text-xs ${i === step ? "text-white" : "text-slate-500"}`}
              style={{ width: `${100 / totalSteps}%`, textAlign: i === 0 ? "left" : i === totalSteps - 1 ? "right" : "center" }}>
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Card */}
      <div className="bg-[#182134] border border-[#334155] rounded-2xl p-6 shadow-2xl">
        {step === 0 && (
          <TradeStep
            trade={trade}
            onNext={(t) => { setTrade(t); goNext(); }}
          />
        )}
        {step === 1 && (
          <DetailsStep
            initial={initial}
            onNext={goNext}
            onBack={goBack}
          />
        )}
        {step === 2 && trade === "electrician" && (
          <RatesStep onNext={goNext} onBack={goBack} />
        )}
        {((step === 2 && trade !== "electrician") || step === 3) && (
          <ReadyStep trade={trade} onDone={() => {}} />
        )}
      </div>

      <p className="text-center text-xs text-slate-600 mt-4">
        We keep your information safe and only use it for your invoices.
      </p>
    </div>
  );
}
