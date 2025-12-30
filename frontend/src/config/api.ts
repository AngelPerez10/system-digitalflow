const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export function apiUrl(path: string): string {
  if (!path.startsWith("/")) path = "/" + path;
  return BASE_URL.replace(/\/$/, "") + path;
}
