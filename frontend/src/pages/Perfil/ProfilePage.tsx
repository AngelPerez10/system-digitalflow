import PageMeta from "@/components/common/PageMeta";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { resolveMediaUrl, fetchApi } from "@/config/api";
import {
  erpHeroHeadingClass,
  erpInputFieldInsetClass,
  erpPrimaryBtnClass,
  erpSansStyle,
  erpSecondaryBtnClass,
  erpSectionLabelClass,
  erpSubheadingClass,
} from "@/layout/erpPageStyles";
import { useAuth } from "@/context/AuthContext";
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

type AlertState = {
  show: boolean;
  variant: "success" | "error";
  title: string;
  message: string;
};

function initials(first: string, last: string, username: string) {
  const a = (first || "").trim().charAt(0).toUpperCase();
  const b = (last || "").trim().charAt(0).toUpperCase();
  if (a && b) return a + b;
  if (a) return a;
  const u = (username || "U").trim();
  return u.slice(0, 2).toUpperCase();
}

function displayName(first: string, last: string, username: string) {
  const full = [first, last].filter(Boolean).join(" ").trim();
  return full || username || "Usuario";
}

const fieldLabelClass =
  "mb-1.5 block text-xs font-medium text-[#57534e] dark:text-[#cbd5e1] sm:text-sm";

const profilePanelClass =
  "rounded-3xl border border-[#e7ded0] bg-[#fffdfa]/95 shadow-[0_24px_70px_-44px_rgba(28,25,23,0.34)] dark:border-[#273244] dark:bg-[#111827]/82 dark:shadow-[0_28px_80px_-52px_rgba(0,0,0,0.75)]";

const profileSoftPanelClass =
  "rounded-2xl border border-[#e7ded0] bg-[#fcfaf6] dark:border-[#273244] dark:bg-[#111a2b]/88";

const profileMetaPillClass =
  "inline-flex min-h-[32px] items-center rounded-full border border-[#e7ded0] bg-[#fffdfa] px-3 py-1 text-xs font-medium text-[#57534e] dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#cbd5e1]";

const profileInfoItemClass =
  "rounded-2xl border border-[#e7ded0] bg-[#fffdfa]/80 px-4 py-3 dark:border-[#334155] dark:bg-[#0f172a]/70";

const profileAvatarRingClass =
  "relative size-24 overflow-hidden rounded-[2rem] border border-[#e7ded0] bg-[#fcfaf6] shadow-[0_18px_44px_-28px_rgba(28,25,23,0.5)] ring-4 ring-[#fffdfa] dark:border-[#334155] dark:bg-[#0f172a] dark:ring-[#111827] sm:size-28";

export default function ProfilePage() {
  const { user: authUser, isAdmin } = useAuth();
  const [me, setMe] = useState<MePayload | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<AlertState>({
    show: false,
    variant: "success",
    title: "",
    message: "",
  });

  const loadMe = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchApi("/api/me/", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
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
    void loadMe();
  }, [loadMe]);

  const hasSavedAvatar = Boolean(me?.avatar_url) && !removePhoto;
  const avatarImgSrc = useMemo(() => {
    if (previewDataUrl) return previewDataUrl;
    if (hasSavedAvatar && me?.avatar_url) return resolveMediaUrl(me.avatar_url);
    return "";
  }, [previewDataUrl, hasSavedAvatar, me?.avatar_url]);

  const showInitials = !avatarImgSrc;
  const avatarInitials = initials(firstName, lastName, me?.username || authUser?.username || "");
  const profileName = displayName(firstName, lastName, me?.username || authUser?.username || "");
  const hasPendingChanges =
    Boolean(me) &&
    (firstName.trim() !== (me?.first_name || "") ||
      lastName.trim() !== (me?.last_name || "") ||
      email.trim().toLowerCase() !== (me?.email || "").toLowerCase() ||
      Boolean(previewDataUrl) ||
      removePhoto);
  const roleLabel = isAdmin ? "Administrador" : "Técnico";

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

      const res = await fetchApi("/api/me/", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
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
      <div className="w-full min-w-0 overflow-x-hidden">
        <div
          className="mx-auto w-full max-w-7xl space-y-5 px-0 pb-8 pt-0 text-sm sm:px-2 sm:pb-10 sm:text-base lg:px-4"
          style={erpSansStyle}
        >
          <nav
            className="flex flex-wrap items-center gap-x-1.5 gap-y-1 px-1 text-xs font-medium text-[#78716c] dark:text-[#8ea0b8] sm:text-[13px]"
            aria-label="Migas de pan"
          >
            <Link
              to="/"
              className="rounded-md px-1.5 py-0.5 text-[#57534e] transition-colors hover:bg-black/[0.03] hover:text-[#1c1917] dark:text-[#aeb8c8] dark:hover:bg-white/5 dark:hover:text-white"
            >
              Inicio
            </Link>
            <span className="text-[#d6d3d1] dark:text-[#334155]" aria-hidden>
              /
            </span>
            <span className="text-[#44403c] dark:text-[#cbd5e1]">Mi perfil</span>
          </nav>

          <form onSubmit={handleSubmit} className="space-y-5">
            <section className={`${profilePanelClass} relative overflow-hidden`} aria-labelledby="profile-page-title">
              <div className="pointer-events-none absolute right-0 top-0 size-40 rounded-full bg-[#ff801f]/10 blur-3xl dark:bg-[#fb923c]/10" aria-hidden />
              <div className="relative grid gap-6 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:p-6">
                <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
                  {loading ? (
                    <div className="flex items-center gap-5" role="status" aria-label="Cargando perfil">
                      <div className="size-24 shrink-0 animate-pulse rounded-[2rem] bg-[#e7ded0]/80 dark:bg-[#334155] sm:size-28" />
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="h-4 w-28 animate-pulse rounded bg-[#e7ded0]/70 dark:bg-[#334155]/80" />
                        <div className="h-8 w-56 max-w-full animate-pulse rounded bg-[#e7ded0]/60 dark:bg-[#334155]/70" />
                        <div className="h-4 w-72 max-w-full animate-pulse rounded bg-[#e7ded0]/50 dark:bg-[#334155]/60" />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="relative mx-auto shrink-0 sm:mx-0">
                        <div className={profileAvatarRingClass} aria-hidden={showInitials ? undefined : true}>
                          {showInitials ? (
                            <div
                              className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(255,128,31,0.28),transparent_45%),linear-gradient(135deg,#fff7ed,#fcfaf6)] dark:bg-[radial-gradient(circle_at_30%_20%,rgba(251,146,60,0.26),transparent_45%),linear-gradient(135deg,#1e293b,#0f172a)]"
                              aria-label={`Avatar con iniciales ${avatarInitials}`}
                            >
                              <span className="[font-family:Georgia,'Times_New_Roman',serif] text-3xl font-medium text-[#c2410c] dark:text-[#fb923c]">
                                {avatarInitials}
                              </span>
                            </div>
                          ) : (
                            <img src={avatarImgSrc} alt="Foto de perfil" className="h-full w-full object-cover" />
                          )}
                          <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            disabled={saving}
                            className="absolute inset-0 flex items-center justify-center rounded-[2rem] bg-[#1c1917]/0 opacity-0 transition-all hover:bg-[#1c1917]/45 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#ff801f]/60 max-sm:opacity-100 max-sm:bg-[#1c1917]/30"
                            aria-label="Cambiar foto de perfil"
                          >
                            <span className="rounded-full bg-[#fffdfa] px-3 py-1 text-xs font-semibold text-[#1c1917] shadow-sm dark:bg-[#111827] dark:text-[#f8fafc]">
                              Cambiar
                            </span>
                          </button>
                        </div>
                      </div>

                      <div className="min-w-0 text-center sm:text-left">
                        <p className={erpSectionLabelClass}>Cuenta Digitalflow</p>
                        <h1 id="profile-page-title" className={`mt-1 text-balance ${erpHeroHeadingClass}`}>
                          {profileName}
                        </h1>
                        <p className="mt-2 break-words text-sm leading-relaxed text-[#57534e] dark:text-[#b7c1d1] sm:text-base">
                          Administra tus datos visibles en el sistema, foto de perfil y correo de contacto.
                        </p>
                        <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                          <span className={profileMetaPillClass}>@{me?.username}</span>
                          <span className="inline-flex min-h-[32px] items-center rounded-full border border-[#ff801f]/25 bg-[#ff801f]/10 px-3 py-1 text-xs font-semibold text-[#c2410c] dark:border-[#fb923c]/30 dark:bg-[#ff801f]/15 dark:text-[#fb923c]">
                            {roleLabel}
                          </span>
                          <span
                            className={
                              hasPendingChanges
                                ? "inline-flex min-h-[32px] items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
                                : profileMetaPillClass
                            }
                          >
                            {hasPendingChanges ? "Cambios sin guardar" : "Perfil sincronizado"}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <aside className={`${profileSoftPanelClass} p-4`} aria-label="Resumen de cuenta">
                  <p className={erpSectionLabelClass}>Resumen</p>
                  <div className="mt-4 space-y-3">
                    <div className={profileInfoItemClass}>
                      <p className="text-xs font-medium text-[#78716c] dark:text-[#8ea0b8]">Correo</p>
                      <p className="mt-1 break-words text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc]">{email || me?.email || "—"}</p>
                    </div>
                    <div className={profileInfoItemClass}>
                      <p className="text-xs font-medium text-[#78716c] dark:text-[#8ea0b8]">Tipo de acceso</p>
                      <p className="mt-1 text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc]">{roleLabel}</p>
                    </div>
                    <div className={profileInfoItemClass}>
                      <p className="text-xs font-medium text-[#78716c] dark:text-[#8ea0b8]">Estado</p>
                      <p className="mt-1 text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc]">
                        {loading ? "Cargando..." : hasPendingChanges ? "Pendiente de guardar" : "Actualizado"}
                      </p>
                    </div>
                  </div>
                </aside>
              </div>
            </section>

            <div
              aria-live="polite"
              aria-atomic="true"
              className={alert.show ? "block" : "hidden"}
            >
              {alert.show ? (
                <div
                  role="alert"
                  className={
                    alert.variant === "success"
                      ? "rounded-2xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 dark:border-emerald-900/40 dark:bg-emerald-950/30"
                      : "rounded-2xl border border-red-200/80 bg-red-50/90 px-4 py-3 dark:border-red-900/40 dark:bg-red-950/30"
                  }
                >
                  <p
                    className={
                      alert.variant === "success"
                        ? "text-sm font-semibold text-emerald-800 dark:text-emerald-300"
                        : "text-sm font-semibold text-red-800 dark:text-red-300"
                    }
                  >
                    {alert.title}
                  </p>
                  <p
                    className={
                      alert.variant === "success"
                        ? "mt-0.5 text-sm text-emerald-700/90 dark:text-emerald-300/80"
                        : "mt-0.5 text-sm text-red-700/90 dark:text-red-300/80"
                    }
                  >
                    {alert.message}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <section className={profilePanelClass} aria-labelledby="profile-data-heading">
                <div className="border-b border-[#e7ded0] px-4 py-4 dark:border-[#334155] sm:px-5 lg:px-6">
                  <p className={erpSectionLabelClass}>Información personal</p>
                  <h2 id="profile-data-heading" className={`mt-1 ${erpSubheadingClass}`}>
                    Datos editables
                  </h2>
                  <p className="mt-1 text-sm text-[#57534e] dark:text-[#8ea0b8]">
                    Mantén tu nombre y correo listos para documentos, asignaciones y notificaciones internas.
                  </p>
                </div>

                <div className="p-4 sm:p-5 lg:p-6">
                  {loading ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" role="status" aria-label="Cargando datos del perfil">
                      <div className="h-20 animate-pulse rounded-2xl bg-[#e7ded0]/60 dark:bg-[#334155]/80" />
                      <div className="h-20 animate-pulse rounded-2xl bg-[#e7ded0]/60 dark:bg-[#334155]/80" />
                      <div className="h-20 animate-pulse rounded-2xl bg-[#e7ded0]/50 dark:bg-[#334155]/70 sm:col-span-2" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="min-w-0">
                        <Label htmlFor="profile-first" className={fieldLabelClass}>
                          Nombre
                        </Label>
                        <Input
                          id="profile-first"
                          name="first_name"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="Nombre"
                          className={erpInputFieldInsetClass}
                          required
                          disabled={saving}
                        />
                      </div>
                      <div className="min-w-0">
                        <Label htmlFor="profile-last" className={fieldLabelClass}>
                          Apellidos
                        </Label>
                        <Input
                          id="profile-last"
                          name="last_name"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Apellidos"
                          className={erpInputFieldInsetClass}
                          disabled={saving}
                        />
                      </div>
                      <div className="min-w-0 sm:col-span-2">
                        <Label htmlFor="profile-email" className={fieldLabelClass}>
                          Correo electrónico
                        </Label>
                        <Input
                          id="profile-email"
                          name="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="correo@empresa.com"
                          className={erpInputFieldInsetClass}
                          required
                          disabled={saving}
                        />
                      </div>
                      <div className="min-w-0 rounded-2xl border border-[#e7ded0] bg-[#fcfaf6]/80 px-4 py-3 dark:border-[#334155] dark:bg-[#0f172a]/55 sm:col-span-2">
                        <p className={erpSectionLabelClass}>Usuario de acceso</p>
                        <p className="mt-1 font-mono text-sm font-medium text-[#1c1917] dark:text-[#f8fafc]">
                          {me?.username ?? "—"}
                        </p>
                        <p className="mt-1 text-xs text-[#78716c] dark:text-[#8ea0b8]">
                          Solo un administrador puede modificar el usuario.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <aside className="space-y-5">
                <section className={`${profilePanelClass} p-4 sm:p-5`} aria-labelledby="profile-photo-heading">
                  <p className={erpSectionLabelClass}>Foto de perfil</p>
                  <h2 id="profile-photo-heading" className={`mt-1 ${erpSubheadingClass}`}>
                    Imagen visible
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-[#57534e] dark:text-[#8ea0b8]">
                    Usa una foto clara. Se refleja en el menú superior y vistas internas.
                  </p>

                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    onChange={onFile}
                    aria-label="Seleccionar imagen de perfil"
                  />
                  <div className="mt-4 grid gap-2">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={loading || saving}
                      className={`${erpSecondaryBtnClass} !w-full`}
                    >
                      Subir imagen
                    </button>
                    {(Boolean(me?.avatar_url) || previewDataUrl) && !removePhoto ? (
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewDataUrl(null);
                          setRemovePhoto(true);
                        }}
                        disabled={loading || saving}
                        className={`${erpSecondaryBtnClass} !w-full`}
                      >
                        Quitar foto
                      </button>
                    ) : null}
                    {removePhoto && !previewDataUrl ? (
                      <button
                        type="button"
                        onClick={() => setRemovePhoto(false)}
                        disabled={loading || saving}
                        className={`${erpSecondaryBtnClass} !w-full`}
                      >
                        Deshacer quitar foto
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-[#78716c] dark:text-[#8ea0b8]">
                    JPG, PNG o WEBP · máximo 5 MB.
                  </p>
                </section>

                <section className={`${profileSoftPanelClass} p-4`} aria-labelledby="profile-help-heading">
                  <h2 id="profile-help-heading" className="text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc]">
                    Antes de guardar
                  </h2>
                  <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[#57534e] dark:text-[#8ea0b8]">
                    <li>Verifica que el correo sea correcto.</li>
                    <li>La imagen se actualiza al guardar cambios.</li>
                    <li>El usuario de acceso no se edita aquí.</li>
                  </ul>
                </section>
              </aside>
            </div>

            <div className={`${profilePanelClass} flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 lg:px-6`}>
              <p className="text-sm text-[#57534e] dark:text-[#8ea0b8]">
                {hasPendingChanges ? "Tiene cambios pendientes por guardar." : "Sin cambios pendientes."}
              </p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => void loadMe()}
                  disabled={loading || saving || !hasPendingChanges}
                  className={`${erpSecondaryBtnClass} !w-full sm:!w-auto`}
                >
                  Descartar cambios
                </button>
                <button
                  type="submit"
                  disabled={loading || saving || !hasPendingChanges}
                  aria-busy={saving}
                  className={`${erpPrimaryBtnClass} !w-full sm:!w-auto`}
                >
                  {saving ? (
                    <>
                      <span
                        className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black"
                        aria-hidden
                      />
                      Guardando...
                    </>
                  ) : (
                    "Guardar cambios"
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
