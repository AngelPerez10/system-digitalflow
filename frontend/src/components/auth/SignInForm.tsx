import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Checkbox from "@/components/form/input/Checkbox";
import Button from "@/components/ui/button/Button";
import {
  ensureCsrfCookie,
  fetchApi,
  resetRefreshState,
  storeCsrfTokenFromPayload,
} from "@/config/api";
import { parseLoginError, type LoginSuccessPayload } from "@/config/loginErrors";
import { useAuth } from "@/context/AuthContext";

async function login(loginValue: string, password: string) {
  await ensureCsrfCookie();
  const res = await fetchApi("/api/login/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      loginValue.includes('@')
        ? { email: loginValue, password }
        : { username: loginValue, password }
    ),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(parseLoginError(res, data));
  return data;
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
  const location = useLocation() as any;
  const { refresh: refreshAuth, applyLoginSession, user } = useAuth();

  useEffect(() => {
    if (user?.username) {
      const isAdmin = user.is_superuser || user.is_staff;
      const from = location?.state?.from?.pathname;
      navigate(isAdmin ? (from || '/') : '/ordenes-tecnico', { replace: true });
      return;
    }
    setAuthReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleSubmit = async (e: any) => {
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
      const from = location?.state?.from?.pathname;
      const to = isAdmin ? (from && from !== '/' ? from : '/') : '/ordenes-tecnico';
      navigate(to, { replace: true });
    } catch (err: any) {
      setMessage(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  if (!authReady && !user?.username) {
    return (
      <div className="flex flex-col flex-1" role="status" aria-live="polite">
        <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
          <div className="text-center text-gray-500 dark:text-gray-400">Verificando sesión...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">Iniciar sesión</h1>
          </div>
          <div>
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                <div>
                  <Label htmlFor="login-value">Correo o usuario <span className="text-error-500">*</span></Label>
                  <Input id="login-value" value={loginValue} onChange={(e: any) => setLoginValue(e.target.value)} placeholder="correo@ejemplo.com" />
                </div>
                <div>
                  <Label htmlFor="login-password">Contraseña <span className="text-error-500">*</span></Label>
                  <div className="relative">
                    <Input id="login-password" value={password} onChange={(e: any) => setPassword(e.target.value)} type={showPassword ? 'text' : 'password'} placeholder="Ingresa tu contraseña" />
                    <button
                      type="button"
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 z-30 -translate-y-1/2 rounded-sm"
                    >
                      {showPassword ? <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" /> : <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />}
                    </button>
                  </div>
                </div>
                {message && <p className="text-sm text-error-500" role="alert">{message}</p>}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Checkbox checked={remember} onChange={setRemember} />
                    <span className="block font-normal text-gray-700 text-theme-sm dark:text-gray-400">Recordarme</span>
                  </label>
                </div>
                <div>
                  <Button type="submit" disabled={loading} aria-busy={loading} className="w-full" size="sm">
                    {loading ? "Ingresando..." : "Ingresar"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
