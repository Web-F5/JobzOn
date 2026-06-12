import { Sidebar } from "@/components/nav/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}
