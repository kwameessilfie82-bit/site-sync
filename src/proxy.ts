import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
}

export async function proxy(request: NextRequest) {
  const cfg = getSupabaseConfig();
  if (!cfg) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(cfg.url, cfg.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuth = path.startsWith("/login") || path.startsWith("/signup");
  const isOnboarding = path.startsWith("/onboarding");
  const isAuthCallback = path.startsWith("/auth/callback");
  const isDashboard = path.startsWith("/dashboard");

  if (!user && isDashboard) {
    const next = request.nextUrl.clone();
    next.pathname = "/login";
    next.searchParams.set("next", path);
    return NextResponse.redirect(next);
  }

  if (user && isAuth) {
    const next = request.nextUrl.clone();
    next.pathname = "/dashboard";
    return NextResponse.redirect(next);
  }

  if (user && isDashboard && !isOnboarding) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("org_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profile && profile.org_id === null) {
      const next = request.nextUrl.clone();
      next.pathname = "/onboarding";
      return NextResponse.redirect(next);
    }
  }

  if (user && isOnboarding) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("org_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.org_id) {
      const next = request.nextUrl.clone();
      next.pathname = "/dashboard";
      return NextResponse.redirect(next);
    }
  }

  if (isAuthCallback) {
    return response;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
