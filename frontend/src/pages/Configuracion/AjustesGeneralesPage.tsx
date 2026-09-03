import { useEffect, useId, useRef, useState, type DragEvent, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  Check,
  FileText,
  ImagePlus,
  LoaderCircle,
  LogIn,
  PanelLeft,
  ReceiptText,
  RotateCcw,
  SquareCheckBig,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import PageMeta from "@/components/common/PageMeta";
import { fileToDataUrl, MARCA_FALLBACK_LOGO, patchMarca, uploadMarcaLogo } from "@/config/marcaApi";
import { inicialesDeNombre } from "@/config/marcaIniciales";
import { useMarca } from "@/context/MarcaContext";
import { useTheme } from "@/context/ThemeContext";

const NOMBRE_MAX = 120;

/* --------------------------------------------------------------------------
   Mismo sistema que `Perfil/ProfilePage` y `Configuracion/GestionUsuario`:
   marino + dorado sobre lienzo blanco, azul eléctrico como único acento de
   acción, líneas de 1 px. En oscuro, la familia slate del contenedor de la
   app (lienzo #0f172a → panel #111827 → tarjeta hundida #1B2539).
   -------------------------------------------------------------------------- */

const sheetFontStyle = { fontFamily: "Geist, Outfit, system-ui, sans-serif" } as const;

const sectionLabelClass =
  "text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6E6E77] dark:text-[#8EA0B8]";

const panelClass =
  "overflow-hidden rounded-[24px] border border-[#E7E7EA] bg-white shadow-[0_6px_20px_-10px_rgba(9,9,11,0.14)] dark:border-[#273244] dark:bg-[#111827] dark:shadow-[0_10px_28px_-12px_rgba(0,0,0,0.6)]";

const sunkenCardClass =
  "rounded-[20px] border border-[#E7E7EA] bg-[#FAFAFA] p-5 dark:border-[#273244] dark:bg-[#1B2539] sm:p-6";

const inputClass =
  "h-12 w-full rounded-[10px] border border-[#E7E7EA] bg-white px-4 text-[15px] tracking-[-0.1px] text-[#09090B] outline-none transition-colors placeholder:text-[#A1A1AA] hover:border-[#D3D3D8] focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.18)] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC] dark:placeholder:text-[#8EA0B8] dark:hover:border-[#3A4661] dark:focus:border-[#4B7CFF] dark:focus:ring-[rgba(75,124,255,0.28)] lg:h-11";

const primaryBtnClass =
  "inline-flex h-12 items-center justify-center gap-2 rounded-[10px] border border-[#1B5CFF] bg-[#1B5CFF] px-6 text-[15px] font-medium tracking-[-0.1px] text-white transition-[background-color,border-color,transform] duration-150 hover:border-[#1244D1] hover:bg-[#1244D1] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] disabled:cursor-not-allowed disabled:border-[#DCE7FF] disabled:bg-[#DCE7FF] disabled:text-[#2F4899] disabled:hover:border-[#DCE7FF] disabled:hover:bg-[#DCE7FF] dark:border-[#4B7CFF] dark:bg-[#4B7CFF] dark:hover:border-[#3B6AF0] dark:hover:bg-[#3B6AF0] dark:disabled:border-[#1A2748] dark:disabled:bg-[#1A2748] dark:disabled:text-[#9BB0F0] max-sm:w-full sm:h-11";

const secondaryBtnClass =
  "inline-flex h-12 items-center justify-center gap-2 rounded-[10px] border border-[#E7E7EA] bg-white px-5 text-[15px] font-medium tracking-[-0.1px] text-[#09090B] transition-[background-color,border-color,transform] duration-150 hover:border-[#D3D3D8] hover:bg-[#FAFAFA] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#273244] dark:bg-[#151E32] dark:text-[#F8FAFC] dark:hover:border-[#3A4661] dark:hover:bg-[#243048] max-sm:w-full sm:h-11";

const previewCaptionClass =
  "flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6E6E77] dark:text-[#8EA0B8]";

const previewFootnoteClass =
  "mt-3 text-[13px] leading-[18px] text-[#6E6E77] dark:text-[#8EA0B8]";

/** Cada vista previa es una columna: recuadro flexible + nota anclada abajo. */
const previewColumnClass = "flex min-w-0 flex-col";

export default function AjustesGeneralesPage() {
  const titleId = useId();
  const nombreId = useId();
  const nombreHintId = useId();
  const nombreErrorId = useId();
  const logoInputId = useId();
  const logoHintId = useId();
  const statusOkId = useId();
  const statusErrId = useId();
  const { nombre, logoUrl, apply } = useMarca();
  const { theme } = useTheme();
  const isDarkPreview = theme === "dark";
  const [nombreDraft, setNombreDraft] = useState(nombre);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [okMsg, setOkMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [nombreError, setNombreError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const nombreRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNombreDraft(nombre);
  }, [nombre]);

  const previewIniciales = inicialesDeNombre(nombreDraft || nombre);
  const previewNombre = nombreDraft.trim() || nombre;
  const dirty = nombreDraft.trim() !== nombre.trim();
  const busy = saving || uploading;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setOkMsg("");
    setErrorMsg("");
    if (!nombreDraft.trim()) {
      setNombreError("Escribe el nombre de la empresa.");
      nombreRef.current?.focus();
      return;
    }
    setNombreError("");
    setSaving(true);
    try {
      const next = await patchMarca({ nombre: nombreDraft });
      apply(next);
      setNombreDraft(next.nombre);
      setOkMsg("Nombre actualizado. Lo verán todos los usuarios.");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const onPickLogo = async (file: File | undefined) => {
    if (!file) return;
    setOkMsg("");
    setErrorMsg("");
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Elige una imagen PNG, JPG o WebP.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setErrorMsg("El logo no debe pesar más de 4 MB.");
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const next = await uploadMarcaLogo(dataUrl);
      apply(next);
      setOkMsg("Logo actualizado. Lo verán todos los usuarios.");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "No se pudo subir el logo");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onDropLogo = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragging(false);
    if (busy) return;
    void onPickLogo(e.dataTransfer.files?.[0]);
  };

  const onClearLogo = async () => {
    setOkMsg("");
    setErrorMsg("");
    setSaving(true);
    try {
      const next = await patchMarca({ clear_logo: true });
      apply(next);
      setOkMsg("Se quitó el logo. En el login y los PDFs se usa el de Intrax hasta que subas otro.");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "No se pudo quitar el logo");
    } finally {
      setSaving(false);
    }
  };

  const nombreDescribedBy = [nombreHintId, nombreError ? nombreErrorId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <PageMeta title={`Ajustes generales | ${nombre}`} description="Nombre y logo de la empresa" />
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
            <span aria-hidden className="text-[#D3D3D8] dark:text-[#3A4661]">
              /
            </span>
            <span className="px-1.5 text-[#09090B] dark:text-[#F8FAFC]">Ajustes generales</span>
          </nav>

          <form onSubmit={(e) => void onSubmit(e)} aria-labelledby={titleId} className={panelClass}>
            {/* Banda marina de cabecera. */}
            <header className="relative overflow-hidden bg-[#17235B] px-5 py-6 dark:bg-[#1B2A63] sm:px-8 sm:py-8">
              <div
                className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-[#E6A23C]/15 blur-3xl"
                aria-hidden
              />
              <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
                <div className="flex min-w-0 items-start gap-4">
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(230,162,60,0.16)] text-[#E6A23C]">
                    <Building2 className="size-5" strokeWidth={1.6} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">
                      Configuración
                    </p>
                    <h1
                      id={titleId}
                      className="mt-1 text-[26px] font-bold leading-[1.15] tracking-[-0.9px] text-white sm:text-[32px] sm:tracking-[-1.1px]"
                    >
                      Nombre y logo
                    </h1>
                    <p className="mt-1.5 max-w-[58ch] text-[15px] leading-[22px] tracking-[-0.1px] text-white/70">
                      Así se presenta la empresa en el menú, los PDFs y la pantalla para entrar.
                    </p>
                  </div>
                </div>

                <span
                  className={
                    dirty
                      ? "inline-flex h-8 shrink-0 items-center gap-2 self-start rounded-full bg-[#E6A23C] px-3.5 text-[13px] font-semibold text-[#17235B] lg:self-center"
                      : "inline-flex h-8 shrink-0 items-center gap-2 self-start rounded-full bg-white/10 px-3.5 text-[13px] font-medium text-white/85 lg:self-center"
                  }
                >
                  <span
                    className={`size-[7px] shrink-0 rounded-full ${dirty ? "bg-[#17235B]" : "bg-[#4ADE80]"}`}
                    aria-hidden
                  />
                  {dirty ? "Cambios sin guardar" : "Publicado"}
                </span>
              </div>
            </header>

            <div className="space-y-5 p-5 sm:p-6 lg:p-8">
              <div id={statusErrId} role="alert" aria-live="assertive" aria-atomic="true">
                {errorMsg ? (
                  <div className="flex items-start gap-3 rounded-[14px] border border-[#F6CFCF] bg-[#FEF2F2] px-4 py-3 dark:border-[#7F1D1D] dark:bg-[#3F1518]">
                    <span className="mt-1.5 size-[7px] shrink-0 rounded-full bg-[#C22B2B] dark:bg-[#F87171]" aria-hidden />
                    <div className="min-w-0">
                      <p className="text-[15px] font-medium text-[#C22B2B] dark:text-[#F87171]">No se pudo guardar</p>
                      <p className="mt-0.5 text-[13px] text-[#C22B2B]/85 dark:text-[#F87171]/80">{errorMsg}</p>
                    </div>
                  </div>
                ) : null}
              </div>
              <div id={statusOkId} role="status" aria-live="polite" aria-atomic="true">
                {okMsg ? (
                  <div className="flex items-start gap-3 rounded-[14px] border border-[#BFE6D4] bg-[#E9F8F0] px-4 py-3 dark:border-[#1E5A42] dark:bg-[#0F2A1C]">
                    <span className="mt-1.5 size-[7px] shrink-0 rounded-full bg-[#04724D] dark:bg-[#4ADE80]" aria-hidden />
                    <div className="min-w-0">
                      <p className="text-[15px] font-medium text-[#04724D] dark:text-[#4ADE80]">Listo</p>
                      <p className="mt-0.5 text-[13px] text-[#04724D]/85 dark:text-[#4ADE80]/80">{okMsg}</p>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Identidad: zona de logo + nombre, en una sola tarjeta hundida. */}
              <fieldset className={`${sunkenCardClass} min-w-0`}>
                <legend className="sr-only">Editar nombre y logo de la empresa</legend>

                <div className="flex items-center gap-2.5">
                  <span className="inline-flex size-7 items-center justify-center rounded-[9px] bg-[rgba(27,92,255,0.10)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF]">
                    <Building2 className="size-4" strokeWidth={1.6} aria-hidden />
                  </span>
                  <p className={sectionLabelClass}>Identidad</p>
                </div>

                <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-start">
                  <div className="shrink-0">
                    <label
                      htmlFor={logoInputId}
                      aria-describedby={logoHintId}
                      aria-busy={uploading || undefined}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (!busy) setDragging(true);
                      }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={onDropLogo}
                      className={`group relative flex size-28 items-center justify-center overflow-hidden rounded-[16px] border transition-colors has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[rgba(27,92,255,0.18)] ${
                        busy ? "pointer-events-none opacity-60" : "cursor-pointer"
                      } ${
                        dragging
                          ? "border-[#1B5CFF] bg-[rgba(27,92,255,0.06)] dark:border-[#4B7CFF] dark:bg-[rgba(75,124,255,0.10)]"
                          : logoUrl
                            ? "border-[#E7E7EA] bg-white hover:border-[#1B5CFF] dark:border-[#273244] dark:bg-[#111827] dark:hover:border-[#4B7CFF]"
                            : "border-dashed border-[#D3D3D8] bg-white hover:border-[#1B5CFF] dark:border-[#3A4661] dark:bg-[#111827] dark:hover:border-[#4B7CFF]"
                      }`}
                    >
                      <input
                        ref={fileRef}
                        id={logoInputId}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="sr-only"
                        disabled={busy}
                        onChange={(e) => void onPickLogo(e.target.files?.[0])}
                      />
                      {logoUrl ? (
                        <>
                          <img
                            src={logoUrl}
                            alt={`Logo actual de ${nombre}`}
                            className="h-full w-full object-contain p-3"
                          />
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-[#17235B]/0 text-white opacity-0 transition-all duration-150 group-hover:bg-[#17235B]/65 group-hover:opacity-100 group-focus-within:bg-[#17235B]/65 group-focus-within:opacity-100">
                            {uploading ? (
                              <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" strokeWidth={1.6} />
                            ) : (
                              <>
                                <ImagePlus className="size-4" strokeWidth={1.6} />
                                <span className="text-[12px] font-semibold">Cambiar</span>
                              </>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 px-2 text-center">
                          {uploading ? (
                            <LoaderCircle
                              className="size-5 animate-spin text-[#1B5CFF] motion-reduce:animate-none dark:text-[#4B7CFF]"
                              strokeWidth={1.6}
                            />
                          ) : (
                            <>
                              <span
                                className="text-[26px] font-semibold leading-none tracking-[-0.5px] text-[#9A6B15] dark:text-[#E6A23C]"
                                aria-hidden
                              >
                                {previewIniciales}
                              </span>
                              <span className="flex items-center gap-1 text-[12px] font-medium text-[#6E6E77] dark:text-[#8EA0B8]">
                                <Upload className="size-3" strokeWidth={2} />
                                Subir
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </label>
                    {logoUrl ? (
                      <button
                        type="button"
                        className="mt-2.5 inline-flex w-28 items-center justify-center gap-1.5 text-[13px] font-medium text-[#6E6E77] transition-colors hover:text-[#C22B2B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF] disabled:pointer-events-none disabled:opacity-50 dark:text-[#8EA0B8] dark:hover:text-[#F87171]"
                        onClick={() => void onClearLogo()}
                        disabled={busy}
                      >
                        <Trash2 className="size-3.5" strokeWidth={1.6} />
                        Quitar logo
                      </button>
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    <label
                      htmlFor={nombreId}
                      className="mb-2 block text-[13px] font-medium tracking-[-0.05px] text-[#52525B] dark:text-[#B7C1D1]"
                    >
                      Nombre de la empresa
                    </label>
                    <input
                      ref={nombreRef}
                      id={nombreId}
                      name="nombre"
                      value={nombreDraft}
                      onChange={(e) => {
                        setNombreDraft(e.target.value.slice(0, NOMBRE_MAX));
                        if (nombreError) setNombreError("");
                      }}
                      required
                      maxLength={NOMBRE_MAX}
                      disabled={busy}
                      autoComplete="organization"
                      aria-invalid={nombreError ? true : undefined}
                      aria-describedby={nombreDescribedBy}
                      className={`${inputClass} ${
                        nombreError
                          ? "!border-[#C22B2B] focus:!border-[#C22B2B] focus:ring-[rgba(194,43,43,0.20)] dark:!border-[#F87171]"
                          : ""
                      }`}
                    />

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-[rgba(23,35,91,0.06)] px-2.5 text-[12px] font-medium text-[#52525B] dark:bg-white/[0.06] dark:text-[#B7C1D1]">
                        Iniciales
                        <span className="font-semibold text-[#09090B] dark:text-[#F8FAFC]">{previewIniciales}</span>
                      </span>
                      <span className="inline-flex h-7 items-center rounded-full bg-[rgba(23,35,91,0.06)] px-2.5 text-[12px] font-medium text-[#52525B] dark:bg-white/[0.06] dark:text-[#B7C1D1]">
                        {nombreDraft.length}/{NOMBRE_MAX}
                      </span>
                    </div>

                    <p id={logoHintId} className="mt-3 text-[13px] leading-[18px] text-[#6E6E77] dark:text-[#8EA0B8]">
                      El logo acepta PNG, JPG o WebP de hasta 4&nbsp;MB. También puedes arrastrarlo sobre el
                      recuadro. Sin logo se usan las iniciales.
                    </p>
                    <p id={nombreHintId} className="sr-only">
                      Nombre de la empresa, hasta {NOMBRE_MAX} caracteres.
                    </p>
                    {nombreError ? (
                      <p
                        id={nombreErrorId}
                        className="mt-2 text-[13px] font-medium text-[#C22B2B] dark:text-[#F87171]"
                        role="alert"
                      >
                        {nombreError}
                      </p>
                    ) : null}
                  </div>
                </div>
              </fieldset>

              {/* Dónde aparece: las tres superficies reales, visibles a la vez. */}
              <section className={sunkenCardClass} aria-labelledby={`${titleId}-previews`}>
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex size-7 items-center justify-center rounded-[9px] bg-[rgba(230,162,60,0.16)] text-[#9A6B15] dark:text-[#E6A23C]">
                    <PanelLeft className="size-4" strokeWidth={1.6} aria-hidden />
                  </span>
                  <h2 id={`${titleId}-previews`} className={sectionLabelClass}>
                    Dónde aparece tu marca
                  </h2>
                </div>
                <p className="mt-3 text-[15px] leading-[22px] tracking-[-0.1px] text-[#52525B] dark:text-[#B7C1D1]">
                  Cada cambio de nombre o logo se refleja de inmediato en estos tres lugares.
                </p>

                <div className="mt-5 grid gap-5 sm:grid-cols-3">
                  {/* Menú lateral */}
                  <div className={previewColumnClass} aria-label="Vista previa del menú">
                    <p className={previewCaptionClass}>
                      <PanelLeft className="size-3.5 text-[#1B5CFF] dark:text-[#4B7CFF]" strokeWidth={1.75} />
                      Menú lateral
                    </p>
                    <p className="sr-only">
                      En el menú se verá {previewNombre}
                      {logoUrl ? " con el logo que subiste" : ` con las iniciales ${previewIniciales}`}.
                    </p>
                    <div
                      aria-hidden
                      className="mt-3 flex-1 overflow-hidden rounded-[14px] border border-[#E7E7EA] bg-white p-4 dark:border-[#273244] dark:bg-[#111827]"
                    >
                      <div className="flex items-center gap-2.5">
                        {logoUrl ? (
                          <img
                            src={logoUrl}
                            alt=""
                            className="size-8 rounded-md object-contain ring-1 ring-black/5 dark:ring-white/10"
                          />
                        ) : (
                          <span className="inline-flex size-8 items-center justify-center rounded-md bg-[#17235B] text-[10px] font-semibold tracking-[0.12em] text-white dark:bg-[#4B7CFF]">
                            {previewIniciales}
                          </span>
                        )}
                        <span className="min-w-0 truncate text-[14px] font-semibold tracking-[-0.2px] text-[#09090B] dark:text-[#F8FAFC]">
                          {previewNombre}
                        </span>
                      </div>
                      <div className="mt-4 h-px bg-[#E7E7EA] dark:bg-[#273244]" />
                      <ul className="mt-3 space-y-1 text-[12px] text-[#52525B] dark:text-[#8EA0B8]">
                        <li className="relative flex items-center gap-2 rounded-md py-1.5 pl-3 font-medium text-[#09090B] dark:text-[#F8FAFC]">
                          <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-[#1B5CFF] dark:bg-[#4B7CFF]" />
                          <ReceiptText className="size-3.5 text-[#1B5CFF] dark:text-[#4B7CFF]" strokeWidth={1.75} />
                          Cotizaciones
                        </li>
                        <li className="flex items-center gap-2 py-1.5 pl-3">
                          <SquareCheckBig className="size-3.5 text-[#A1A1AA] dark:text-[#8EA0B8]" strokeWidth={1.75} />
                          Órdenes
                        </li>
                        <li className="flex items-center gap-2 py-1.5 pl-3">
                          <Users className="size-3.5 text-[#A1A1AA] dark:text-[#8EA0B8]" strokeWidth={1.75} />
                          Clientes
                        </li>
                      </ul>
                    </div>
                    <p className={previewFootnoteClass}>Lo ve cualquier persona que entre al sistema.</p>
                  </div>

                  {/* Pantalla de acceso */}
                  <div className={previewColumnClass} aria-label="Vista previa de la pantalla para entrar">
                    <p className={previewCaptionClass}>
                      <LogIn className="size-3.5 text-[#1B5CFF] dark:text-[#4B7CFF]" strokeWidth={1.75} />
                      Pantalla de acceso
                    </p>
                    <p className="sr-only">
                      Tema actual: {isDarkPreview ? "oscuro" : "claro"}. En la pantalla para entrar se muestra{" "}
                      {logoUrl ? "el logo que subiste" : "el logo de Intrax"} y el nombre {previewNombre}.
                    </p>
                    <div
                      aria-hidden
                      className={`relative mt-3 flex-1 overflow-hidden rounded-[14px] border p-5 ${
                        isDarkPreview ? "border-[#273244] bg-[#0F172A]" : "border-[#E7E7EA] bg-white"
                      }`}
                    >
                      <div
                        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#17235B]/10 via-transparent to-transparent"
                        aria-hidden
                      />
                      <div className="relative flex flex-col items-center gap-3 py-2 text-center">
                        <img
                          src={logoUrl || MARCA_FALLBACK_LOGO}
                          alt=""
                          className={`h-9 w-auto max-w-[9rem] object-contain ${
                            !logoUrl && isDarkPreview ? "brightness-0 invert" : ""
                          }`}
                        />
                        <span
                          className={`truncate text-[14px] ${isDarkPreview ? "text-[#B7C1D1]" : "text-[#52525B]"}`}
                        >
                          © {previewNombre}
                        </span>
                        <span
                          className={`inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-semibold ${
                            isDarkPreview
                              ? "bg-[rgba(230,162,60,0.16)] text-[#E6A23C]"
                              : "bg-[rgba(23,35,91,0.08)] text-[#17235B]"
                          }`}
                        >
                          Tu tema: {isDarkPreview ? "oscuro" : "claro"}
                        </span>
                      </div>
                    </div>
                    <p className={previewFootnoteClass}>Lo primero que ve alguien antes de entrar.</p>
                  </div>

                  {/* Documentos PDF */}
                  <div className={previewColumnClass} aria-label="Vista previa de los PDFs">
                    <p className={previewCaptionClass}>
                      <FileText className="size-3.5 text-[#1B5CFF] dark:text-[#4B7CFF]" strokeWidth={1.75} />
                      Documentos PDF
                    </p>
                    <p className="sr-only">
                      En el encabezado de cotizaciones, órdenes y facturas en PDF se imprime{" "}
                      {logoUrl ? "el logo que subiste" : "el logo de Intrax"} junto con el nombre {previewNombre}.
                    </p>
                    {/* El PDF es papel: siempre blanco, también en modo oscuro. */}
                    <div
                      aria-hidden
                      className="mt-3 flex-1 overflow-hidden rounded-[14px] border border-[#E7E7EA] bg-white p-4 dark:border-[#3A4661]"
                    >
                      <div className="flex items-center gap-2.5 border-b border-[#E7E7EA] pb-3">
                        {logoUrl ? (
                          <img src={logoUrl} alt="" className="size-7 shrink-0 rounded object-contain" />
                        ) : (
                          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded bg-[#17235B] text-[9px] font-semibold tracking-[0.1em] text-white">
                            {previewIniciales}
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-semibold text-[#09090B]">{previewNombre}</p>
                          <p className="text-[9px] text-[#A1A1AA]">RFC · Dirección fiscal</p>
                        </div>
                        <span className="shrink-0 rounded-sm bg-[#FAFAFA] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#6E6E77]">
                          Folio 0001
                        </span>
                      </div>
                      <div className="mt-3 space-y-1.5">
                        <div className="h-1 w-full rounded-full bg-[#E7E7EA]" />
                        <div className="h-1 w-4/5 rounded-full bg-[#E7E7EA]" />
                        <div className="h-1 w-3/5 rounded-full bg-[#E7E7EA]" />
                      </div>
                    </div>
                    <p className={previewFootnoteClass}>Cotizaciones, órdenes y facturas CFDI.</p>
                  </div>
                </div>
              </section>
            </div>

            {/* Pie de acciones dentro del panel. */}
            <div className="flex flex-col gap-3 border-t border-[#E7E7EA] bg-[#FAFAFA] px-5 py-4 dark:border-[#273244] dark:bg-[#151E32] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
              <p className="text-[13px] leading-[18px] text-[#6E6E77] dark:text-[#8EA0B8]">
                {dirty
                  ? "El nombre cambia para todos los usuarios al guardar."
                  : "El logo se publica en cuanto lo subes; el nombre, al guardar."}
              </p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setNombreDraft(nombre);
                    setNombreError("");
                  }}
                  disabled={busy || !dirty}
                  className={secondaryBtnClass}
                >
                  <RotateCcw className="size-[18px]" strokeWidth={1.6} aria-hidden />
                  Descartar
                </button>
                <button
                  type="submit"
                  className={primaryBtnClass}
                  disabled={busy || !dirty}
                  aria-busy={saving || undefined}
                >
                  {saving ? (
                    <LoaderCircle className="size-[18px] animate-spin motion-reduce:animate-none" strokeWidth={1.6} aria-hidden />
                  ) : (
                    <Check className="size-[18px]" strokeWidth={1.6} aria-hidden />
                  )}
                  {saving ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
