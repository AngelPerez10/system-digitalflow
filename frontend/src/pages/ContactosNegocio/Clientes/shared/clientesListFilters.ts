import type { ClienteTipo } from "@/components/clientes/clienteFormShared";
import { TIPO_OPTIONS } from "@/components/clientes/clienteFormShared";

const TIPO_SET = new Set<string>(TIPO_OPTIONS.map((o) => o.value));

export function isClienteTipo(value: string): value is ClienteTipo {
  return TIPO_SET.has(value);
}

/** Lee `tipo` de la query (`EMPRESA` o `EMPRESA,PROVEEDOR`). */
export function parseFilterTipos(params: URLSearchParams): ClienteTipo[] {
  const values = params.getAll("tipo").flatMap((v) => v.split(","));
  const seen = new Set<ClienteTipo>();
  const out: ClienteTipo[] = [];
  for (const raw of values) {
    const tipo = raw.trim();
    if (!isClienteTipo(tipo) || seen.has(tipo)) continue;
    seen.add(tipo);
    out.push(tipo);
  }
  return out;
}

export function tiposQueryValue(tipos: ClienteTipo[]): string | null {
  if (tipos.length === 0 || tipos.length >= TIPO_OPTIONS.length) return null;
  return tipos.join(",");
}

export function activeTipoFilterCount(tipos: ClienteTipo[]): number {
  if (tipos.length === 0 || tipos.length >= TIPO_OPTIONS.length) return 0;
  return tipos.length;
}
