const mxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

export function formatoDinero(value: string | number | null | undefined): string {
  const n = Number(value);
  return Number.isFinite(n) ? mxn.format(n) : "—";
}

export function formatoFecha(iso: string | null | undefined, conHora = false): string {
  if (!iso) return "—";
  const d = iso.length === 10 ? new Date(`${iso}T12:00:00`) : new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(conHora ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

const UNIDADES = [
  "", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve",
  "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve",
  "veinte", "veintiuno", "veintidós", "veintitrés", "veinticuatro", "veinticinco", "veintiséis",
  "veintisiete", "veintiocho", "veintinueve",
];
const DECENAS = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
const CENTENAS = [
  "", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos",
  "seiscientos", "setecientos", "ochocientos", "novecientos",
];

function menorMil(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cien";
  const c = Math.floor(n / 100);
  const r = n % 100;
  let txt = CENTENAS[c];
  if (r) {
    const dos = r < 30 ? UNIDADES[r] : `${DECENAS[Math.floor(r / 10)]}${r % 10 ? ` y ${UNIDADES[r % 10]}` : ""}`;
    txt = txt ? `${txt} ${dos}` : dos;
  }
  return txt;
}

/** Entero a palabras en español (hasta 999,999,999). "un" antes de mil/millón. */
export function numeroALetras(entero: number): string {
  const n = Math.floor(Math.abs(entero));
  if (n === 0) return "cero";
  const millones = Math.floor(n / 1_000_000);
  const miles = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;
  const partes: string[] = [];
  const apocope = (s: string) => s.replace(/veintiuno$/, "veintiún").replace(/uno$/, "un");
  if (millones) partes.push(millones === 1 ? "un millón" : `${apocope(menorMil(millones))} millones`);
  if (miles) partes.push(miles === 1 ? "mil" : `${apocope(menorMil(miles))} mil`);
  if (resto) partes.push(menorMil(resto));
  return partes.join(" ");
}

const titulo = (s: string) =>
  s
    .split(" ")
    .map((w) => (w === "y" ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");

/** "$8,000.00 (Ocho Mil Pesos 00/100 M.N.)" — mismo formato que el PDF. */
export function importeConLetra(value: string | number): string {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return "";
  const centavos = Math.round(n * 100) % 100;
  const entero = Math.floor(Math.round(n * 100) / 100);
  return `${formatoDinero(n)} (${titulo(numeroALetras(entero))} Pesos ${String(centavos).padStart(2, "0")}/100 M.N.)`;
}

/** "hace 3 h", "hace 2 días", "en 5 días". */
export function relativo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms)) return "—";
  const rtf = new Intl.RelativeTimeFormat("es-MX", { numeric: "auto" });
  const min = Math.round(ms / 60_000);
  if (Math.abs(min) < 60) return rtf.format(min, "minute");
  const h = Math.round(min / 60);
  if (Math.abs(h) < 24) return rtf.format(h, "hour");
  const d = Math.round(h / 24);
  if (Math.abs(d) < 30) return rtf.format(d, "day");
  return formatoFecha(iso);
}

export const iniciales = (nombre: string) =>
  (nombre || "")
    .replace(/[^\p{L}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "·";
