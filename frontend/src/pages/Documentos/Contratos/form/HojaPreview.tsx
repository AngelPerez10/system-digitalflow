/**
 * Hoja en vivo: la primera página del contrato tal como sale en el PDF
 * (título azul, texto corrido, sin tablas), con la tipografía del sistema. Cada valor capturado se
 * vuelve a montar con `key` para que el cambio destelle (`cot-flash`).
 */
import { cn } from "@/lib/utils";
import type { ContratoFormValues } from "../shared/contratoApi";
import { formatoFecha, importeConLetra, numeroALetras } from "../shared/contratoFormato";

function V({ v, vacio = "________" }: { v: string; vacio?: string }) {
  return (
    <span key={v} className={cn("cot-flash inline font-bold", !v && "font-normal text-[#B0B0B0]")}>
      {v || vacio}
    </span>
  );
}

export default function HojaPreview({ values, folio, className }: { values: ContratoFormValues; folio?: string; className?: string }) {
  const p = values.prestador_datos;
  const precio = Number(values.precio_mensual) || 0;
  const vig = Number(values.vigencia_meses) || 0;
  const plan = Number(values.plan_mbps) > 0 ? `${values.plan_mbps} Mbps simétricos` : "";
  const importe = precio > 0 ? importeConLetra(precio) : "";
  const vigencia = vig > 0 ? `${numeroALetras(vig)} (${vig}) meses` : "";
  return (
    <div className={cn("relative", className)}>
      <div className="absolute inset-x-3 -bottom-2 top-3 rotate-[1.2deg] rounded-[4px] bg-white/70 shadow-[0_8px_24px_-16px_rgba(9,9,11,0.35)] dark:bg-white/20" aria-hidden />
      <div className="absolute inset-x-1.5 -bottom-1 top-1.5 -rotate-[0.8deg] rounded-[4px] bg-white/85 shadow-[0_8px_24px_-16px_rgba(9,9,11,0.35)] dark:bg-white/30" aria-hidden />
      <article
        aria-label="Vista previa de la primera hoja"
        className="relative aspect-[8.5/11] overflow-hidden rounded-[4px] bg-white px-[10%] pt-[8%] text-[9.5px] leading-[1.42] text-black shadow-[0_18px_40px_-20px_rgba(9,9,11,0.45)] ring-1 ring-black/5 [font-family:Geist,Outfit,system-ui,sans-serif]"
      >
        <div className="flex items-center justify-between text-[8px] text-[#444]">
          <span className="text-[9px] font-bold tracking-[0.06em] text-[#0039B2]">LOGO</span>
          <span className="text-right leading-snug">
            <b className="block text-[9.5px] text-[#0039B2]">{folio || "CTR-—"}</b>
            <V v={values.ciudad_firma} vacio="Ciudad" />
            <br />
            <V v={values.fecha_firma ? formatoFecha(values.fecha_firma) : ""} vacio="Fecha" />
          </span>
        </div>

        <p className="mt-5 text-center text-[11.5px] font-bold uppercase leading-tight text-[#0039B2]">
          Contrato de prestación de servicios de Internet Dedicado
        </p>
        <p className="mt-1 text-center text-[#444]">
          Que celebran <V v={p.razon_social} vacio="EL PRESTADOR" /> y <V v={values.cliente_razon_social} vacio="EL CLIENTE" />
        </p>
        <div className="mx-auto mb-4 mt-3 w-10 border-t-2 border-[#0039B2]" />

        <p className="text-justify">
          Contrato de prestación de servicios de Internet Dedicado que celebran, por una parte, <V v={p.razon_social} />, a quien
          se le denominará “EL PRESTADOR”; y por la otra parte, <V v={values.cliente_razon_social} />
          {values.cliente_rfc ? (
            <>
              , con RFC <V v={values.cliente_rfc.toUpperCase()} />
            </>
          ) : null}
          , a quien se le denominará “EL CLIENTE”…
        </p>
        <p className="mt-2 text-justify">
          Servicio de <V v={plan} /> en{" "}
          <V v={values.domicilio_instalacion} vacio="domicilio de instalación" />, con una contraprestación de{" "}
          <V v={importe} vacio="$________" /> mensuales más IVA, por una vigencia forzosa de{" "}
          <V v={vigencia} />.
        </p>

        <p className="mt-3 text-center text-[9.5px] font-bold uppercase tracking-[0.06em] text-[#0039B2]">Declaraciones</p>
        <div className="mt-2 space-y-[5px]" aria-hidden>
          {[100, 97, 99, 94, 98, 62, 0, 100, 96, 99, 91, 70].map((w, i) =>
            w === 0 ? (
              <div key={i} className="h-1" />
            ) : (
              <div key={i} className="h-[4px] rounded-full bg-[#ECECEC]" style={{ width: `${w}%` }} />
            ),
          )}
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent" aria-hidden />
        <div className="absolute inset-x-[10%] bottom-[4%] flex justify-between border-t border-[#BFCBE3] pt-1 text-[6.5px] text-[#666]" aria-hidden>
          <span>Contrato de prestación de servicios de Internet Dedicado</span>
          <span>Página 1</span>
        </div>
      </article>
    </div>
  );
}
