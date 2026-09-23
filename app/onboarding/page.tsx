import { Metadata } from "next";
import { getBusinessSettings } from "@/lib/actions/settings";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export const metadata: Metadata = { title: "Welcome to JobzOn" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const settings = await getBusinessSettings();

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
