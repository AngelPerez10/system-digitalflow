import { useEffect, useId, useRef, useState, type DragEvent, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Check,
  FileText,
  ImagePlus,
  LoaderCircle,
  LogIn,
  PanelLeft,
  ReceiptText,
  SquareCheckBig,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import PageMeta from "@/components/common/PageMeta";
import Alert from "@/components/ui/alert/Alert";
import { fileToDataUrl, MARCA_FALLBACK_LOGO, patchMarca, uploadMarcaLogo } from "@/config/marcaApi";
import { inicialesDeNombre } from "@/config/marcaIniciales";
import { useMarca } from "@/context/MarcaContext";
import { useTheme } from "@/context/ThemeContext";
import {
  erpHeroHeadingClass,
  erpPrimaryBtnClass,
  erpSansStyle,
  erpSectionLabelClass,
} from "@/layout/erpPageStyles";

const NOMBRE_MAX = 120;

// Superficie propia de esta página: un tono más claro que el canvas (#0f172a) en oscuro
// para que las tarjetas se distingan del fondo en vez de fundirse con él.
const settingsCardClass =
  "overflow-hidden rounded-3xl border border-[#e7ded0] bg-[#fffdfa]/95 shadow-[0_30px_80px_-40px_rgba(28,25,23,0.28)] backdrop-blur-sm dark:border-[#334155] dark:bg-[#141b2d] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_30px_80px_-45px_rgba(0,0,0,0.7)]";

const previewCaptionClass =
  "flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#78716c] dark:text-[#94a3b8]";

function BtnIcon({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex size-4 shrink-0 items-center justify-center" aria-hidden>
      {children}
    </span>
  );
}

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
      <PageMeta
        title={`Ajustes generales | ${nombre}`}
        description="Nombre y logo de la empresa"
      />
      <div className="w-full min-w-0 overflow-x-hidden">
        <div
          className="mx-auto w-full max-w-[1100px] space-y-5 px-0 pb-8 pt-0 text-sm sm:px-2 sm:pb-10 sm:text-base lg:px-4"
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
            <span aria-hidden className="text-[#a8a29e]">
              /
            </span>
            <span className="px-1.5 py-0.5 text-[#1c1917] dark:text-[#f8fafc]">Ajustes generales</span>
          </nav>

          <header className="px-1 pt-2">
            <p className={erpSectionLabelClass}>Configuración</p>
            <h1 id={titleId} className={`mt-2 ${erpHeroHeadingClass}`}>
              Nombre y logo
            </h1>
            <p className="mt-3 max-w-xl text-[15px] leading-[1.65] text-[#57534e] dark:text-[#cbd5e1]">
              Así se presenta la empresa en el menú, los PDFs y la pantalla para entrar.
            </p>
          </header>

          <div className="mt-6 space-y-3">
            <div id={statusErrId} role="alert" aria-live="assertive" aria-atomic="true">
              {errorMsg ? <Alert variant="error" title="No se pudo guardar" message={errorMsg} /> : null}
            </div>
            <div id={statusOkId} role="status" aria-live="polite" aria-atomic="true">
              {okMsg ? <Alert variant="success" title="Listo" message={okMsg} /> : null}
            </div>
          </div>

          {/* Identidad: logo compacto + nombre en fila horizontal, sin centrado vacío */}
          <form
            onSubmit={(e) => void onSubmit(e)}
            aria-labelledby={titleId}
            className={`${settingsCardClass} relative mt-8 p-5 pt-7 sm:p-7 sm:pt-8`}
          >
            <span className="absolute inset-x-0 top-0 h-[3px] bg-[#ff801f]" aria-hidden />
            <fieldset className="min-w-0">
              <legend className="sr-only">Editar nombre y logo de la empresa</legend>

              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
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
                    className={`group relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border shadow-[0_10px_24px_-16px_rgba(28,25,23,0.4)] transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#ff801f] has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-[#fffdfa] dark:shadow-[0_10px_24px_-14px_rgba(0,0,0,0.6)] dark:has-[:focus-visible]:ring-offset-[#141b2d] sm:h-28 sm:w-28 ${
                      busy ? "pointer-events-none opacity-60" : "cursor-pointer"
                    } ${
                      dragging
                        ? "border-[#ff801f] bg-[#fff4ea] dark:border-[#fb923c] dark:bg-[#1c1917]"
                        : logoUrl
                          ? "border-[#e4dcd0] bg-[#fffdf9] hover:border-[#ff801f]/50 dark:border-[#334155] dark:bg-[#0f172a]"
                          : "border-dashed border-[#d8cdbb] bg-[#fffdf9] hover:border-[#ff801f]/60 hover:bg-[#fff8f0] dark:border-[#334155] dark:bg-[#0f172a] dark:hover:border-[#fb923c]/60"
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
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-[#1c1917]/0 text-[#faf8f4] opacity-0 transition-all duration-150 group-hover:bg-[#1c1917]/60 group-hover:opacity-100 group-focus-within:bg-[#1c1917]/60 group-focus-within:opacity-100">
                          {uploading ? (
                            <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" strokeWidth={1.75} />
                          ) : (
                            <>
                              <ImagePlus className="size-4" strokeWidth={1.75} />
                              <span className="text-[10px] font-semibold">Cambiar</span>
                            </>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-1 px-2 text-center">
                        {uploading ? (
                          <LoaderCircle className="size-5 animate-spin text-[#ff801f] motion-reduce:animate-none" strokeWidth={1.75} />
                        ) : (
                          <>
                            <span
                              className="[font-family:Georgia,'Times_New_Roman',serif] text-[1.65rem] leading-none tracking-[0.08em] text-[#1c1917] dark:text-[#f8fafc]"
                              aria-hidden
                            >
                              {previewIniciales}
                            </span>
                            <span className="flex items-center gap-1 text-[9px] font-medium text-[#57534e] dark:text-[#94a3b8]">
                              <Upload className="size-2.5" strokeWidth={2} />
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
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-[#57534e] transition-colors hover:text-[#c64545] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff801f] disabled:pointer-events-none disabled:opacity-50 dark:text-[#94a3b8] dark:hover:text-[#f87171]"
                      onClick={() => void onClearLogo()}
                      disabled={busy}
                    >
                      <Trash2 className="size-3" strokeWidth={1.75} />
                      Quitar
                    </button>
                  ) : null}
                </div>

                <div className="hidden h-20 w-px shrink-0 bg-[#e4dcd0] dark:bg-[#273244] sm:block" aria-hidden />

                <div className="min-w-0 flex-1">
                  <label
                    htmlFor={nombreId}
                    className="block text-[11px] font-medium uppercase tracking-[0.16em] text-[#78716c] dark:text-[#94a3b8]"
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
                    className={`mt-2 min-h-12 w-full border-0 border-b bg-transparent pb-1.5 [font-family:Georgia,'Times_New_Roman',serif] text-[1.75rem] leading-tight tracking-[-0.02em] text-[#1c1917] outline-none transition-[border-color] focus-visible:border-[#ff801f] disabled:opacity-50 dark:text-[#f8fafc] ${
                      nombreError ? "border-[#c64545] dark:border-[#f87171]" : "border-[#1c1917]/20 dark:border-white/25"
                    }`}
                  />
                  <p id={logoHintId} className="mt-2 text-xs leading-relaxed text-[#57534e] dark:text-[#cbd5e1]">
                    Iniciales en el menú:{" "}
                    <span className="font-semibold text-[#1c1917] dark:text-[#f8fafc]">{previewIniciales}</span>
                    {" · "}
                    PNG, JPG o WebP, máximo 4&nbsp;MB.
                  </p>
                  <p id={nombreHintId} className="sr-only">
                    Nombre de la empresa, hasta {NOMBRE_MAX} caracteres.
                  </p>
                  {dirty ? (
                    <p className="mt-1.5 text-xs font-medium text-[#9a3412] dark:text-[#fdba74]">
                      Hay cambios sin guardar.
                    </p>
                  ) : null}
                  {nombreError ? (
                    <p id={nombreErrorId} className="mt-1.5 text-xs font-medium text-[#c64545] dark:text-[#f87171]" role="alert">
                      {nombreError}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 sm:self-end">
                  <button
                    type="submit"
                    className={`${erpPrimaryBtnClass} w-full sm:w-auto`}
                    disabled={busy || !dirty}
                    aria-busy={saving || undefined}
                  >
                    <BtnIcon>
                      {saving ? (
                        <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" strokeWidth={1.75} />
                      ) : (
                        <Check className="size-4" strokeWidth={1.75} />
                      )}
                    </BtnIcon>
                    {saving ? "Guardando…" : "Guardar"}
                  </button>
                </div>
              </div>
            </fieldset>
          </form>

          {/* Dónde aparece: las tres superficies reales, visibles a la vez (no pestañas escondiendo contenido) */}
          <div className={settingsCardClass}>
            <div className="border-b border-[#e4dcd0] px-5 py-4 dark:border-[#273244] sm:px-7">
              <h2 className="text-base font-semibold text-[#1c1917] dark:text-[#f8fafc]">Dónde aparece tu marca</h2>
              <p className="mt-0.5 text-sm text-[#57534e] dark:text-[#cbd5e1]">
                Cada cambio de nombre o logo se refleja de inmediato en estos tres lugares.
              </p>
            </div>

            <div className="grid divide-y divide-[#e4dcd0] dark:divide-[#273244] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {/* Menú */}
              <section className="p-5 sm:p-6" aria-label="Vista previa del menú">
                <p className={previewCaptionClass}>
                  <PanelLeft className="size-3.5 text-[#ff801f]" strokeWidth={1.75} />
                  Menú lateral
                </p>
                <p className="sr-only">
                  En el menú se verá {previewNombre}
                  {logoUrl ? " con el logo que subiste" : ` con las iniciales ${previewIniciales}`}.
                </p>
                <div
                  aria-hidden
                  className="mt-3 overflow-hidden rounded-xl border border-[#e4dcd0] bg-[#f3eee6] p-4 dark:border-[#273244] dark:bg-[#0c1322]"
                >
                  <div className="flex items-center gap-2.5">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt=""
                        className="h-8 w-8 rounded-md object-contain ring-1 ring-[#1c1917]/8 dark:ring-white/10"
                      />
                    ) : (
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[#1c1917] text-[10px] font-semibold tracking-[0.12em] text-[#faf8f4] dark:bg-[#f8fafc] dark:text-[#0f172a]">
                        {previewIniciales}
                      </span>
                    )}
                    <span className="min-w-0 truncate text-sm font-semibold tracking-tight text-[#1c1917] dark:text-[#f8fafc]">
                      {previewNombre}
                    </span>
                  </div>
                  <div className="mt-4 h-px bg-[#e4dcd0] dark:bg-[#273244]" />
                  <ul className="mt-3 space-y-1 text-[12px] text-[#57534e] dark:text-[#94a3b8]">
                    <li className="relative flex items-center gap-2 rounded-md py-1.5 pl-3 font-medium text-[#1c1917] dark:text-[#f8fafc]">
                      <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-[#ff801f]" />
                      <ReceiptText className="size-3.5 text-[#ff801f]" strokeWidth={1.75} />
                      Cotizaciones
                    </li>
                    <li className="flex items-center gap-2 py-1.5 pl-3">
                      <SquareCheckBig className="size-3.5 text-[#a8a29e] dark:text-[#64748b]" strokeWidth={1.75} />
                      Órdenes
                    </li>
                    <li className="flex items-center gap-2 py-1.5 pl-3">
                      <Users className="size-3.5 text-[#a8a29e] dark:text-[#64748b]" strokeWidth={1.75} />
                      Clientes
                    </li>
                  </ul>
                </div>
                <p className="mt-2.5 text-xs leading-relaxed text-[#78716c] dark:text-[#8ea0b8]">
                  Lo ve cualquier persona que entre al sistema.
                </p>
              </section>

              {/* Pantalla de acceso */}
              <section className="p-5 sm:p-6" aria-label="Vista previa de la pantalla para entrar">
                <p className={previewCaptionClass}>
                  <LogIn className="size-3.5 text-[#ff801f]" strokeWidth={1.75} />
                  Pantalla de acceso
                </p>
                <p className="sr-only">
                  Tema actual: {isDarkPreview ? "oscuro" : "claro"}. En la pantalla para entrar se muestra{" "}
                  {logoUrl ? "el logo que subiste" : "el logo de Intrax"} y el nombre {previewNombre}.
                </p>
                <div
                  aria-hidden
                  className={`relative mt-3 overflow-hidden rounded-xl border p-5 ${
                    isDarkPreview ? "border-[#273244] bg-[#1c1917]" : "border-[#e4dcd0] bg-[#fcfaf6]"
                  }`}
                >
                  {isDarkPreview ? (
                    <div
                      className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#ff801f]/15 via-transparent to-transparent"
                      aria-hidden
                    />
                  ) : null}
                  <div className="relative flex flex-col items-center gap-3 py-2 text-center">
                    <img
                      src={logoUrl || MARCA_FALLBACK_LOGO}
                      alt=""
                      className={`h-9 w-auto max-w-[9rem] object-contain ${
                        !logoUrl && isDarkPreview ? "brightness-0 invert" : ""
                      }`}
                    />
                    <span className={`truncate text-sm ${isDarkPreview ? "text-[#e7e2da]" : "text-[#57534e]"}`}>
                      © {previewNombre}
                    </span>
                    <p
                      className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${
                        isDarkPreview ? "text-[#fb923c]" : "text-[#9a3412]"
                      }`}
                    >
                      {isDarkPreview ? "Tu tema: oscuro" : "Tu tema: claro"}
                    </p>
                  </div>
                </div>
                <p className="mt-2.5 text-xs leading-relaxed text-[#78716c] dark:text-[#8ea0b8]">
                  Lo primero que ve alguien antes de entrar.
                </p>
              </section>

              {/* Documentos PDF */}
              <section className="p-5 sm:p-6" aria-label="Vista previa de los PDFs">
                <p className={previewCaptionClass}>
                  <FileText className="size-3.5 text-[#ff801f]" strokeWidth={1.75} />
                  Documentos PDF
                </p>
                <p className="sr-only">
                  En el encabezado de cotizaciones, órdenes y facturas en PDF se imprime{" "}
                  {logoUrl ? "el logo que subiste" : "el logo de Intrax"} junto con el nombre {previewNombre}.
                </p>
                <div aria-hidden className="mt-3 overflow-hidden rounded-xl border border-[#e4dcd0] bg-white p-4">
                  <div className="flex items-center gap-2.5 border-b border-[#efe9de] pb-3">
                    {logoUrl ? (
                      <img src={logoUrl} alt="" className="h-7 w-7 shrink-0 rounded object-contain" />
                    ) : (
                      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[#1c1917] text-[9px] font-semibold tracking-[0.1em] text-white">
                        {previewIniciales}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-[#1c1917]">{previewNombre}</p>
                      <p className="text-[9px] text-[#a8a29e]">RFC · Dirección fiscal</p>
                    </div>
                    <span className="shrink-0 rounded-sm bg-[#f3eee6] px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-[#78716c]">
                      Folio 0001
                    </span>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <div className="h-1 w-full rounded-full bg-[#efe9de]" />
                    <div className="h-1 w-4/5 rounded-full bg-[#efe9de]" />
                    <div className="h-1 w-3/5 rounded-full bg-[#efe9de]" />
                  </div>
                </div>
                <p className="mt-2.5 text-xs leading-relaxed text-[#78716c] dark:text-[#8ea0b8]">
                  Cotizaciones, órdenes y facturas CFDI.
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
