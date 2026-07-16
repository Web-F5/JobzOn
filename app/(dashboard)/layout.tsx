import { Sidebar } from "@/components/nav/Sidebar";
import { getBusinessSettings } from "@/lib/actions/settings";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getBusinessSettings();

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      <Sidebar hideProducts={settings.hideProducts} />
      <div className="flex flex-col flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}
