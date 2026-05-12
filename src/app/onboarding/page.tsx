import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "@/app/onboarding/onboarding-form";
import { AuthTopBar } from "@/components/public-chrome";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/ui/primitives/card";

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
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="font-heading text-2xl tracking-tight">
              Create your organization
            </CardTitle>
            <CardDescription>
              This becomes the tenant for all projects, people, and attendance. You will be the
              owner.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OnboardingForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
