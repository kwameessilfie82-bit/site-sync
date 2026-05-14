import type { NextConfig } from "next";

/**
 * When `NEXT_PUBLIC_SITE_URL` is unset at build time (common on Vercel previews),
 * bake in `https://${VERCEL_URL}` so Supabase confirmation links match the deployment host.
 * For a custom domain in production, set `NEXT_PUBLIC_SITE_URL` explicitly in the project env.
 */
const nextPublicSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  (process.env.VERCEL_URL?.trim() ? `https://${process.env.VERCEL_URL.trim()}` : "");

const nextConfig: NextConfig = {
  env: {
    ...(nextPublicSiteUrl ? { NEXT_PUBLIC_SITE_URL: nextPublicSiteUrl } : {}),
  },
};

export default nextConfig;
