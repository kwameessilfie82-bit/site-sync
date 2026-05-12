import { Suspense } from "react";
import { SignupForm } from "@/app/signup/signup-form";
import { AuthTopBar } from "@/components/public-chrome";
import { Card, CardContent, CardHeader } from "@/ui/primitives/card";
import { Skeleton } from "@/ui/primitives/skeleton";

function SignupFallback() {
  return (
    <>
      <CardHeader className="space-y-1 text-center">
        <Skeleton className="mx-auto h-8 w-48" />
        <Skeleton className="mx-auto h-4 w-full max-w-sm" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </>
  );
}

export default function SignupPage() {
  return (
    <div className="flex min-h-svh flex-col bg-muted/30">
      <AuthTopBar />
      <div className="flex flex-1 flex-col justify-center px-4 py-10">
        <Card className="mx-auto w-full max-w-md shadow-md">
          <Suspense fallback={<SignupFallback />}>
            <SignupForm />
          </Suspense>
        </Card>
      </div>
    </div>
  );
}
