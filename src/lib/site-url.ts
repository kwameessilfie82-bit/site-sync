/**
 * Canonical site URL for Supabase `emailRedirectTo` and post-auth redirects.
 *
 * Production checklist:
 * - Set `NEXT_PUBLIC_SITE_URL` to your public origin (e.g. https://app.example.com).
 *   On Vercel, if you omit it, `next.config.ts` can fall back to `https://${VERCEL_URL}` at build time.
 * - In Supabase Dashboard → Authentication → URL configuration: set **Site URL** to the same origin
 *   and add `https://your-domain/auth/callback` (and preview URLs) under **Redirect URLs**.
 *
 * If confirmation emails still point at localhost, you likely signed up from localhost, or the
 * deployed build had no public URL env (rebuild after setting env vars).
 */
export function normalizeSiteUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

function siteUrlFromVercelServer(): string | null {
  const host = process.env.VERCEL_URL?.trim();
  if (host) return normalizeSiteUrl(`https://${host}`);
  return null;
}

/** Use in client components (e.g. signUp emailRedirectTo). */
export function getPublicSiteUrlFromClient(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv && fromEnv.trim()) return normalizeSiteUrl(fromEnv);
  if (typeof window !== "undefined") return window.location.origin;
  const fromVercel = siteUrlFromVercelServer();
  if (fromVercel) return fromVercel;
  return "http://localhost:3000";
}

/** Use on the server when building absolute redirect targets. */
export function getPublicSiteUrlFromRequest(requestUrl: string): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv && fromEnv.trim()) return normalizeSiteUrl(fromEnv);
  const fromVercel = siteUrlFromVercelServer();
  if (fromVercel) return fromVercel;
  return normalizeSiteUrl(new URL(requestUrl).origin);
}
