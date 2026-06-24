import Label from "@/components/form/Label";
import { erpSectionLabelClass, erpSelectFieldClass, erpSubheadingClass } from "@/layout/erpPageStyles";
import type { CatalogOption } from "./facturaCfdiFormTypes";
import { FacturaCfdiBadge, FacturaNeutralBadge, facturaHintClass } from "./facturaTabUi";

const SICAR_SERIE_FIJA = "IMA";

const shellClass =
  "overflow-hidden rounded-2xl border border-[#e7ded0] bg-[#fcfaf6] dark:border-[#334155] dark:bg-[#0f172a]/90";

type Props = {
  proximoFolioLabel: string | null;
  formaPago: string;
  metodoPago: string;
  formaPagoClave: string;
  metodoPagoClave: string;
  formaPagoOpts: CatalogOption[];
  metodoPagoOpts: CatalogOption[];
  onFormaPagoChange: (value: string) => void;
  onMetodoPagoChange: (value: string) => void;
};

type ClaveTone = "primary" | "neutral";

function ClaveBadge({ clave, tone }: { clave: string; tone: ClaveTone }) {
  const toneClass =
    tone === "primary"
      ? "border-[#ff801f]/30 bg-[#ff801f]/12 text-[#c2410c] dark:border-[#fb923c]/35 dark:bg-[#ff801f]/15 dark:text-[#fb923c]"
      : "border-[#e7ded0] bg-[#fffdfa] text-[#57534e] dark:border-[#334155] dark:bg-[#111827] dark:text-[#cbd5e1]";

  return (
    <span
      className={`inline-flex shrink-0 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums ${toneClass}`}
    >
      {clave}
    </span>
  );
}

type PagoFieldProps = {
  id: string;
  hintId: string;
  label: string;
  clave: string;
  claveTone: ClaveTone;
  value: string;
  options: CatalogOption[];
  hint: string;
  onChange: (value: string) => void;
};

function PagoField({ id, hintId, label, clave, claveTone, value, options, hint, onChange }: PagoFieldProps) {
  return (
    <div className="min-w-0">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={id} className="!mb-0 text-sm font-medium text-[#1c1917] dark:text-[#f8fafc]">
          {label}
        </Label>
        <ClaveBadge clave={clave} tone={claveTone} />
      </div>
      <select
        id={id}
        className={erpSelectFieldClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={hintId}
      >
        {options.map((o) => (
          <option key={o.clave} value={o.label}>
            {o.label}
          </option>
        ))}
      </select>
      <p id={hintId} className={`mt-2 ${facturaHintClass}`}>
        {hint}
      </p>
    </div>
  );
}

export default function ComprobanteFiscalTab({
  proximoFolioLabel,
  formaPago,
  metodoPago,
  formaPagoClave,
  metodoPagoClave,
  formaPagoOpts,
  metodoPagoOpts,
  onFormaPagoChange,
  onMetodoPagoChange,
}: Props) {
  const folioDisplay = proximoFolioLabel ?? `${SICAR_SERIE_FIJA}-—`;

  return (
    <section className={shellClass} aria-labelledby="comprobante-fiscal-heading">
      <div className="relative border-b border-[#e7ded0]/90 bg-[#fffdfa]/70 px-4 py-4 dark:border-[#334155] dark:bg-[#111827]/55 sm:px-5 sm:py-5">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ff801f]/45 to-transparent"
          aria-hidden
        />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p id="comprobante-fiscal-heading" className={erpSectionLabelClass}>
              Comprobante fiscal
            </p>
            <p className="mt-1 font-mono text-[clamp(1.5rem,3.5vw,2.1rem)] font-semibold leading-none tracking-tight text-[#1c1917] dark:text-[#f8fafc]">
              {folioDisplay}
            </p>
            <p className={`mt-2 ${facturaHintClass}`}>
              Serie <span className="font-mono font-medium text-[#1c1917] dark:text-[#f8fafc]">{SICAR_SERIE_FIJA}</span>
              {" · "}
              folio automático al timbrar
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <FacturaCfdiBadge>CFDI 4.0</FacturaCfdiBadge>
            <FacturaNeutralBadge>Ingreso</FacturaNeutralBadge>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 sm:px-5 sm:py-5" aria-labelledby="comprobante-condiciones-pago">
        <p className={erpSectionLabelClass}>Catálogos SAT</p>
        <h4 id="comprobante-condiciones-pago" className={`mt-0.5 ${erpSubheadingClass}`}>
          Condiciones de pago
        </h4>

        <div className="mt-5 grid gap-5 border-t border-[#e7ded0]/70 pt-5 dark:border-white/[0.06] sm:grid-cols-2">
          <PagoField
            id="factura-forma-pago"
            hintId="factura-forma-pago-hint"
            label="Forma de pago"
            clave={formaPagoClave}
            claveTone="primary"
            value={formaPago}
            options={formaPagoOpts}
            hint="Medio con el que se liquida el comprobante ante el SAT."
            onChange={onFormaPagoChange}
          />
          <PagoField
            id="factura-metodo-pago"
            hintId="factura-metodo-pago-hint"
            label="Método de pago"
            clave={metodoPagoClave}
            claveTone="neutral"
            value={metodoPago}
            options={metodoPagoOpts}
            hint="PUE = una exhibición · PPD = parcialidades o diferido."
            onChange={onMetodoPagoChange}
          />
        </div>
      </div>
    </section>
  );
}
