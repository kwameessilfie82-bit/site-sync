import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingFlow } from "@/app/onboarding/onboarding-flow";
import { AuthTopBar } from "@/components/public-chrome";
import { Card } from "@/ui/primitives/card";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.org_id) redirect("/dashboard");

  return (
    <div className="flex min-h-svh flex-col bg-muted/30">
      <AuthTopBar />
      <div className="flex flex-1 flex-col justify-center px-4 py-10">
        <Card className="mx-auto w-full max-w-md shadow-md">
          <OnboardingFlow />
        </Card>
      </div>
    </div>
  );
}
