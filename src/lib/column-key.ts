/** Stable snake_case key for custom log columns (unique per log sheet). */
export function allocateColumnKey(label: string, existing: Set<string>): string {
  const base =
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "field";
  let key = base;
  let n = 2;
  while (existing.has(key)) {
    key = `${base}_${n}`;
    n += 1;
  }
  return key;
}
