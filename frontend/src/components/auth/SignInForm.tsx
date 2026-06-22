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
import { parseLoginError, type LoginSuccessPayload } from "@/config/loginErrors";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

type SignInLocationState = {
  from?: {
    pathname?: string;
  };
};

async function login(loginValue: string, password: string) {
  await ensureCsrfCookie();
  const res = await fetchApi("/api/login/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      loginValue.includes("@")
        ? { email: loginValue, password }
        : { username: loginValue, password }
    ),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(parseLoginError(res, data));
  return data;
}

function LoadingSpinner() {
  return (
    <span
      className="inline-block h-[1.125rem] w-[1.125rem] animate-spin rounded-full border-2 border-[#1c1917]/20 border-t-[#1c1917]"
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

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState<boolean>(false);
  const [loginValue, setLoginValue] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { refresh: refreshAuth, applyLoginSession, user } = useAuth();

  useEffect(() => {
    if (user?.username) {
      const isAdmin = user.is_superuser || user.is_staff;
      const from = (location.state as SignInLocationState | null)?.from?.pathname;
      navigate(isAdmin ? from || "/" : "/ordenes-tecnico", { replace: true });
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
      const data = await login(loginValue, password);
      storeCsrfTokenFromPayload(data);
      resetRefreshState();
      applyLoginSession(data as LoginSuccessPayload);
      if (!String(data.username ?? "").trim()) {
        throw new Error("Respuesta de inicio de sesión incompleta. Contacta al administrador.");
      }
      await refreshAuth();
      setPassword("");
      setMessage(null);
      const isAdmin = data.is_superuser || data.is_staff;
      const from = (location.state as SignInLocationState | null)?.from?.pathname;
      const to = isAdmin ? (from && from !== "/" ? from : "/") : "/ordenes-tecnico";
      navigate(to, { replace: true });
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
            className="inline-block h-9 w-9 animate-spin rounded-full border-2 border-[#ff801f]/30 border-t-[#ff801f]"
            aria-hidden
          />
          <p className="text-sm text-[#78716c] dark:text-[#8ea0b8]">Verificando sesión…</p>
        </div>
      </div>
    );
  }

  const hasError = Boolean(message);
  const inputClass = cn(
    "auth-input !h-12 !rounded-xl !px-4 !shadow-[inset_0_1px_2px_rgba(28,25,23,0.04)] dark:!shadow-none",
    hasError && "auth-input--error"
  );

  return (
    <div className="w-full">
      <header className="auth-signin__header">
        <p className="auth-signin__eyebrow">Acceso al sistema</p>
        <h1 className="auth-signin__title">Iniciar sesión</h1>
        <p className="auth-signin__subtitle">
          Ingresa tus credenciales para continuar al panel de Digitalflow.
        </p>
      </header>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div className="auth-field">
          <label htmlFor="login-value" className="auth-field__label">
            Correo o usuario <span className="text-[#c64545]">*</span>
          </label>
          <Input
            id="login-value"
            name="login"
            value={loginValue}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setLoginValue(e.target.value)}
            placeholder="correo@ejemplo.com"
            className={inputClass}
            error={hasError}
            disabled={loading}
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
              value={password}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              type={showPassword ? "text" : "password"}
              placeholder="Ingresa tu contraseña"
              className={cn(inputClass, "!pr-12")}
              error={hasError}
              disabled={loading}
            />
            <button
              type="button"
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword(!showPassword)}
              disabled={loading}
              className="absolute right-2.5 top-1/2 z-30 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#78716c] transition-colors hover:bg-[#f5f0e8] hover:text-[#44403c] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff801f]/35 disabled:opacity-50 dark:text-[#8ea0b8] dark:hover:bg-[#1e293b] dark:hover:text-[#e5e7eb]"
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
          <div role="alert" className="auth-alert-error">
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
          <Checkbox
            checked={remember}
            onChange={setRemember}
            disabled={loading}
            label="Recordarme"
          />
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
    </div>
  );
}
