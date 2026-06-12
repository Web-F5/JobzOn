// Root URL — the (dashboard) route group handles layout at /
// This file just satisfies Next.js requiring a page at the root segment.
// The actual dashboard home is app/(dashboard)/page.tsx
export { default } from "./(dashboard)/page";

// force-dynamic must be declared here too — re-exports don't carry it through
export const dynamic = "force-dynamic";
