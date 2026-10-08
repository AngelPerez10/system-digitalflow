/**
 * Selector de proveedor de la ficha: tarjetas (Intrax · Sin proveedor · Otro ·
 * Según catálogo) en lugar de un desplegable largo. «Otro» abre la lista de
 * contactos proveedores. Radios nativos para teclado y lector de pantalla.
 */
import { useId, type ReactNode } from "react";
import { Building2, Check, Link2, PackageOpen, Users } from "lucide-react";
import "@/components/ui/modal-kit/motion.css";
import { inventarioFieldLabelClass, invInputLikeClass } from "../shared/inventarioStyles";
import { esIntrax, type ProveedorModo, type ProveedorSeleccion } from "../shared/inventarioProveedor";
import type { InventarioFuente } from "../shared/inventarioTypes";

function fuenteLabel(fuente: InventarioFuente): string {
  return fuente === "syscom" ? "SYSCOM" : fuente === "tvc" ? "TVC" : "";
}

type Opcion = { modo: ProveedorModo; titulo: string; detalle: string; icon: ReactNode; iconTone: string };

type Props = {
  value: ProveedorSeleccion;
  onChange: (next: ProveedorSeleccion) => void;
  proveedores: { id: number; nombre: string }[];
  /** Fuente del catálogo vinculado (para la opción «Según catálogo»). */
  fuente: InventarioFuente;
  /** Proveedor guardado, por si ya no viene en la lista. */
  proveedorGuardado?: { id: number; nombre: string } | null;
  disabled?: boolean;
};

export default function InventarioProveedorPicker({
  value,
  onChange,
  proveedores,
  fuente,
  proveedorGuardado,
  disabled = false,
}: Props) {
  const name = useId();
  const selectId = useId();
  const catalogo = fuenteLabel(fuente);

  const opciones: Opcion[] = [
    {
      modo: "intrax",
      titulo: "Intrax",
      detalle: "Producto propio",
      icon: <Building2 />,
      iconTone: "bg-[#17235B] text-[#E6A23C] dark:bg-[#1B2A63]",
    },
    {
      modo: "sin",
      titulo: "Sin proveedor",
      detalle: "Llegó sin pedido",
      icon: <PackageOpen />,
      iconTone: "bg-[#F4F4F5] text-[#52525B] dark:bg-white/[0.06] dark:text-[#B7C1D1]",
    },
    {
      modo: "otro",
      titulo: "Otro",
      detalle: "Elegir de Contactos",
      icon: <Users />,
      iconTone: "bg-[#EEF0FA] text-[#4453A8] dark:bg-[#1E2550] dark:text-[#A5B1F2]",
    },
    {
      modo: "catalogo",
      titulo: catalogo ? `Según ${catalogo}` : "Sin elegir",
      detalle: catalogo ? "Catálogo vinculado" : "Se define después",
      icon: <Link2 />,
      iconTone: "bg-[rgba(230,162,60,0.14)] text-[#B7791F] dark:bg-[rgba(230,162,60,0.16)] dark:text-[#E6A23C]",
    },
  ];

  const otros = proveedores.filter((p) => !esIntrax(p.nombre));
  const guardadoFuera =
    proveedorGuardado && !esIntrax(proveedorGuardado.nombre) && !otros.some((p) => p.id === proveedorGuardado.id)
      ? proveedorGuardado
      : null;

  const ayuda =
    value.modo === "intrax"
      ? "Se registra como producto de Intrax; el catálogo solo aporta datos y precio de lista."
      : value.modo === "sin"
        ? "No se atribuye a ningún proveedor, aunque los datos vengan del catálogo."
        : value.modo === "otro"
          ? value.otroId
            ? "Una factura importada después lo actualiza con el proveedor real."
            : "Elige el contacto proveedor de la lista."
          : catalogo
            ? `Se muestra ${catalogo} porque el producto está vinculado a su catálogo.`
            : "Sin proveedor asignado por ahora.";

  return (
    <fieldset className="min-w-0" disabled={disabled}>
      <legend className={inventarioFieldLabelClass}>Proveedor</legend>
      <div role="radiogroup" className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {opciones.map((o) => {
          const activo = value.modo === o.modo;
          return (
            <label
              key={o.modo}
              className={`cot-press group relative flex min-h-[76px] cursor-pointer items-start gap-2.5 rounded-[12px] border p-3 has-[input:focus-visible]:ring-4 has-[input:focus-visible]:ring-[rgba(27,92,255,0.18)] has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-60 ${
                activo
                  ? "border-[#17235B] bg-[#F6F7FB] shadow-[0_1px_2px_rgba(9,9,11,0.06)] dark:border-[#8EA0B8] dark:bg-[#1B2539]"
                  : "border-[#E4E4E7] bg-white hover:border-[#D3D3D8] hover:bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#0F172A] dark:hover:border-[#3A4661]"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={o.modo}
                checked={activo}
                onChange={() => onChange({ modo: o.modo, otroId: o.modo === "otro" ? value.otroId : "" })}
                className="sr-only"
              />
              <span className={`inline-flex size-8 shrink-0 items-center justify-center rounded-[9px] [&_svg]:size-4 ${o.iconTone}`} aria-hidden>
                {o.icon}
              </span>
              <span className="min-w-0 pr-4">
                <span className="block truncate text-[13.5px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">{o.titulo}</span>
                <span className="mt-0.5 block text-[12px] leading-4 text-[#71717A] dark:text-[#8EA0B8]">{o.detalle}</span>
              </span>
              {activo ? (
                <span
                  className="cot-tick absolute right-2 top-2 inline-flex size-[18px] items-center justify-center rounded-full bg-[#17235B] text-white dark:bg-[#E6A23C] dark:text-[#17235B]"
                  aria-hidden
                >
                  <Check className="size-3" strokeWidth={3} />
                </span>
              ) : null}
            </label>
          );
        })}
      </div>

      {value.modo === "otro" ? (
        <div className="cot-pop mt-2.5">
          <label htmlFor={selectId} className="sr-only">
            Contacto proveedor
          </label>
          <select
            id={selectId}
            value={value.otroId}
            onChange={(e) => onChange({ modo: "otro", otroId: e.target.value })}
            className={invInputLikeClass}
          >
            <option value="">{otros.length || guardadoFuera ? "Elige un proveedor…" : "No hay proveedores en Contactos"}</option>
            {otros.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.nombre}
              </option>
            ))}
            {guardadoFuera ? <option value={String(guardadoFuera.id)}>{guardadoFuera.nombre || "Proveedor actual"}</option> : null}
          </select>
        </div>
      ) : null}

      <p key={`${value.modo}-${value.otroId ? 1 : 0}`} className="cot-fade mt-2 text-[12.5px] text-[#6E6E77] dark:text-[#8EA0B8]" aria-live="polite">
        {ayuda}
      </p>
    </fieldset>
  );
}
