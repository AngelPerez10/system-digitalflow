import type { WialonUnitSearchEntry } from "./wialonTypes";

export function compactSearchToken(value: string): string {
  return value.replace(/[\s\-_./:;]+/g, "").toLowerCase();
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function unitEntryMatchesQuery(entry: WialonUnitSearchEntry, query: string): boolean {
  const haystack = (
    entry.search_text ??
    [entry.name, entry.uid, entry.phone, entry.status, entry.custom_fields, String(entry.unit_id)].join(" ")
  ).toLowerCase();
  if (haystack.includes(query)) return true;

  const queryDigits = digitsOnly(query);
  const uidDigits = digitsOnly(String(entry.uid ?? ""));
  const phoneDigits = digitsOnly(String(entry.phone ?? ""));
  if (queryDigits.length >= 6) {
    if (uidDigits.includes(queryDigits) || phoneDigits.includes(queryDigits)) return true;
    if (digitsOnly(haystack).includes(queryDigits)) return true;
  }

  const compactQuery = compactSearchToken(query);
  if (compactQuery.length < 3) return false;
  return compactSearchToken(haystack).includes(compactQuery);
}
