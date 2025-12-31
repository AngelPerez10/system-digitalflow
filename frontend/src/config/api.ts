// API base can be overridden via VITE_API_BASE. Otherwise, derive from current host.
// In local dev, default to localhost:8000. In production, default to same origin WITHOUT port.
const isBrowser = typeof window !== 'undefined';
const isLocal = isBrowser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const DEFAULT_API_BASE = isBrowser
  ? (isLocal
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : `${window.location.protocol}//${window.location.hostname}`)
  : 'http://localhost:8000';

export const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) || DEFAULT_API_BASE;
export const apiUrl = (path: string) => {
  if (!path.startsWith("/")) path = "/" + path;
  return `${API_BASE.replace(/\/$/, "")}${path}`;
};
export const PUBLIC_ORIGIN = (import.meta.env.VITE_PUBLIC_ORIGIN || (isBrowser ? window.location.origin : '')).replace(/\/$/, '');
export const publicUrl = (path: string) => `${PUBLIC_ORIGIN}${path}`;
