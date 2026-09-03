import { useState, useEffect, type ChangeEvent, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import Input from "@/components/form/input/InputField";
import Checkbox from "@/components/form/input/Checkbox";
import {
  ensureCsrfCookie,
  fetchApi,
  resetRefreshState,
  storeCsrfTokenFromPayload,
} from "@/config/api";
import {
  clearRememberedLogin,
  loadRememberedLogin,
  persistRememberedLogin,
} from "@/config/rememberLogin";
import { parseLoginError, type LoginSuccessPayload } from "@/config/loginErrors";
import { useAuth } from "@/context/AuthContext";
import { useMarca } from "@/context/MarcaContext";
import { cn } from "@/lib/utils";
import type { Permissions } from "@/context/authTypes";
import { getOrdenesListPath } from "@/pages/Operacion/OrdenesTrabajo/OrdenServicio/useOrdenesPagePermissions";

type SignInLocationState = {
  from?: {
    pathname?: string;
  };
};

async function login(loginValue: string, password: string, remember: boolean) {
  await ensureCsrfCookie();
  const credentials = loginValue.includes("@")
    ? { email: loginValue, password }
    : { username: loginValue, password };
  const res = await fetchApi("/api/login/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...credentials, remember }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(parseLoginError(res, data));
  return data;
}

function LoadingSpinner() {
  return (
    <span
      className="inline-block h-[1.125rem] w-[1.125rem] animate-spin rounded-full border-2 border-white/30 border-t-white motion-reduce:animate-none"
      aria-hidden
    />
  );
}

function ArrowIcon() {
  return (
    <svg
      className="auth-btn-primary__icon"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M4 10h12M11 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function resolvePostLoginPath(
  isAdmin: boolean,
  permissions: Permissions,
  from?: string | null,
): string {
  if (isAdmin) {
    return from && from !== "/" ? from : "/";
  }
  if (permissions?.ordenes?.view === true) {
    return getOrdenesListPath(permissions, false);
  }
  return "/";
}

export default function SignInForm() {
  const remembered = loadRememberedLogin();
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState<boolean>(() => Boolean(remembered));
  const [loginValue, setLoginValue] = useState(remembered);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { refresh: refreshAuth, applyLoginSession, user, permissions } = useAuth();
  const { nombre } = useMarca();
  const loginErrorId = "login-error";

  useEffect(() => {
    if (user?.username) {
      const isAdmin = user.is_superuser || user.is_staff;
      const from = (location.state as SignInLocationState | null)?.from?.pathname;
      navigate(resolvePostLoginPath(isAdmin, permissions, from), { replace: true });
      return;
    }
    setAuthReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const data = await login(loginValue, password, remember);
      storeCsrfTokenFromPayload(data);
      resetRefreshState();
      applyLoginSession(data as LoginSuccessPayload);
      if (!String(data.username ?? "").trim()) {
        throw new Error("Respuesta de inicio de sesión incompleta. Contacta al administrador.");
      }
      if (remember) {
        persistRememberedLogin(loginValue);
      } else {
        clearRememberedLogin();
      }
      await refreshAuth();
      setPassword("");
      setMessage(null);
      const isAdmin = data.is_superuser || data.is_staff;
      const from = (location.state as SignInLocationState | null)?.from?.pathname;
      const loginPerms = (data.permissions as Permissions) ?? permissions;
      navigate(resolvePostLoginPath(isAdmin, loginPerms, from), { replace: true });
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  if (!authReady && !user?.username) {
    return (
      <div role="status" aria-live="polite">
        <div className="flex flex-col items-center gap-4 py-14 text-center">
          <span
            className="inline-block h-9 w-9 animate-spin rounded-full border-2 border-[#1B5CFF]/30 border-t-[#1B5CFF] motion-reduce:animate-none dark:border-[#4B7CFF]/30 dark:border-t-[#4B7CFF]"
            aria-hidden
          />
          <p className="text-sm text-[#6E6E77] dark:text-[#8EA0B8]">Verificando sesión…</p>
        </div>
      </div>
    );
  }

  const hasError = Boolean(message);
  const inputClass = cn("auth-input", hasError && "auth-input--error");

  return (
    <div className="w-full">
      <header className="auth-signin__header">
        <p className="auth-signin__eyebrow">Acceso al sistema</p>
        <h1 className="auth-signin__title">Iniciar sesión</h1>
        <p className="auth-signin__subtitle">
          Ingresa tus credenciales para continuar al panel de {nombre}.
        </p>
      </header>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div className="auth-field">
          <label htmlFor="login-value" className="auth-field__label">
            Correo o usuario <span className="text-[#c64545]">*</span>
          </label>
          <Input
            id="login-value"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={loginValue}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setLoginValue(e.target.value)}
            placeholder="correo@ejemplo.com"
            className={inputClass}
            error={hasError}
            disabled={loading}
            required
            aria-invalid={hasError}
            aria-describedby={hasError ? loginErrorId : undefined}
          />
        </div>

        <div className="auth-field">
          <label htmlFor="login-password" className="auth-field__label">
            Contraseña <span className="text-[#c64545]">*</span>
          </label>
          <div className="relative">
            <Input
              id="login-password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              type={showPassword ? "text" : "password"}
              placeholder="Ingresa tu contraseña"
              className={cn(inputClass, "!pr-12")}
              error={hasError}
              disabled={loading}
              required
              aria-invalid={hasError}
              aria-describedby={hasError ? loginErrorId : undefined}
            />
            <button
              type="button"
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword(!showPassword)}
              disabled={loading}
              className="absolute right-1.5 top-1/2 z-30 flex h-11 w-11 min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-[10px] text-[#6E6E77] transition-colors hover:bg-[#FAFAFA] hover:text-[#09090B] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/35 disabled:opacity-50 dark:text-[#8EA0B8] dark:hover:bg-[#1e293b] dark:hover:text-[#F8FAFC]"
            >
              {showPassword ? (
                <EyeIcon className="size-[1.125rem] fill-current" />
              ) : (
                <EyeCloseIcon className="size-[1.125rem] fill-current" />
              )}
            </button>
          </div>
        </div>

        {message ? (
          <div id={loginErrorId} role="alert" className="auth-alert-error">
            <svg
              className="mt-0.5 h-4 w-4 shrink-0"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z"
                clipRule="evenodd"
              />
            </svg>
            <span>{message}</span>
          </div>
        ) : null}

        <div className="auth-form-actions">
          <div className="min-w-0">
            <Checkbox
              id="login-remember"
              checked={remember}
              onChange={setRemember}
              disabled={loading}
              label="Recordarme"
              aria-describedby="login-remember-hint"
              className="checked:border-[#1B5CFF] checked:bg-[#1B5CFF] dark:checked:border-[#4B7CFF] dark:checked:bg-[#4B7CFF]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="auth-btn-primary group"
          >
            {loading ? (
              <>
                <LoadingSpinner />
                Ingresando…
              </>
            ) : (
              <>
                Ingresar
                <ArrowIcon />
              </>
            )}
          </button>
        </div>
      </form>

      <p className="auth-help-text">
        <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <rect x="4.5" y="8.5" width="11" height="8" rx="1.6" />
          <path d="M7 8.5V6a3 3 0 0 1 6 0v2.5" strokeLinecap="round" />
        </svg>
        Acceso restringido a personal autorizado.
      </p>
    </div>
  );
}
