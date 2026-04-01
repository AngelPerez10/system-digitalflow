import PageMeta from "@/components/common/PageMeta";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import Alert from "@/components/ui/alert/Alert";
import { apiUrl, resolveMediaUrl } from "@/config/api";
import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type MePayload = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
};

const getToken = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token") || "";

const authHeaders = (): HeadersInit => {
  const t = getToken();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
};

function initials(first: string, last: string, username: string) {
  const a = (first || "").trim().charAt(0).toUpperCase();
  const b = (last || "").trim().charAt(0).toUpperCase();
  if (a && b) return a + b;
  if (a) return a;
  const u = (username || "U").trim();
  return u.slice(0, 2).toUpperCase();
}

const cardShellClass =
  "overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-white/[0.06] dark:bg-gray-900/40 dark:shadow-none";

const sectionLabelClass =
  "text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500 sm:text-[11px]";

export default function ProfilePage() {
  const [me, setMe] = useState<MePayload | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{
    show: boolean;
    variant: "success" | "error" | "info";
    title: string;
    message: string;
  }>({ show: false, variant: "info", title: "", message: "" });

  const loadMe = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/me/"), {
        method: "GET",
        headers: authHeaders(),
        cache: "no-store" as RequestCache,
      });
      const data = (await res.json().catch(() => null)) as MePayload | null;
      if (!res.ok || !data) {
        setAlert({
          show: true,
          variant: "error",
          title: "No se pudo cargar el perfil",
          message: "Vuelva a iniciar sesión o intente más tarde.",
        });
        return;
      }
      setMe(data);
      setFirstName(data.first_name || "");
      setLastName(data.last_name || "");
      setEmail(data.email || "");
      setPreviewDataUrl(null);
      setRemovePhoto(false);
      try {
        localStorage.setItem("user", JSON.stringify(data));
        sessionStorage.setItem("user", JSON.stringify(data));
      } catch {
        /* ignore */
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const hasSavedAvatar = Boolean(me?.avatar_url) && !removePhoto;
  const avatarImgSrc = useMemo(() => {
    if (previewDataUrl) return previewDataUrl;
    if (hasSavedAvatar && me?.avatar_url) return resolveMediaUrl(me.avatar_url);
    return "";
  }, [previewDataUrl, hasSavedAvatar, me?.avatar_url]);

  const showInitials = !avatarImgSrc;

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setAlert({
        show: true,
        variant: "error",
        title: "Archivo no válido",
        message: "Seleccione una imagen (JPG, PNG o WEBP).",
      });
      return;
    }
    if (f.size > 4.5 * 1024 * 1024) {
      setAlert({
        show: true,
        variant: "error",
        title: "Imagen demasiado grande",
        message: "Use una imagen de menos de 5 MB.",
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result;
      if (typeof r === "string") {
        setPreviewDataUrl(r);
        setRemovePhoto(false);
      }
    };
    reader.readAsDataURL(f);
    e.target.value = "";
  };

  const persistUser = (data: MePayload) => {
    setMe(data);
    try {
      localStorage.setItem("user", JSON.stringify(data));
      sessionStorage.setItem("user", JSON.stringify(data));
      window.dispatchEvent(new Event("user:updated"));
    } catch {
      /* ignore */
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setAlert((a) => ({ ...a, show: false }));
    try {
      const body: Record<string, string> = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
      };
      if (previewDataUrl) {
        body.avatar = previewDataUrl;
      } else if (removePhoto && me?.avatar_url) {
        body.avatar = "";
      }

      const res = await fetch(apiUrl("/api/me/"), {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => null)) as MePayload & { detail?: string };
      if (!res.ok) {
        setAlert({
          show: true,
          variant: "error",
          title: "No se guardaron los cambios",
          message: typeof data?.detail === "string" ? data.detail : "Revise los datos e intente de nuevo.",
        });
        return;
      }
      persistUser(data as MePayload);
      setPreviewDataUrl(null);
      setRemovePhoto(false);
      setAlert({
        show: true,
        variant: "success",
        title: "Perfil actualizado",
        message: "Los cambios se guardaron correctamente.",
      });
    } catch {
      setAlert({
        show: true,
        variant: "error",
        title: "Error de red",
        message: "Compruebe su conexión e intente de nuevo.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageMeta title="Mi perfil | Digitalflow" description="Editar datos personales y foto de perfil" />
      <div className="min-h-[calc(100vh-5rem)] bg-gray-50 dark:bg-gray-950">
        <div className="mx-auto w-full max-w-[min(100%,90rem)] space-y-5 px-4 pb-10 pt-5 text-sm sm:space-y-6 sm:px-6 sm:pb-12 sm:pt-6 sm:text-base lg:px-8 xl:px-10">
          <nav
            className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-gray-500 dark:text-gray-500 sm:text-[13px]"
            aria-label="Migas de pan"
          >
            <Link
              to="/"
              className="rounded-md px-1 py-0.5 transition-colors hover:bg-gray-200/60 hover:text-gray-800 dark:hover:bg-white/5 dark:hover:text-gray-200"
            >
              Inicio
            </Link>
            <span className="text-gray-300 dark:text-gray-600" aria-hidden>
              /
            </span>
            <span className="font-medium text-gray-700 dark:text-gray-300">Mi perfil</span>
          </nav>

          <header className={`${cardShellClass} p-4 sm:p-6 lg:px-8`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
              <div className="flex min-w-0 gap-3 sm:gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-brand-500/15 bg-brand-500/[0.07] text-brand-700 dark:border-brand-400/20 dark:bg-brand-400/10 dark:text-brand-300 sm:h-12 sm:w-12 sm:rounded-xl">
                  <svg className="h-[18px] w-[18px] sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className={sectionLabelClass}>Cuenta</p>
                  <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-gray-900 dark:text-white sm:text-xl md:text-2xl">
                    Mi perfil
                  </h1>
                  <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-gray-600 dark:text-gray-400 sm:mt-2 sm:text-sm">
                    Datos visibles en la aplicación y en el menú de usuario. Guarde para aplicar los cambios.
                  </p>
                </div>
              </div>
              {!loading && me && (
                <div className="shrink-0 rounded-xl border border-gray-100 bg-gray-50/90 px-4 py-3 text-right dark:border-white/[0.06] dark:bg-gray-950/50 sm:min-w-[200px]">
                  <p className="text-[11px] text-gray-500 dark:text-gray-500">Sesión</p>
                  <p className="mt-0.5 truncate text-sm font-medium text-gray-900 dark:text-white">
                    {[firstName, lastName].filter(Boolean).join(" ") || me.username}
                  </p>
                  <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">{me.email}</p>
                </div>
              )}
            </div>
          </header>

          {alert.show && (
            <div>
              <Alert variant={alert.variant} title={alert.title} message={alert.message} />
            </div>
          )}

          <form onSubmit={handleSubmit} className={`${cardShellClass}`}>
            <div className="border-b border-gray-100 px-4 py-4 dark:border-white/[0.06] sm:px-6 sm:py-5 lg:px-8">
              <p className={sectionLabelClass}>Ajustes</p>
              <h2 className="mt-1 text-base font-semibold tracking-tight text-gray-900 dark:text-white sm:text-lg">
                Foto y datos personales
              </h2>
              <p className="mt-1 max-w-3xl text-xs leading-relaxed text-gray-500 dark:text-gray-400 sm:text-sm">
                Foto de perfil y datos de contacto. Se reflejan en la barra superior y en el menú de usuario.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12">
              {/* Columna izquierda: foto — alineada al inicio, no centrada en el viewport */}
              <div className="border-b border-gray-100 px-4 py-6 dark:border-white/[0.06] sm:px-6 sm:py-8 lg:col-span-5 lg:border-b-0 lg:border-r lg:px-8 xl:col-span-4">
                <p className={sectionLabelClass}>Perfil</p>
                <h3 className="mt-1 text-sm font-semibold text-gray-900 dark:text-white sm:text-base">Foto de perfil</h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
                  Visible en toda la aplicación.
                </p>

                <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
                  <div className="relative shrink-0">
                    <div className="relative h-32 w-32 overflow-hidden rounded-full border-2 border-gray-200/90 bg-gray-50/80 shadow-sm ring-4 ring-gray-100/80 dark:border-white/[0.08] dark:bg-gray-950/40 dark:ring-white/[0.04] sm:h-36 sm:w-36">
                      {showInitials ? (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-500/[0.12] to-brand-600/[0.08] text-3xl font-semibold tracking-tight text-brand-800 dark:from-brand-400/15 dark:to-brand-500/10 dark:text-brand-200">
                          {initials(firstName, lastName, me?.username || "")}
                        </div>
                      ) : (
                        <img src={avatarImgSrc} alt="" className="h-full w-full object-cover" />
                      )}
                      {!loading && (
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                          disabled={saving}
                          className="absolute inset-0 flex items-center justify-center rounded-full bg-gray-900/0 opacity-0 transition-all hover:bg-gray-900/45 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/40 max-sm:opacity-100 max-sm:bg-gray-900/35"
                          aria-label="Elegir otra foto"
                        >
                          <span className="rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white">
                            Cambiar
                          </span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1 space-y-4 text-left">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={onFile}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" size="sm" onClick={() => fileRef.current?.click()} disabled={loading || saving}>
                        Subir imagen
                      </Button>
                      {(Boolean(me?.avatar_url) || previewDataUrl) && !removePhoto && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setPreviewDataUrl(null);
                            setRemovePhoto(true);
                          }}
                          disabled={loading || saving}
                        >
                          Quitar foto
                        </Button>
                      )}
                      {removePhoto && !previewDataUrl && (
                        <Button type="button" size="sm" variant="outline" onClick={() => setRemovePhoto(false)} disabled={loading || saving}>
                          Deshacer
                        </Button>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400 sm:text-sm">
                      Sin foto se muestran sus iniciales. Pulse <span className="font-medium text-gray-700 dark:text-gray-300">Guardar cambios</span>{" "}
                      al final para persistir.
                    </p>
                  </div>
                </div>
              </div>

              {/* Columna derecha: datos — ancho completo de la columna */}
              <div className="px-4 py-6 sm:px-6 sm:py-8 lg:col-span-7 lg:px-8 xl:col-span-8">
                <p className={sectionLabelClass}>Contacto</p>
                <h3 className="mt-1 text-sm font-semibold text-gray-900 dark:text-white sm:text-base">Datos personales</h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
                  El nombre de usuario solo lo modifica un administrador.
                </p>

                <div className="mt-6">
                  {loading ? (
                    <div className="flex items-center gap-3 py-4">
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">Cargando datos…</p>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="profile-first">Nombre</Label>
                          <Input
                            id="profile-first"
                            name="first_name"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="Nombre"
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="profile-last">Apellidos</Label>
                          <Input
                            id="profile-last"
                            name="last_name"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Apellidos"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="profile-email">Correo electrónico</Label>
                        <Input
                          id="profile-email"
                          name="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="correo@empresa.com"
                          required
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-gray-200/90 bg-gray-50/80 px-4 py-3 text-sm dark:border-white/[0.08] dark:bg-gray-950/50">
                        <span className="text-gray-500 dark:text-gray-400">Usuario</span>
                        <code className="rounded-md bg-white px-2 py-0.5 text-sm font-medium text-gray-900 shadow-sm dark:bg-gray-900 dark:text-gray-100">
                          {me?.username ?? "—"}
                        </code>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50/70 px-4 py-4 dark:border-white/[0.06] dark:bg-gray-950/40 sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:px-6 lg:px-8">
              <Button type="button" variant="outline" onClick={() => loadMe()} disabled={loading || saving}>
                Descartar cambios
              </Button>
              <Button type="submit" disabled={loading || saving}>
                {saving ? "Guardando…" : "Guardar cambios"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
