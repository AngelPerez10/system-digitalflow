/**
 * Celdas de datos de un contacto. Todos los enlaces pasan por los
 * validadores de `clientesFormat` (`tel:`, `mailto:`) o `isGoogleMapsLink`.
 */
import { MapPin } from "lucide-react";
import { isGoogleMapsLink } from "@/components/clientes";
import type { Cliente } from "@/types/cliente";
import { contactoPrincipal, mailHref, telHref, ubicacion } from "../shared/clientesFormat";
import { emptyDash, linkClass, mutedText, strongText } from "../shared/clientesTokens";

const Dash = () => (
  <span className={emptyDash}>
    <span aria-hidden>—</span>
    <span className="sr-only">Sin dato</span>
  </span>
);

export function TelefonoCell({ telefono }: { telefono?: string }) {
  const value = String(telefono ?? "").trim();
  if (!value) return <Dash />;
  const href = telHref(value);
  return href ? (
    <a href={href} className={`whitespace-nowrap text-[13.5px] tabular-nums ${linkClass}`}>
      {value}
    </a>
  ) : (
    <span className={`text-[13.5px] tabular-nums ${strongText}`}>{value}</span>
  );
}

export function ContactoCell({ cliente }: { cliente: Cliente }) {
  const { nombre, correo } = contactoPrincipal(cliente);
  if (!nombre && !correo) return <Dash />;
  const mail = mailHref(correo);
  return (
    <div className="min-w-0 leading-tight">
      <p className={`truncate text-[13.5px] ${strongText}`} title={nombre || undefined}>
        {nombre || "Sin nombre"}
      </p>
      {correo ? (
        mail ? (
          <a href={mail} className={`mt-1 block truncate text-[12.5px] ${linkClass} font-normal`} title={correo}>
            {correo}
          </a>
        ) : (
          <p className={`mt-1 truncate text-[12.5px] ${mutedText}`} title={correo}>
            {correo}
          </p>
        )
      ) : null}
    </div>
  );
}

export function UbicacionCell({ cliente }: { cliente: Cliente }) {
  const lugar = ubicacion(cliente);
  const direccion = String(cliente.direccion ?? "").trim();
  const mapa = isGoogleMapsLink(direccion);
  if (!lugar && !direccion) return <Dash />;
  return (
    <div className="min-w-0 leading-tight">
      {lugar ? (
        <p className={`truncate text-[13.5px] ${strongText}`} title={lugar}>
          {lugar}
        </p>
      ) : null}
      {mapa ? (
        <a
          href={direccion}
          target="_blank"
          rel="noopener noreferrer"
          className={`mt-1 inline-flex items-center gap-1 text-[12.5px] ${linkClass}`}
        >
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          Ver en mapa
          <span className="sr-only"> (abre en una pestaña nueva)</span>
        </a>
      ) : direccion ? (
        <p className={`mt-1 truncate text-[12.5px] ${mutedText}`} title={direccion}>
          {direccion}
        </p>
      ) : null}
    </div>
  );
}
