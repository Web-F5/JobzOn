import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getBusinessSettings } from "@/lib/actions/settings";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export const metadata: Metadata = { title: "Welcome to JobzOn" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const settings = await getBusinessSettings();

  // Already completed — send straight to dashboard
  if (settings.onboardingComplete) redirect("/");

  return (
    <OnboardingWizard
      initial={{
        trade:         settings.trade        ?? "general",
        businessName:  settings.businessName ?? "",
        abn:           settings.abn          ?? "",
        phone:         settings.phone        ?? "",
        address:       settings.address      ?? "",
        suburb:        settings.suburb       ?? "",
        state:         settings.state        ?? "",
        postcode:      settings.postcode     ?? "",
        emailOutgoing: settings.emailOutgoing ?? "",
        emailQuotes:   settings.emailQuotes  ?? "",
        logoUrl:       settings.logoUrl      ?? null,
      }}
    />
  );
}
