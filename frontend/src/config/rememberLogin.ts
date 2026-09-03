/** Usuario recordado en este equipo. Nunca guardar contraseña ni tokens. */

export const REMEMBERED_LOGIN_KEY = "df.login.remembered_username";

export function loadRememberedLogin(): string {
  try {
    return (localStorage.getItem(REMEMBERED_LOGIN_KEY) || "").trim();
  } catch {
    return "";
  }
}

export function persistRememberedLogin(loginValue: string) {
  const value = loginValue.trim();
  if (!value) {
    clearRememberedLogin();
    return;
  }
  try {
    localStorage.setItem(REMEMBERED_LOGIN_KEY, value);
  } catch {
    /* modo privado / storage bloqueado */
  }
}

export function clearRememberedLogin() {
  try {
    localStorage.removeItem(REMEMBERED_LOGIN_KEY);
  } catch {
    /* ignore */
  }
}
