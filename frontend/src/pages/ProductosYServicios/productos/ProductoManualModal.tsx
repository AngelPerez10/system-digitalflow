/**
 * Alta / edición de producto manual: imagen a la izquierda, datos a la derecha.
 * La subida de imagen y el guardado viven en la página (misma lógica de siempre).
 */
import type { Dispatch, SetStateAction } from "react";
import type { DropzoneInputProps, DropzoneRootProps } from "react-dropzone";
import { CircleAlert, ImagePlus, Loader2, PackagePlus, Pencil, Trash2, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { resolveMediaUrl } from "@/config/api";
import {
  btn,
  fieldLabel,
  input,
  modalClose,
  modalEyebrow,
  modalFooter,
  modalHeader,
  modalShell,
  modalSubtitle,
  modalTitle,
  requiredMark,
  textarea,
} from "./productosStyles";

export type ManualForm = {
  imagen_url: string;
  producto: string;
  caracteristicas: string;
  marca: string;
  modelo: string;
  sat_key: string;
  precio: string;
  stock: string;
};

type Props = {
  open: boolean;
  editing: boolean;
  titleId: string;
  form: ManualForm;
  setForm: Dispatch<SetStateAction<ManualForm>>;
  error: string;
  clearError: () => void;
  saving: boolean;
  uploading: boolean;
  dropzone: {
    getRootProps: <T extends DropzoneRootProps>(props?: T) => T;
    getInputProps: <T extends DropzoneInputProps>(props?: T) => T;
    isDragActive: boolean;
  };
  onClose: () => void;
  onSave: () => void;
};

export default function ProductoManualModal({
  open,
  editing,
  titleId,
  form,
  setForm,
  error,
  clearError,
  saving,
  uploading,
  dropzone,
  onClose,
  onSave,
}: Props) {
  const set = (k: keyof ManualForm) => (v: string) => setForm((p) => ({ ...p, [k]: v }));
  const errorModelo = Boolean(error && /modelo/i.test(error));

  return (
    <Modal
      mobileBottomSheet
      isOpen={open}
      onClose={() => !saving && onClose()}
      closeOnBackdropClick={false}
      closeOnEscape={!saving}
      showCloseButton={false}
      ariaLabelledBy={titleId}
      className={`${modalShell} sm:w-[min(96vw,52rem)] sm:max-w-3xl`}
    >
      <form
        className="flex min-h-0 flex-1 flex-col"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!saving && !uploading) onSave();
        }}
      >
        <header className={modalHeader}>
          <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-[#E6A23C]/15 blur-3xl" aria-hidden />
          <div className="relative flex items-start gap-3.5">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(230,162,60,0.16)] text-[#E6A23C]">
              {editing ? <Pencil className="size-5" aria-hidden /> : <PackagePlus className="size-5" aria-hidden />}
            </span>
            <div className="min-w-0">
              <p className={modalEyebrow}>Catálogo propio · {editing ? "Edición" : "Nuevo"}</p>
              <h2 id={titleId} className={modalTitle}>
                {editing ? "Editar producto manual" : "Nuevo producto manual"}
              </h2>
              <p className={modalSubtitle}>Aparece junto a SYSCOM y TVC, y primero en la búsqueda.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Cerrar ventana" className={modalClose}>
            <X className="size-5" aria-hidden />
          </button>
        </header>

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
          {error ? (
            <div id="manual-form-error" role="alert" className="cot-fade mb-5 flex items-start gap-3 rounded-[14px] border border-[#F6CFCF] bg-[#FEF2F2] px-4 py-3 text-[14px] text-[#9F1F1F] dark:border-[#7F1D1D] dark:bg-[#3F1518] dark:text-[#FCA5A5]">
              <CircleAlert className="mt-0.5 size-[18px] shrink-0" aria-hidden />
              <div>
                <p className="font-semibold">Revisa el formulario</p>
                <p className="mt-0.5 text-[13px]">{error}</p>
              </div>
            </div>
          ) : null}

          <div className="grid gap-6 md:grid-cols-[14rem_minmax(0,1fr)]">
            {/* Imagen */}
            <div>
              <span className={fieldLabel}>Imagen</span>
              {form.imagen_url ? (
                <div className="cot-fade space-y-2">
                  <div className="flex aspect-square items-center justify-center overflow-hidden rounded-[16px] border border-[#E7E7EA] bg-white p-3 dark:border-[#273244] dark:bg-[#0F172A]">
                    <img src={resolveMediaUrl(form.imagen_url)} alt="Imagen del producto" className="h-full w-full object-contain" />
                  </div>
                  <button type="button" onClick={() => set("imagen_url")("")} className={`${btn.secondary} h-10 w-full text-[13px]`}>
                    <Trash2 aria-hidden />
                    Quitar imagen
                  </button>
                </div>
              ) : (
                <div
                  {...dropzone.getRootProps()}
                  className={`flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-[16px] border-2 border-dashed px-4 text-center transition-[border-color,background-color] duration-150 ${
                    dropzone.isDragActive
                      ? "border-[#1B5CFF] bg-[rgba(27,92,255,0.06)] dark:border-[#4B7CFF] dark:bg-[rgba(75,124,255,0.10)]"
                      : "border-[#D4D4D8] bg-[#FAFAFA] hover:border-[#1B5CFF]/50 dark:border-[#3A4661] dark:bg-[#0F172A] dark:hover:border-[#4B7CFF]/50"
                  }`}
                >
                  <input {...dropzone.getInputProps()} />
                  {uploading ? (
                    <Loader2 className="size-7 animate-spin text-[#1B5CFF]" aria-hidden />
                  ) : (
                    <span className="inline-flex size-11 items-center justify-center rounded-[12px] bg-[rgba(27,92,255,0.08)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#9BB6FF]">
                      <ImagePlus className="size-5" aria-hidden />
                    </span>
                  )}
                  <p className="text-[13.5px] font-medium text-[#09090B] dark:text-[#F8FAFC]">
                    {uploading ? "Subiendo…" : dropzone.isDragActive ? "Suelta aquí" : "Arrastra o haz clic"}
                  </p>
                  <p className="text-[11.5px] text-[#6E6E77] dark:text-[#8EA0B8]">PNG, JPG, WebP o SVG</p>
                </div>
              )}
            </div>

            {/* Datos */}
            <div className="space-y-4">
              <div>
                <label className={fieldLabel} htmlFor="manual-producto">
                  Producto<span className={requiredMark}>*</span>
                </label>
                <input id="manual-producto" value={form.producto} onChange={(e) => set("producto")(e.target.value)} placeholder="Nombre del producto" className={input} autoComplete="off" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={fieldLabel} htmlFor="manual-marca">
                    Marca<span className={requiredMark}>*</span>
                  </label>
                  <input id="manual-marca" value={form.marca} onChange={(e) => set("marca")(e.target.value)} placeholder="Marca" className={input} autoComplete="off" />
                </div>
                <div>
                  <label className={fieldLabel} htmlFor="manual-modelo">
                    Modelo<span className={requiredMark}>*</span>
                  </label>
                  <input
                    id="manual-modelo"
                    value={form.modelo}
                    onChange={(e) => {
                      clearError();
                      set("modelo")(e.target.value);
                    }}
                    placeholder="Modelo"
                    className={`${input} font-mono ${errorModelo ? "border-[#C22B2B] focus:border-[#C22B2B] focus:ring-[rgba(194,43,43,0.18)]" : ""}`}
                    aria-invalid={errorModelo}
                    aria-describedby={error ? "manual-form-error" : undefined}
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className={fieldLabel} htmlFor="manual-precio">
                    Precio (MXN)<span className={requiredMark}>*</span>
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] text-[#A1A1AA]">$</span>
                    <input id="manual-precio" type="number" inputMode="decimal" min="0" step="0.01" value={form.precio} onChange={(e) => set("precio")(e.target.value)} placeholder="0.00" className={`${input} pl-7 tabular-nums`} />
                  </div>
                </div>
                <div>
                  <label className={fieldLabel} htmlFor="manual-stock">
                    Stock<span className={requiredMark}>*</span>
                  </label>
                  <input id="manual-stock" type="number" inputMode="numeric" min="0" step="1" value={form.stock} onChange={(e) => set("stock")(e.target.value)} placeholder="0" className={`${input} tabular-nums`} />
                </div>
              </div>
              <div>
                <label className={fieldLabel} htmlFor="manual-sat-key">
                  Clave SAT <span className="font-normal text-[#6E6E77] dark:text-[#8EA0B8]">(opcional)</span>
                </label>
                <input
                  id="manual-sat-key"
                  value={form.sat_key}
                  onChange={(e) => set("sat_key")(e.target.value)}
                  placeholder="Ej. 43201500"
                  inputMode="numeric"
                  autoComplete="off"
                  className={`${input} font-mono tracking-wide`}
                  aria-describedby="manual-sat-key-hint"
                />
                <p id="manual-sat-key-hint" className="mt-1.5 text-[12.5px] text-[#6E6E77] dark:text-[#8EA0B8]">
                  Clave de producto/servicio del SAT para CFDI.
                </p>
              </div>
              <div>
                <label className={fieldLabel} htmlFor="manual-caracteristicas">
                  Características
                </label>
                <textarea id="manual-caracteristicas" value={form.caracteristicas} onChange={(e) => set("caracteristicas")(e.target.value)} placeholder="Una característica por renglón" rows={4} className={textarea} />
              </div>
            </div>
          </div>
        </div>

        <footer className={modalFooter}>
          <button type="button" onClick={onClose} disabled={saving} className={btn.secondary}>
            Cancelar
          </button>
          <button type="submit" disabled={saving || uploading} aria-busy={saving} className={btn.primary}>
            {saving ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {saving ? "Guardando…" : editing ? "Guardar cambios" : "Agregar producto"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
