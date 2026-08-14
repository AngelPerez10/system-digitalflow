import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Check, ImagePlus, LoaderCircle, Trash2, Upload } from "lucide-react";
import { motion, MotionConfig } from "motion/react";
import PageMeta from "@/components/common/PageMeta";
import Alert from "@/components/ui/alert/Alert";
import { fileToDataUrl, MARCA_FALLBACK_LOGO, patchMarca, uploadMarcaLogo } from "@/config/marcaApi";
import { inicialesDeNombre } from "@/config/marcaIniciales";
import { useMarca } from "@/context/MarcaContext";
import { erpSansStyle } from "@/layout/erpPageStyles";

const NOMBRE_MAX = 120;

const btnPrimary =
  "inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#ff801f] px-4 text-[13px] font-semibold text-[#1c1917] shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] transition-colors hover:bg-[#e56e12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff801f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#faf8f4] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[12rem]";

const btnQuiet =
  "inline-flex h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-[#e4dcd0] bg-[#fffdf9] px-4 text-[13px] font-medium text-[#44403c] transition-colors hover:bg-[#f3eee6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff801f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#faf8f4] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#334155] dark:bg-transparent dark:text-[#e5e7eb] dark:hover:bg-[#1e293b] sm:w-auto sm:min-w-[12rem]";

function BtnIcon({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex size-4 shrink-0 items-center justify-center" aria-hidden>
      {children}
    </span>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  },
};

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
  const [nombreDraft, setNombreDraft] = useState(nombre);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
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
      <MotionConfig reducedMotion="user">
        <div className="relative min-h-[calc(100dvh-5rem)] overflow-x-hidden" style={erpSansStyle}>
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(1200px 480px at 12% -10%, rgba(255,128,31,0.09), transparent 55%), radial-gradient(900px 420px at 100% 0%, rgba(28,25,23,0.04), transparent 50%)",
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.22] dark:opacity-[0.08]"
            style={{
              backgroundImage:
                "linear-gradient(#e7ded0 1px, transparent 1px), linear-gradient(90deg, #e7ded0 1px, transparent 1px)",
              backgroundSize: "56px 56px",
            }}
            aria-hidden
          />

          <div className="relative mx-auto w-full max-w-[1040px] px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
            <nav
              className="flex flex-wrap items-center gap-x-2 text-[13px] text-[#57534e] dark:text-[#cbd5e1]"
              aria-label="Migas de pan"
            >
              <Link
                to="/"
                className="rounded-sm py-1 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff801f]"
              >
                Inicio
              </Link>
              <span aria-hidden className="text-[#a8a29e]">
                /
              </span>
              <span className="text-[#1c1917] dark:text-[#f8fafc]">Ajustes generales</span>
            </nav>

            <header className="mt-10 max-w-xl">
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#c2410c] dark:text-[#fb923c]">
                Configuración
              </p>
              <h1
                id={titleId}
                className="mt-3 [font-family:Georgia,'Times_New_Roman',serif] text-[clamp(2.15rem,4.2vw,3.15rem)] font-normal leading-[1.08] tracking-[-0.03em] text-[#1c1917] dark:text-[#f8fafc]"
              >
                Nombre y logo
              </h1>
              <div className="mt-5 h-px w-16 bg-gradient-to-r from-[#ff801f] to-transparent" aria-hidden />
              <p className="mt-5 text-[15px] leading-[1.65] text-[#44403c] dark:text-[#cbd5e1]">
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

            <motion.div
              className="mt-10 overflow-hidden rounded-[1.35rem] border border-[#e4dcd0] bg-[#faf8f4] shadow-[0_40px_80px_-48px_rgba(28,25,23,0.55)] dark:border-[#273244] dark:bg-[#111827]"
              variants={fadeUp}
              initial="hidden"
              animate="show"
            >
              <div className="grid lg:grid-cols-[240px_minmax(0,1fr)]">
                <aside
                  className="relative border-b border-[#e4dcd0] bg-[#f3eee6] dark:border-[#273244] dark:bg-[#0c1322] lg:border-b-0 lg:border-r"
                  aria-label="Vista previa del menú"
                >
                  <p className="sr-only">
                    En el menú se verá {previewNombre}
                    {logoUrl ? " con el logo que subiste" : ` con las iniciales ${previewIniciales}`}.
                  </p>
                  <div aria-hidden className="flex h-full flex-col px-5 py-6">
                    <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#78716c] dark:text-[#94a3b8]">
                      Menú
                    </p>
                    <div className="mt-6 flex items-center gap-3">
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt=""
                          className="h-9 w-9 rounded-md object-contain ring-1 ring-[#1c1917]/8 dark:ring-white/10"
                        />
                      ) : (
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-[#1c1917] text-[11px] font-semibold tracking-[0.12em] text-[#faf8f4] dark:bg-[#f8fafc] dark:text-[#0f172a]">
                          {previewIniciales}
                        </span>
                      )}
                      <span className="min-w-0 truncate text-[15px] font-semibold tracking-tight text-[#1c1917] dark:text-[#f8fafc]">
                        {previewNombre}
                      </span>
                    </div>
                    <div className="mt-6 h-px bg-[#e4dcd0] dark:bg-[#273244]" />
                    <ul className="mt-5 space-y-1 text-[13px] text-[#57534e] dark:text-[#94a3b8]">
                      <li className="relative rounded-md py-2 pl-3 font-medium text-[#1c1917] dark:text-[#f8fafc]">
                        <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-[#ff801f]" />
                        Cotizaciones
                      </li>
                      <li className="py-2 pl-3">Órdenes</li>
                      <li className="py-2 pl-3">Clientes</li>
                    </ul>
                    <p className="mt-auto hidden pt-10 text-[11px] tracking-[0.08em] text-[#78716c] lg:block">
                      Vista previa
                    </p>
                  </div>
                </aside>

                <form
                  onSubmit={(e) => void onSubmit(e)}
                  aria-labelledby={titleId}
                  className="bg-[#faf8f4] p-6 sm:p-9 dark:bg-[#111827]"
                >
                  <fieldset className="min-w-0">
                    <legend className="sr-only">Editar nombre y logo de la empresa</legend>

                    <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-12">
                      <div className="shrink-0">
                        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#78716c] dark:text-[#94a3b8]">
                          Logo
                        </p>
                        <div className="mt-3 flex h-[9.75rem] w-[9.75rem] items-center justify-center overflow-hidden rounded-xl bg-[#fffdf9] shadow-[inset_0_0_0_1px_rgba(28,25,23,0.08)] dark:bg-[#0f172a] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
                          {logoUrl ? (
                            <img
                              src={logoUrl}
                              alt={`Logo actual de ${nombre}`}
                              className="h-full w-full object-contain p-4"
                            />
                          ) : (
                            <span
                              className="[font-family:Georgia,'Times_New_Roman',serif] text-[2.35rem] tracking-[0.12em] text-[#1c1917] dark:text-[#f8fafc]"
                              aria-hidden
                            >
                              {previewIniciales}
                            </span>
                          )}
                        </div>
                        <div className="mt-4 flex w-[11rem] flex-col gap-2 has-[:focus-visible]:[&_label]:ring-2 has-[:focus-visible]:[&_label]:ring-[#ff801f] has-[:focus-visible]:[&_label]:ring-offset-2 has-[:focus-visible]:[&_label]:ring-offset-[#faf8f4]">
                          <input
                            ref={fileRef}
                            id={logoInputId}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="sr-only"
                            disabled={busy}
                            aria-describedby={logoHintId}
                            onChange={(e) => void onPickLogo(e.target.files?.[0])}
                          />
                          <label
                            htmlFor={logoInputId}
                            aria-busy={uploading || undefined}
                            className={`${btnPrimary} !w-full !min-w-0 ${busy ? "pointer-events-none opacity-50" : ""}`}
                          >
                            <BtnIcon>
                              {uploading ? (
                                <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" strokeWidth={1.75} />
                              ) : logoUrl ? (
                                <ImagePlus className="size-4" strokeWidth={1.75} />
                              ) : (
                                <Upload className="size-4" strokeWidth={1.75} />
                              )}
                            </BtnIcon>
                            {uploading ? "Subiendo…" : logoUrl ? "Cambiar logo" : "Subir logo"}
                          </label>
                          {logoUrl ? (
                            <button
                              type="button"
                              className={`${btnQuiet} !w-full !min-w-0`}
                              onClick={() => void onClearLogo()}
                              disabled={busy}
                            >
                              <BtnIcon>
                                <Trash2 className="size-4" strokeWidth={1.75} />
                              </BtnIcon>
                              Quitar logo
                            </button>
                          ) : null}
                        </div>
                        <p
                          id={logoHintId}
                          className="mt-3 max-w-[11.5rem] text-xs leading-relaxed text-[#57534e] dark:text-[#cbd5e1]"
                        >
                          PNG, JPG o WebP. Máximo 4 MB. Se guarda al subirlo.
                        </p>
                      </div>

                      <div className="min-w-0 flex-1 pt-0 lg:pt-0.5">
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
                          className={`mt-3 min-h-12 w-full border-0 border-b bg-transparent pb-2 [font-family:Georgia,'Times_New_Roman',serif] text-[1.65rem] leading-tight tracking-[-0.02em] text-[#1c1917] outline-none transition-[border-color] focus-visible:border-[#ff801f] disabled:opacity-50 dark:text-[#f8fafc] ${
                            nombreError ? "border-[#c64545]" : "border-[#1c1917]/20 dark:border-white/25"
                          }`}
                        />
                        <p id={nombreHintId} className="mt-3 text-sm leading-relaxed text-[#57534e] dark:text-[#cbd5e1]">
                          Iniciales en el menú:{" "}
                          <span className="font-semibold text-[#1c1917] dark:text-[#f8fafc]">
                            {previewIniciales}
                          </span>
                          {dirty ? (
                            <span className="mt-2 block text-[#9a3412] dark:text-[#fdba74]">
                              Hay cambios sin guardar.
                            </span>
                          ) : null}
                        </p>
                        {nombreError ? (
                          <p id={nombreErrorId} className="mt-2 text-sm text-[#c64545]" role="alert">
                            {nombreError}
                          </p>
                        ) : null}
                        <button
                          type="submit"
                          className={`${btnPrimary} mt-8`}
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
                          {saving ? "Guardando…" : "Guardar nombre"}
                        </button>
                      </div>
                    </div>
                  </fieldset>
                </form>
              </div>

              <div
                className="relative flex flex-col gap-3 bg-[#161412] px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-9"
                aria-label="Vista previa del inicio de sesión"
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ff801f]/55 to-transparent" aria-hidden />
                <p className="sr-only">
                  En la pantalla para entrar se muestra {logoUrl ? "el logo que subiste" : "el logo de Intrax"} y el
                  nombre {previewNombre}.
                </p>
                <div className="flex min-w-0 items-center gap-4" aria-hidden>
                  <img
                    src={logoUrl || MARCA_FALLBACK_LOGO}
                    alt=""
                    className={`h-8 w-auto max-w-[10rem] object-contain ${logoUrl ? "" : "brightness-0 invert"}`}
                  />
                  <span className="truncate text-sm text-[#e7e2da]">© {previewNombre}</span>
                </div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-[#d6d3d1]">
                  Login y PDFs
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </MotionConfig>
    </>
  );
}
