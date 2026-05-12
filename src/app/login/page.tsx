import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/app/login/login-form";
import { AuthTopBar } from "@/components/public-chrome";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/ui/primitives/card";
import { Skeleton } from "@/ui/primitives/skeleton";

export default function LoginPage() {
  return (
    <div className="flex min-h-svh flex-col bg-muted/30">
      <AuthTopBar />
      <div className="flex flex-1 flex-col justify-center px-4 py-10">
        <Card className="mx-auto w-full max-w-md shadow-md">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="font-heading text-2xl tracking-tight">Sign in</CardTitle>
            <CardDescription>Use your Site Sync account.</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense
              fallback={
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-9 w-full" />
                </div>
              }
            >
              <LoginForm />
            </Suspense>
          </CardContent>
          <CardFooter className="flex justify-center border-t">
            <p className="text-center text-sm text-muted-foreground">
              No account?{" "}
              <Link
                href="/signup"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Sign up
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
