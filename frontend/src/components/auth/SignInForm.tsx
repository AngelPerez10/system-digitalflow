import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Checkbox from "@/components/form/input/Checkbox";
import Button from "@/components/ui/button/Button";
import { apiUrl } from "@/config/api";

async function login(loginValue: string, password: string) {
  const res = await fetch(apiUrl("/api/login/"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      loginValue.includes('@')
        ? { email: loginValue, password }
        : { username: loginValue, password }
    ),
  });
  const data = await res.json().catch(() => ({ detail: "Respuesta inválida" }));
  if (!res.ok) throw new Error(data.detail || "Error");
  return data;
}

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState<boolean>(false);
  const [loginValue, setLoginValue] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token'));
  const [username, setUsername] = useState<string | null>(() => localStorage.getItem('username') || sessionStorage.getItem('username'));
  const navigate = useNavigate();
  const location = useLocation() as any;

  useEffect(() => {
    if (token) {
      const to = location?.state?.from?.pathname || '/';
      navigate(to, { replace: true });
    }
  }, [token, navigate, location]);

  useEffect(() => {
    if (!token) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('username');
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('refresh_token');
      sessionStorage.removeItem('username');
      return;
    }
    if (remember) {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('token', token);
      const refresh = sessionStorage.getItem('refresh_token');
      if (refresh) localStorage.setItem('refresh_token', refresh);
      if (username) localStorage.setItem('username', username);
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('refresh_token');
      sessionStorage.removeItem('username');
    } else {
      sessionStorage.setItem('auth_token', token);
      sessionStorage.setItem('token', token);
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) sessionStorage.setItem('refresh_token', refresh);
      if (username) sessionStorage.setItem('username', username);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('username');
    }
  }, [token, username, remember]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const data = await login(loginValue, password);
      // Persist token immediately so RequireAuth sees it when navigating
      try {
        // Use role from backend, fallback to computed role
        const backendRole = (data.role || '').toLowerCase();
        const computedRole = backendRole || ((data.is_superuser || data.is_staff) ? 'admin' : 'operator');

        // Always write to both storages to avoid mobile tab discard losing state
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('token', data.token);
        if (data.refresh) localStorage.setItem('refresh_token', data.refresh);
        if (data.username) localStorage.setItem('username', data.username);
        localStorage.setItem('is_superuser', String(!!data.is_superuser));
        localStorage.setItem('role', computedRole);

        sessionStorage.setItem('auth_token', data.token);
        sessionStorage.setItem('token', data.token);
        if (data.refresh) sessionStorage.setItem('refresh_token', data.refresh);
        if (data.username) sessionStorage.setItem('username', data.username);
        sessionStorage.setItem('is_superuser', String(!!data.is_superuser));
        sessionStorage.setItem('role', computedRole);
      } catch { }
      setToken(data.token);
      setUsername(data.username);
      // guardar objeto usuario con flags admin y nombre completo
      try {
        const userObj = {
          username: data.username,
          email: data.email,
          is_staff: data.is_staff,
          is_superuser: data.is_superuser,
          first_name: data.first_name || '',
          last_name: data.last_name || '',
        };
        localStorage.setItem('user', JSON.stringify(userObj));
        sessionStorage.setItem('user', JSON.stringify(userObj));
      } catch { }
      setMessage(null);

      // Redirigir según el rol del usuario
      const isAdmin = data.is_superuser || data.is_staff;
      const from = location?.state?.from?.pathname;

      let to = '/';
      if (isAdmin) {
        // Admins van a la ruta original si existe o al dashboard principal
        to = from && from !== '/' ? from : '/';
      } else {
        // Operadores van al dashboard de operador por defecto
        to = '/operador/dashboard';
      }

      navigate(to, { replace: true });
    } catch (err: any) {
      setMessage(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

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
                  <Label>Correo o usuario <span className="text-error-500">*</span></Label>
                  <Input value={loginValue} onChange={(e: any) => setLoginValue(e.target.value)} placeholder="correo@ejemplo.com" />
                </div>
                <div>
                  <Label>Contraseña <span className="text-error-500">*</span></Label>
                  <div className="relative">
                    <Input value={password} onChange={(e: any) => setPassword(e.target.value)} type={showPassword ? 'text' : 'password'} placeholder="Ingresa tu contraseña" />
                    <span onClick={() => setShowPassword(!showPassword)} className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2">
                      {showPassword ? <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" /> : <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />}
                    </span>
                  </div>
                </div>
                {message && <p className="text-sm text-error-500">{message}</p>}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Checkbox checked={remember} onChange={setRemember} />
                    <span className="block font-normal text-gray-700 text-theme-sm dark:text-gray-400">Recordarme</span>
                  </label>
                </div>
                <div>
                  <Button disabled={loading} className="w-full" size="sm">{loading ? 'Ingresando...' : 'Ingresar'}</Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
