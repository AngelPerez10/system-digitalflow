import PageMeta from "@/components/common/PageMeta";
import { resolveMediaUrl, fetchApi } from "@/config/api";
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

/* --------------------------------------------------------------------------
   Paleta portada de `mobile/src/theme/tokens.ts` — marino + dorado sobre
   lienzo blanco, con el azul eléctrico como único acento de acción. La
   *estructura*, en cambio, es de escritorio: un panel de consola contenido,
   sin la hoja superpuesta ni el dock fijo del móvil (idiomas que en una
   ventana ancha se leen como un error de maquetación).
   -------------------------------------------------------------------------- */

const sheetFontStyle = { fontFamily: "Geist, Outfit, system-ui, sans-serif" } as const;

/** Etiqueta uppercase de sección — 11 px / tracking 1.2 (SeccionCard del móvil). */
const sectionLabelClass =
  "text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6E6E77] dark:text-[#8EA0B8]";

/** Tarjeta hundida y bordeada: el patrón de sección compartido del móvil. */
const sunkenCardClass =
  "rounded-[20px] border border-[#E7E7EA] bg-[#FAFAFA] p-5 dark:border-[#273244] dark:bg-[#1B2539] sm:p-6";

const fieldLabelClass =
  "mb-2 block text-[13px] font-medium tracking-[-0.05px] text-[#52525B] dark:text-[#B7C1D1]";

/** Alto 44 en escritorio (48 táctil en móvil); radio 10 = radius.md. */
const inputClass =
  "h-12 w-full rounded-[10px] border border-[#E7E7EA] bg-white px-4 text-[15px] tracking-[-0.1px] text-[#09090B] outline-none transition-colors placeholder:text-[#A1A1AA] hover:border-[#D3D3D8] focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.18)] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC] dark:placeholder:text-[#8EA0B8] dark:hover:border-[#3A4661] dark:focus:border-[#4B7CFF] dark:focus:ring-[rgba(75,124,255,0.28)] lg:h-11";

const primaryBtnClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-[#1B5CFF] bg-[#1B5CFF] px-6 text-[15px] font-medium tracking-[-0.1px] text-white transition-[background-color,border-color,transform] duration-150 hover:border-[#1244D1] hover:bg-[#1244D1] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] disabled:cursor-not-allowed disabled:border-[#DCE7FF] disabled:bg-[#DCE7FF] disabled:text-[#2F4899] disabled:hover:border-[#DCE7FF] disabled:hover:bg-[#DCE7FF] dark:border-[#4B7CFF] dark:bg-[#4B7CFF] dark:hover:border-[#3B6AF0] dark:hover:bg-[#3B6AF0] dark:disabled:border-[#1A2748] dark:disabled:bg-[#1A2748] dark:disabled:text-[#9BB0F0] max-sm:h-12 max-sm:w-full";

const secondaryBtnClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-[#E7E7EA] bg-white px-5 text-[15px] font-medium tracking-[-0.1px] text-[#09090B] transition-[background-color,border-color,transform] duration-150 hover:border-[#D3D3D8] hover:bg-[#FAFAFA] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#273244] dark:bg-[#151E32] dark:text-[#F8FAFC] dark:hover:border-[#3A4661] dark:hover:bg-[#243048] max-sm:h-12 max-sm:w-full";

/* Iconos de línea, 1.6 px, heredando `currentColor` — el mismo trazo que usa
   `mobile/src/components/icons.tsx`. Sin librería: son cinco glifos. */
type IconProps = { className?: string };

const svgProps = {
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor" as const,
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const IconUser = ({ className }: IconProps) => (
  <svg {...svgProps} className={className}>
    <path d="M20 21v-1.6a4.4 4.4 0 0 0-4.4-4.4H8.4A4.4 4.4 0 0 0 4 19.4V21" />
    <circle cx="12" cy="7.5" r="3.8" />
  </svg>
);

const IconKey = ({ className }: IconProps) => (
  <svg {...svgProps} className={className}>
    <circle cx="8" cy="12" r="4" />
    <path d="M12 12h9M18 12v3M15.5 12v2" />
  </svg>
);

const IconCard = ({ className }: IconProps) => (
  <svg {...svgProps} className={className}>
    <rect x="3" y="5.5" width="18" height="13" rx="2.4" />
    <path d="M3 10h18M7 14.5h4" />
  </svg>
);

const IconCamera = ({ className }: IconProps) => (
  <svg {...svgProps} className={className}>
    <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h1.7a1 1 0 0 0 .84-.46l.75-1.16A1 1 0 0 1 9.63 5h4.74a1 1 0 0 1 .84.38l.75 1.16A1 1 0 0 0 16.8 7h1.7A1.5 1.5 0 0 1 20 8.5v8A1.5 1.5 0 0 1 18.5 18h-13A1.5 1.5 0 0 1 4 16.5v-8Z" />
    <circle cx="12" cy="12.2" r="3.1" />
  </svg>
);

const IconCheckList = ({ className }: IconProps) => (
  <svg {...svgProps} className={className}>
    <path d="m3.5 7 1.8 1.8L8.5 5.5M3.5 16.5l1.8 1.8 3.2-3.3M12 7.8h8.5M12 17.2h8.5" />
  </svg>
);

const IconUpload = ({ className }: IconProps) => (
  <svg {...svgProps} className={className}>
    <path d="M12 16V4.5M8.2 8.3 12 4.5l3.8 3.8M4.5 15.5v2.6A1.9 1.9 0 0 0 6.4 20h11.2a1.9 1.9 0 0 0 1.9-1.9v-2.6" />
  </svg>
);

const IconTrash = ({ className }: IconProps) => (
  <svg {...svgProps} className={className}>
    <path d="M4 6.5h16M9.5 6.5V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v1.5M6.5 6.5l.8 12a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9l.8-12" />
  </svg>
);

const IconUndo = ({ className }: IconProps) => (
  <svg {...svgProps} className={className}>
    <path d="M4 9h9.5a5.5 5.5 0 1 1 0 11H8M4 9l4-4M4 9l4 4" />
  </svg>
);

const IconCheck = ({ className }: IconProps) => (
  <svg {...svgProps} className={className}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

/** Cabecera de sección: pastilla con icono + etiqueta uppercase. */
function SectionHead({
  id,
  icon,
  tone,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  tone: "blue" | "gold" | "navy" | "green";
  children: React.ReactNode;
}) {
  const tones = {
    blue: "bg-[rgba(27,92,255,0.10)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF]",
    gold: "bg-[rgba(230,162,60,0.16)] text-[#9A6B15] dark:text-[#E6A23C]",
    navy: "bg-[rgba(23,35,91,0.10)] text-[#17235B] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF]",
    green: "bg-[rgba(4,114,77,0.10)] text-[#04724D] dark:bg-[rgba(74,222,128,0.14)] dark:text-[#4ADE80]",
  } as const;

  return (
    <div className="flex items-center gap-2.5">
      <span className={`inline-flex size-7 shrink-0 items-center justify-center rounded-[9px] ${tones[tone]}`}>
        {icon}
      </span>
      <h2 id={id} className={sectionLabelClass}>
        {children}
      </h2>
    </div>
  );
}

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

  const fotoActual = Boolean(me?.avatar_url) && !removePhoto;

  return (
    <>
      <PageMeta title="Mi perfil | Digitalflow" description="Editar datos personales y foto de perfil" />
      <div className="w-full min-w-0 overflow-x-hidden">
        <div className="mx-auto w-full max-w-6xl" style={sheetFontStyle}>
          <nav
            className="mb-4 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] font-medium text-[#6E6E77] dark:text-[#8EA0B8]"
            aria-label="Migas de pan"
          >
            <Link
              to="/"
              className="rounded-md px-1.5 py-0.5 transition-colors hover:bg-black/[0.04] hover:text-[#09090B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF] dark:hover:bg-white/10 dark:hover:text-[#F8FAFC]"
            >
              Inicio
            </Link>
            <span className="text-[#D3D3D8] dark:text-[#3D3D4A]" aria-hidden>
              /
            </span>
            <span className="px-1.5 text-[#09090B] dark:text-[#F8FAFC]">Mi perfil</span>
          </nav>

          <form
            onSubmit={handleSubmit}
            className="overflow-hidden rounded-[24px] border border-[#E7E7EA] bg-white shadow-[0_6px_20px_-10px_rgba(9,9,11,0.14)] dark:border-[#273244] dark:bg-[#111827] dark:shadow-[0_10px_28px_-12px_rgba(0,0,0,0.6)]"
          >
            {/* Banda marina de cabecera — el marino del móvil, en formato ancho. */}
            <header
              className="relative overflow-hidden bg-[#17235B] px-5 py-6 dark:bg-[#1B2A63] sm:px-8 sm:py-8"
              aria-labelledby="profile-page-title"
            >
              <div
                className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-[#E6A23C]/15 blur-3xl"
                aria-hidden
              />

              <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
                {loading ? (
                  <div className="flex items-center gap-5" role="status" aria-label="Cargando perfil">
                    <div className="size-20 shrink-0 animate-pulse rounded-[22px] bg-white/10 sm:size-24" />
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="h-7 w-56 max-w-full animate-pulse rounded-lg bg-white/10" />
                      <div className="h-4 w-72 max-w-full animate-pulse rounded bg-white/[0.07]" />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex min-w-0 flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:text-left">
                      <div className="relative shrink-0">
                        <div className="size-20 overflow-hidden rounded-[22px] border border-white/15 bg-white/[0.06] sm:size-24">
                          {showInitials ? (
                            <div
                              className="flex h-full w-full items-center justify-center bg-[linear-gradient(140deg,rgba(230,162,60,0.30),rgba(255,255,255,0.04))]"
                              aria-label={`Avatar con iniciales ${avatarInitials}`}
                            >
                              <span className="text-[28px] font-semibold tracking-[-1px] text-[#E6A23C]">
                                {avatarInitials}
                              </span>
                            </div>
                          ) : (
                            <img src={avatarImgSrc} alt="Foto de perfil" className="h-full w-full object-cover" />
                          )}
                        </div>
                        {/* Botón visible, no un overlay que dependa del hover. */}
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                          disabled={saving}
                          className="absolute -bottom-1.5 -right-1.5 inline-flex size-9 items-center justify-center rounded-full border-2 border-[#17235B] bg-[#E6A23C] text-[#17235B] transition-colors hover:bg-[#F0B45C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#1B2A63]"
                          aria-label="Cambiar foto de perfil"
                          title="Cambiar foto de perfil"
                        >
                          <IconCamera className="size-[18px]" />
                        </button>
                      </div>

                      <div className="min-w-0">
                        <h1
                          id="profile-page-title"
                          className="text-balance text-[26px] font-bold leading-[1.15] tracking-[-0.9px] text-white sm:text-[32px] sm:tracking-[-1.1px]"
                        >
                          {profileName}
                        </h1>
                        <p className="mt-1.5 max-w-[54ch] text-[15px] leading-[22px] tracking-[-0.1px] text-white/70">
                          Tus datos visibles en el sistema, foto y correo de contacto.
                        </p>
                        <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                          <span className="inline-flex h-8 items-center rounded-full bg-white/10 px-3 font-mono text-[12px] font-medium text-white/85">
                            @{me?.username}
                          </span>
                          <span className="inline-flex h-8 items-center rounded-full bg-[rgba(230,162,60,0.16)] px-3 text-[13px] font-semibold text-[#E6A23C]">
                            {roleLabel}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Solo el estado vive en la banda; el detalle de la cuenta
                        se lee en la columna lateral, junto a lo editable. */}
                    <span
                      className={
                        hasPendingChanges
                          ? "inline-flex h-8 shrink-0 items-center gap-2 self-center rounded-full bg-[#E6A23C] px-3.5 text-[13px] font-semibold text-[#17235B] sm:self-start lg:self-center"
                          : "inline-flex h-8 shrink-0 items-center gap-2 self-center rounded-full bg-white/10 px-3.5 text-[13px] font-medium text-white/85 sm:self-start lg:self-center"
                      }
                    >
                      <span
                        className={`size-[7px] shrink-0 rounded-full ${
                          hasPendingChanges ? "bg-[#17235B]" : "bg-[#4ADE80]"
                        }`}
                        aria-hidden
                      />
                      {hasPendingChanges ? "Cambios sin guardar" : "Sincronizado"}
                    </span>
                  </>
                )}
              </div>
            </header>

            <div className="p-5 sm:p-6 lg:p-8">
              <div aria-live="polite" aria-atomic="true" className={alert.show ? "mb-6 block" : "hidden"}>
                {alert.show ? (
                  <div
                    role="alert"
                    className={
                      alert.variant === "success"
                        ? "flex items-start gap-3 rounded-[14px] border border-[#BFE6D4] bg-[#E9F8F0] px-4 py-3 dark:border-[#1E5A42] dark:bg-[#0F2A1C]"
                        : "flex items-start gap-3 rounded-[14px] border border-[#F6CFCF] bg-[#FEF2F2] px-4 py-3 dark:border-[#7F1D1D] dark:bg-[#3F1518]"
                    }
                  >
                    <span
                      className={`mt-1.5 size-[7px] shrink-0 rounded-full ${
                        alert.variant === "success" ? "bg-[#04724D] dark:bg-[#4ADE80]" : "bg-[#C22B2B] dark:bg-[#F87171]"
                      }`}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <p
                        className={
                          alert.variant === "success"
                            ? "text-[15px] font-medium text-[#04724D] dark:text-[#4ADE80]"
                            : "text-[15px] font-medium text-[#C22B2B] dark:text-[#F87171]"
                        }
                      >
                        {alert.title}
                      </p>
                      <p
                        className={
                          alert.variant === "success"
                            ? "mt-0.5 text-[13px] text-[#04724D]/85 dark:text-[#4ADE80]/80"
                            : "mt-0.5 text-[13px] text-[#C22B2B]/85 dark:text-[#F87171]/80"
                        }
                      >
                        {alert.message}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6">
                <div className="space-y-5">
                  <section className={sunkenCardClass} aria-labelledby="profile-data-heading">
                    <SectionHead id="profile-data-heading" tone="blue" icon={<IconUser className="size-4" />}>
                      Datos personales
                    </SectionHead>

                    {loading ? (
                      <div
                        className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2"
                        role="status"
                        aria-label="Cargando datos del perfil"
                      >
                        <div className="h-[74px] animate-pulse rounded-[10px] bg-[#E7E7EA] dark:bg-[#273244]" />
                        <div className="h-[74px] animate-pulse rounded-[10px] bg-[#E7E7EA] dark:bg-[#273244]" />
                        <div className="h-[74px] animate-pulse rounded-[10px] bg-[#E7E7EA] dark:bg-[#273244] sm:col-span-2" />
                      </div>
                    ) : (
                      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="min-w-0">
                          <label htmlFor="profile-first" className={fieldLabelClass}>
                            Nombre
                          </label>
                          <input
                            id="profile-first"
                            name="first_name"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="Nombre"
                            className={inputClass}
                            autoComplete="given-name"
                            required
                            disabled={saving}
                          />
                        </div>
                        <div className="min-w-0">
                          <label htmlFor="profile-last" className={fieldLabelClass}>
                            Apellidos
                          </label>
                          <input
                            id="profile-last"
                            name="last_name"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Apellidos"
                            className={inputClass}
                            autoComplete="family-name"
                            disabled={saving}
                          />
                        </div>
                        <div className="min-w-0 sm:col-span-2">
                          <label htmlFor="profile-email" className={fieldLabelClass}>
                            Correo electrónico
                          </label>
                          <input
                            id="profile-email"
                            name="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="correo@empresa.com"
                            className={inputClass}
                            autoComplete="email"
                            aria-describedby="profile-email-hint"
                            required
                            disabled={saving}
                          />
                          <p
                            id="profile-email-hint"
                            className="mt-2 text-[13px] leading-[18px] text-[#6E6E77] dark:text-[#8EA0B8]"
                          >
                            Se usa para notificaciones internas y para los documentos que firmas.
                          </p>
                        </div>
                      </div>
                    )}
                  </section>

                  <section className={sunkenCardClass} aria-labelledby="profile-access-heading">
                    <SectionHead id="profile-access-heading" tone="gold" icon={<IconKey className="size-4" />}>
                      Acceso
                    </SectionHead>
                    <dl className="mt-5 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                      <div>
                        <dt className="text-[13px] text-[#6E6E77] dark:text-[#8EA0B8]">Usuario</dt>
                        <dd className="mt-1 font-mono text-[13px] font-medium text-[#09090B] dark:text-[#F8FAFC]">
                          {me?.username ?? "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[13px] text-[#6E6E77] dark:text-[#8EA0B8]">Tipo de acceso</dt>
                        <dd className="mt-1 text-[15px] font-medium tracking-[-0.1px] text-[#09090B] dark:text-[#F8FAFC]">
                          {roleLabel}
                        </dd>
                      </div>
                    </dl>
                    <p className="mt-5 border-t border-[#E7E7EA] pt-4 text-[13px] leading-[18px] text-[#6E6E77] dark:border-[#273244] dark:text-[#8EA0B8]">
                      Solo un administrador puede modificar el usuario de acceso.
                    </p>
                  </section>
                </div>

                <aside className="space-y-5">
                  {/* El resumen que antes vivía dentro de la banda marina. */}
                  <section className={sunkenCardClass} aria-labelledby="profile-summary-heading">
                    <SectionHead
                      id="profile-summary-heading"
                      tone={hasPendingChanges ? "gold" : "green"}
                      icon={<IconCard className="size-4" />}
                    >
                      Resumen de cuenta
                    </SectionHead>
                    <dl className="mt-5 divide-y divide-[#E7E7EA] dark:divide-[#273244]">
                      <div className="flex flex-col gap-0.5 pb-3 min-[420px]:flex-row min-[420px]:items-baseline min-[420px]:justify-between min-[420px]:gap-3">
                        <dt className="shrink-0 text-[13px] text-[#6E6E77] dark:text-[#8EA0B8]">Correo guardado</dt>
                        <dd
                          className="min-w-0 truncate text-[13px] font-medium text-[#09090B] dark:text-[#F8FAFC] min-[420px]:text-right"
                          title={me?.email || ""}
                        >
                          {me?.email || "—"}
                        </dd>
                      </div>
                      <div className="flex flex-col gap-0.5 py-3 min-[420px]:flex-row min-[420px]:items-baseline min-[420px]:justify-between min-[420px]:gap-3">
                        <dt className="shrink-0 text-[13px] text-[#6E6E77] dark:text-[#8EA0B8]">Rol</dt>
                        <dd className="text-[13px] font-medium text-[#09090B] dark:text-[#F8FAFC] min-[420px]:text-right">
                          {roleLabel}
                        </dd>
                      </div>
                      <div className="flex flex-col gap-0.5 pt-3 min-[420px]:flex-row min-[420px]:items-baseline min-[420px]:justify-between min-[420px]:gap-3">
                        <dt className="shrink-0 text-[13px] text-[#6E6E77] dark:text-[#8EA0B8]">Estado</dt>
                        <dd
                          className={`text-[13px] font-semibold min-[420px]:text-right ${
                            hasPendingChanges
                              ? "text-[#9A6B15] dark:text-[#E6A23C]"
                              : "text-[#04724D] dark:text-[#4ADE80]"
                          }`}
                        >
                          {loading ? "Cargando…" : hasPendingChanges ? "Cambios sin guardar" : "Sincronizado"}
                        </dd>
                      </div>
                    </dl>
                  </section>

                  <section className={sunkenCardClass} aria-labelledby="profile-photo-heading">
                    <SectionHead id="profile-photo-heading" tone="navy" icon={<IconCamera className="size-4" />}>
                      Foto de perfil
                    </SectionHead>

                    <div className="mt-5 flex items-center gap-4">
                      <div className="size-14 shrink-0 overflow-hidden rounded-[14px] border border-[#E7E7EA] bg-white dark:border-[#273244] dark:bg-[#111827]">
                        {showInitials ? (
                          <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(140deg,rgba(230,162,60,0.22),rgba(23,35,91,0.06))] text-[16px] font-semibold text-[#9A6B15] dark:text-[#E6A23C]">
                            {avatarInitials}
                          </div>
                        ) : (
                          <img src={avatarImgSrc} alt="" className="h-full w-full object-cover" aria-hidden />
                        )}
                      </div>
                      <p className="min-w-0 text-[13px] leading-[18px] text-[#6E6E77] dark:text-[#8EA0B8]">
                        {previewDataUrl
                          ? "Imagen nueva lista para guardar."
                          : removePhoto
                            ? "Se quitará al guardar."
                            : fotoActual
                              ? "Foto actual en uso."
                              : "Sin foto: se muestran tus iniciales."}
                      </p>
                    </div>

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
                        className={`${secondaryBtnClass} !w-full`}
                      >
                        <IconUpload className="size-[18px]" />
                        {previewDataUrl || fotoActual ? "Cambiar imagen" : "Subir imagen"}
                      </button>
                      {(fotoActual || previewDataUrl) && !removePhoto ? (
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewDataUrl(null);
                            setRemovePhoto(true);
                          }}
                          disabled={loading || saving}
                          className={`${secondaryBtnClass} !w-full`}
                        >
                          <IconTrash className="size-[18px]" />
                          Quitar foto
                        </button>
                      ) : null}
                      {removePhoto && !previewDataUrl ? (
                        <button
                          type="button"
                          onClick={() => setRemovePhoto(false)}
                          disabled={loading || saving}
                          className={`${secondaryBtnClass} !w-full`}
                        >
                          <IconUndo className="size-[18px]" />
                          Deshacer quitar foto
                        </button>
                      ) : null}
                    </div>
                    <p className="mt-3 text-[13px] leading-[18px] text-[#6E6E77] dark:text-[#8EA0B8]">
                      JPG, PNG o WEBP · máximo 5 MB.
                    </p>
                  </section>

                </aside>

                {/* Franja a todo el ancho: equilibra las dos columnas en vez de
                    alargar la lateral y dejar un hueco a la izquierda. */}
                <section
                  className={`${sunkenCardClass} lg:col-span-2`}
                  aria-labelledby="profile-help-heading"
                >
                  <SectionHead id="profile-help-heading" tone="gold" icon={<IconCheckList className="size-4" />}>
                    Antes de guardar
                  </SectionHead>
                  <ul className="mt-4 grid gap-2.5 text-[15px] leading-[22px] tracking-[-0.1px] text-[#52525B] dark:text-[#B7C1D1] sm:grid-cols-3 sm:gap-x-6">
                    {[
                      "Verifica que el correo sea correcto.",
                      "La imagen se actualiza al guardar cambios.",
                      "El usuario de acceso no se edita aquí.",
                    ].map((linea) => (
                      <li key={linea} className="flex gap-2.5">
                        <span className="mt-[9px] size-[5px] shrink-0 rounded-full bg-[#E6A23C]" aria-hidden />
                        <span>{linea}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </div>

            {/* Pie de acciones dentro del panel: sin dock flotante ni sticky. */}
            <div className="flex flex-col gap-3 border-t border-[#E7E7EA] bg-[#FAFAFA] px-5 py-4 dark:border-[#273244] dark:bg-[#151E32] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
              <p className="text-[13px] leading-[18px] text-[#6E6E77] dark:text-[#8EA0B8]">
                {hasPendingChanges ? "Tienes cambios pendientes por guardar." : "Sin cambios pendientes."}
              </p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => void loadMe()}
                  disabled={loading || saving || !hasPendingChanges}
                  className={secondaryBtnClass}
                >
                  <IconUndo className="size-[18px]" />
                  Descartar
                </button>
                <button
                  type="submit"
                  disabled={loading || saving || !hasPendingChanges}
                  aria-busy={saving}
                  className={primaryBtnClass}
                >
                  {saving ? (
                    <>
                      <span
                        className="inline-block size-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                        aria-hidden
                      />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <IconCheck className="size-[18px]" />
                      Guardar cambios
                    </>
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
