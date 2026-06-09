import { useEffect, useRef } from "react";
import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import { cardShellClass, labelPageClass, textareaLikeClassName } from "./cotizacionFormStyles";
import type { CotizacionPdfOpciones } from "./cotizacionPdfTypes";

type PdfLine = {
  id: string;
  producto_nombre: string;
  producto_descripcion: string;
};

type Props = {
  opciones: CotizacionPdfOpciones;
  onOpcionesChange: (next: CotizacionPdfOpciones) => void;
  descripcionesCortas: Record<string, string>;
  onDescripcionCortaChange: (conceptoId: string, value: string) => void;
  lines: PdfLine[];
};

type OpcionKey = keyof CotizacionPdfOpciones;

const OCULTAR_PRECIOS_LINEA = {
  label: "Ocultar precios por línea",
  hint: "No muestra P. UNIT., DESC ni IMPORTE por producto en el PDF.",
} as const;

const OPCIONES: { key: OpcionKey; label: string; hint: string }[] = [
  {
    key: "ocultar_totales",
    label: "Ocultar totales",
    hint: "Oculta subtotal, IVA, total, anticipo y saldo en el PDF.",
  },
  {
    key: "ocultar_detalle",
    label: "Ocultar detalle",
    hint: "No muestra la descripción o detalle del producto en el PDF ni en Excel.",
  },
  {
    key: "simplificar_descripcion",
    label: "Simplificar descripción",
    hint: "Reemplaza el texto del producto en PDF y Excel por la descripción corta. Desactiva «Ocultar detalle» automáticamente.",
  },
];

function hintPreview(text: string, maxLen = 120): string {
  const t = String(text || "").trim().replace(/\s+/g, " ");
  if (!t) return "Sin descripción larga.";
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen).trim()}…`;
}

function PdfOptionCheckbox({
  checked,
  label,
  hint,
  onChange,
}: {
  checked: boolean;
  label: string;
  hint: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#e7ded0] bg-[#fcfaf6]/90 px-3 py-3 transition-colors hover:bg-[#fff8f1] dark:border-[#273244] dark:bg-[#0f172a]/50 dark:hover:bg-[#111a2b]/80 sm:px-4">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#d6d3d1] text-[#ff801f] focus:ring-[#ff801f]/30 dark:border-[#475569] dark:bg-[#111a2b]"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-[#1c1917] dark:text-[#f8fafc]">{label}</span>
        <span className="mt-0.5 block text-xs text-[#78716c] dark:text-[#8ea0b8]">{hint}</span>
      </span>
    </label>
  );
}

export function CotizacionPdfOptionsPanel({
  opciones,
  onOpcionesChange,
  descripcionesCortas,
  onDescripcionCortaChange,
  lines,
}: Props) {
  const simplificarSectionRef = useRef<HTMLDivElement | null>(null);

  const setOpcion = (key: OpcionKey, value: boolean) => {
    if (key === "simplificar_descripcion" && value) {
      onOpcionesChange({
        ...opciones,
        simplificar_descripcion: true,
        ocultar_detalle: false,
      });
      return;
    }
    if (key === "ocultar_detalle" && value) {
      onOpcionesChange({
        ...opciones,
        ocultar_detalle: true,
        simplificar_descripcion: false,
      });
      return;
    }
    onOpcionesChange({ ...opciones, [key]: value });
  };

  useEffect(() => {
    if (!opciones.simplificar_descripcion || lines.length === 0) return;
    simplificarSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [opciones.simplificar_descripcion, lines.length]);

  const setOcultarPreciosLinea = (value: boolean) => {
    onOpcionesChange({
      ...opciones,
      ocultar_precios_unitarios: value,
      ocultar_importes_linea: value,
    });
  };

  const ocultarPreciosLineaActivo =
    opciones.ocultar_precios_unitarios || opciones.ocultar_importes_linea;

  return (
    <ComponentCard
      title="Opciones de exportación"
      desc="Se guardan con la cotización y aplican al PDF y Excel generados."
      className={cardShellClass.replace("overflow-hidden", "overflow-visible")}
      compact
    >
      <div className="grid grid-cols-1 gap-2.5">
        <PdfOptionCheckbox
          checked={ocultarPreciosLineaActivo}
          label={OCULTAR_PRECIOS_LINEA.label}
          hint={OCULTAR_PRECIOS_LINEA.hint}
          onChange={setOcultarPreciosLinea}
        />
        {OPCIONES.map((op) => (
          <PdfOptionCheckbox
            key={op.key}
            checked={opciones[op.key]}
            label={op.label}
            hint={op.hint}
            onChange={(v) => setOpcion(op.key, v)}
          />
        ))}
      </div>

      {opciones.simplificar_descripcion && lines.length > 0 && (
        <div
          ref={simplificarSectionRef}
          className="mt-5 space-y-4 border-t border-[#e7ded0] pt-5 dark:border-[#273244]"
        >
          <p className="text-xs text-[#78716c] dark:text-[#8ea0b8]">
            Este texto reemplaza el nombre del producto en el PDF y Excel (columna Descripción). El detalle sigue mostrando
            la descripción completa. Si lo dejas en blanco, se usa un resumen automático en el producto.
          </p>
          <ul className="space-y-4">
            {lines.map((line) => (
              <li
                key={line.id}
                className="rounded-xl border border-[#e7ded0] bg-[#fffdfa] p-3 dark:border-[#273244] dark:bg-[#111827]/60 sm:p-4"
              >
                <div className="text-sm font-medium text-[#1c1917] dark:text-[#f8fafc]">
                  {line.producto_nombre || "Sin nombre"}
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-[#78716c] dark:text-[#8ea0b8]">
                  Descripción completa: {hintPreview(line.producto_descripcion)}
                </p>
                <div className="mt-3">
                  <Label className={labelPageClass}>Texto del producto en PDF/Excel</Label>
                  <textarea
                    value={descripcionesCortas[line.id] || ""}
                    onChange={(e) => onDescripcionCortaChange(line.id, e.target.value.slice(0, 500))}
                    className={`${textareaLikeClassName} mt-2 min-h-[4.5rem] rounded-lg`}
                    rows={2}
                    placeholder="Ej. Kit IP 4 cámaras de 4 megapixel"
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {opciones.simplificar_descripcion && lines.length === 0 && (
        <p className="mt-4 text-xs text-[#78716c] dark:text-[#8ea0b8]">
          Agrega conceptos para configurar descripciones cortas.
        </p>
      )}
    </ComponentCard>
  );
}
