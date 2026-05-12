/** Normalize Supabase embedded FK (object or single-element array from typings). */
export function embedOne<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}
