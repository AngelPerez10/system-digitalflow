export function shouldAcceptScan(
  code: string,
  nowMs: number,
  last: { code: string; at: number } | null,
  windowMs = 300,
): boolean {
  if (!code) return false;
  if (!last) return true;
  if (last.code === code && nowMs - last.at < windowMs) return false;
  return true;
}
