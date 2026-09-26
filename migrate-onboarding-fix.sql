-- Mark ALL existing accounts as onboarded (catches users without a businessName)
UPDATE "BusinessSettings" SET "onboardingComplete" = true;
