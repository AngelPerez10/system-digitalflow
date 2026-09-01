import type { SessionUser } from '@/types/api';

/**
 * Nombre visible del técnico: primer nombre + segundo (apellido).
 * Si faltan ambos, cae al username; si tampoco, al fallback.
 */
export function nombreUsuarioDisplay(
  user: Pick<SessionUser, 'first_name' | 'last_name' | 'username'> | null | undefined,
  fallback = 'Técnico',
): string {
  if (!user) return fallback;
  const partes = [user.first_name, user.last_name]
    .map((p) => (typeof p === 'string' ? p.trim() : ''))
    .filter(Boolean);
  if (partes.length > 0) return partes.join(' ');
  const username = user.username?.trim();
  return username || fallback;
}

/** Iniciales para avatar (máx. 2 letras). */
export function inicialesUsuarioDisplay(nombre: string, fallback = 'S'): string {
  const iniciales = nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .filter(Boolean)
    .join('');
  return iniciales || fallback;
}
