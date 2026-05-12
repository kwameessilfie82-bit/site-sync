"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function LoginSignupLink() {
  const searchParams = useSearchParams();
  const invite = searchParams.get("invite")?.trim();
  const href = invite ? `/signup?invite=${encodeURIComponent(invite)}` : "/signup";

  return (
    <p className="text-center text-sm text-muted-foreground">
      No account?{" "}
      <Link href={href} className="font-medium text-foreground underline-offset-4 hover:underline">
        Sign up
      </Link>
    </p>
  );
}
