import type {
  LoginResponse,
  ModulePermissions,
  RegistroClientePayload,
  RegistroClienteResultado,
  SessionUser,
} from '@/types/api';
import { apiClient } from './client';
import { parseLoginResponse, parsePermissions, parseSessionUser } from './parsers';

/**
 * `client: "mobile"` + `X-Client: mobile` hacen que el backend incluya el
 * refresh en el body (el web sigue recibiéndolo solo por cookie HttpOnly).
 */
export async function login(username: string, password: string): Promise<LoginResponse> {
  const raw = await apiClient.request<unknown>('/login/', {
    method: 'POST',
    auth: false,
    body: { username: username.trim(), password, client: 'mobile' },
  });
  return parseLoginResponse(raw);
}

/** Invalida el refresh en el servidor (blacklist). Nunca debe bloquear el logout local. */
export async function logout(refresh: string | null): Promise<void> {
  await apiClient.request<unknown>('/logout/', {
    method: 'POST',
    body: refresh ? { refresh } : {},
  });
}

/**
 * Solicita una cuenta de portal cliente. No autentica: el backend crea una
 * solicitud (`ClienteRegistroSolicitud`) que un administrador revisa y, al
 * aprobar, envía las credenciales por correo.
 */
export async function registrarCliente(
  payload: RegistroClientePayload,
): Promise<RegistroClienteResultado> {
  const raw = await apiClient.request<{ status?: unknown; solicitud_id?: unknown; detail?: unknown }>(
    '/portal-cliente/registro/',
    { method: 'POST', auth: false, body: payload },
  );
  const status = raw?.status === 'pending_review' ? 'pending_review' : 'created';
  const solicitudId = typeof raw?.solicitud_id === 'number' ? raw.solicitud_id : null;
  const detail =
    typeof raw?.detail === 'string' && raw.detail.trim().length > 0
      ? raw.detail.trim()
      : 'Recibimos tu solicitud.';
  return { status, solicitudId, detail };
}

export async function fetchMe(): Promise<SessionUser> {
  return parseSessionUser(await apiClient.request<unknown>('/me/'));
}

export async function fetchMyPermissions(): Promise<ModulePermissions> {
  const raw = await apiClient.request<{ permissions?: unknown }>('/me/permissions/');
  return parsePermissions(raw?.permissions);
}
