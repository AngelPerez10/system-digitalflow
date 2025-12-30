const BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://system-digitalflow.onrender.com";

export function apiUrl(path: string): string {
  if (!path.startsWith("/")) path = "/" + path;
  return BASE_URL.replace(/\/$/, "") + path;
}
