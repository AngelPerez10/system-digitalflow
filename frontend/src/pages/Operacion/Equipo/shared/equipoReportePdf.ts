/**
 * PDF del reporte mensual de Equipo (jsPDF + autotable): informe ejecutivo de
 * estilo corporativo, pensado para IMPRIMIRSE EN BLANCO Y NEGRO (carta, vertical).
 *
 *  - Tipografía: Times para títulos y cifras, Helvetica para el cuerpo.
 *  - Ningún dato depende del color: los estados se distinguen por forma
 *    (etiqueta rellena / con borde / con borde punteado) y las series por
 *    luminosidad. Fondos blancos, reglas y bordes oscuros (poca tinta).
 *
 * Estructura: portada con ficha del documento y contenido · 1. Resumen
 * ejecutivo (hallazgos clave, indicadores, estado y tipo, actividad semanal) ·
 * 2. Desempeño por técnico (carga y tabla con totales) · 3. Detalle semanal
 * (lunes a domingo: días, órdenes, proyectos y reasignaciones). Encabezado y pie
 * corridos con folio y «Página x de y». Las librerías se cargan al pedir el reporte.
 */
import { MESES_LARGOS, describirMovimiento, diaCorto, type ReporteFila, type ReporteMes } from "./equipoReporteMes";

type RGB = [number, number, number];

const NAVY: RGB = [23, 35, 91];
const INK: RGB = [17, 17, 20];
const BODY: RGB = [39, 39, 45];
const MUTED: RGB = [82, 82, 91];
const RULE: RGB = [176, 176, 184];
const TRACK: RGB = [222, 222, 226];
const WHITE: RGB = [255, 255, 255];
const GREEN_D: RGB = [8, 92, 64];
const AMBER_D: RGB = [150, 92, 8];
const AMBER_L: RGB = [250, 212, 138];
const RED_D: RGB = [150, 25, 25];
const RED_M: RGB = [196, 96, 96];
const TEAL_D: RGB = [10, 88, 82];
const PINK_L: RGB = [246, 166, 208];
const PINK_D: RGB = [150, 22, 84];

const W = 612;
const H = 792;
const M = 48;
const CW = W - M * 2; // 516
const TOP = 66;
const BOTTOM = 736;

/** rojo → ámbar → verde (oscuros) según el avance 0–1, como la barra del técnico en el tablero. */
function avanceRgb(avance: number): RGB {
  const h = (4 + avance * 141) / 360;
  const a = 0.75 * 0.3;
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    return Math.round(255 * (0.3 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return [f(0), f(8), f(4)];
}

const pct = (v: number) => `${Math.round(v * 100)}%`;
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
const iniciales = (n: string) => {
  const p = n.trim().split(/\s+/).filter(Boolean);
  return (p.length === 1 ? p[0].slice(0, 2) : `${p[0][0]}${p[p.length - 1][0]}`).toUpperCase();
};
const fmtHora = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
const ymdDe = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

type Pill = { fg: RGB; bg: RGB; border: RGB; dashed?: boolean };
/** Completado = relleno oscuro · abierto = contorno · cancelado = contorno punteado. */
function estadoPill(f: ReporteFila): Pill {
  if (f.cancelado) return { fg: RED_D, bg: WHITE, border: RED_D, dashed: true };
  if (f.cerrado) return { fg: WHITE, bg: GREEN_D, border: GREEN_D };
  return { fg: INK, bg: [253, 236, 196], border: AMBER_D };
}

/** Hallazgos clave redactados a partir de los datos del mes. */
function hallazgos(data: ReporteMes): { lead: string; texto: string }[] {
  const { resumen } = data;
  const total = resumen.ordenes + resumen.proyectos;
  const out: { lead: string; texto: string }[] = [];
  if (total === 0) return [{ lead: "Sin actividad.", texto: "No se registraron órdenes ni proyectos programados en el mes." }];
  out.push({
    lead: "Cumplimiento.",
    texto: `De ${plural(total, "trabajo", "trabajos")} programados, ${resumen.completados} se completaron (${pct(resumen.avance)} de avance sobre los no cancelados) y ${resumen.abiertos} siguen abiertos${resumen.cancelados ? `; ${plural(resumen.cancelados, "se canceló", "se cancelaron")}` : ""}.`,
  });
  const pico = [...data.semanas].sort((a, b) => b.ordenes + b.proyectos - (a.ordenes + a.proyectos))[0];
  if (pico && pico.ordenes + pico.proyectos > 0)
    out.push({ lead: "Semana de mayor actividad.", texto: `La semana ${pico.n} (${pico.rango}) concentró ${plural(pico.ordenes + pico.proyectos, "trabajo", "trabajos")}: ${plural(pico.ordenes, "orden", "órdenes")} y ${plural(pico.proyectos, "proyecto", "proyectos")}.` });
  const asignados = data.tecnicos.filter((t) => t.nombre !== "Sin asignar");
  if (asignados[0])
    out.push({ lead: "Mayor carga.", texto: `${asignados[0].nombre} atendió ${plural(asignados[0].total, "trabajo", "trabajos")} (${pct(asignados[0].avance)} completado), la mayor carga del equipo de ${plural(asignados.length, "persona", "personas")}.` });
  const sin = data.tecnicos.find((t) => t.nombre === "Sin asignar");
  if (sin && sin.total > 0) out.push({ lead: "Atención.", texto: `${plural(sin.total, "trabajo quedó", "trabajos quedaron")} sin técnico asignado (${plural(sin.abiertos, "abierto", "abiertos")}).` });
  const proy = data.proyectos.filter((p) => !p.cancelado);
  if (proy.length) {
    const prom = proy.reduce((a, p) => a + (p.avance ?? 0), 0) / proy.length;
    out.push({ lead: "Proyectos.", texto: `${plural(proy.length, "proyecto activo o cerrado", "proyectos activos o cerrados")} con un avance promedio de ${pct(prom)}.` });
  }
  const deshacer = data.historial.filter((h) => h.accion === "deshacer").length;
  out.push({ lead: "Reasignaciones.", texto: resumen.reasignaciones ? `Se registraron ${plural(resumen.reasignaciones, "movimiento", "movimientos")} en el tablero${deshacer ? `, ${deshacer} de ellos para deshacer un cambio` : ""}.` : "No hubo reasignaciones en el tablero durante el mes." });
  return out;
}

/** Arma el documento (sin descargarlo). */
export async function crearReporteMesPdf(data: ReporteMes) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const { resumen } = data;
  const totalTrabajos = resumen.ordenes + resumen.proyectos;
  const ahora = new Date();
  const generado = ahora.toLocaleString("es-MX", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const folioDoc = `RME-${data.mes}`;
  const [anio, mesNum] = data.mes.split("-").map(Number);
  const ultimo = new Date(anio, mesNum, 0).getDate();
  const mesNombre = (MESES_LARGOS[mesNum - 1] ?? "").toLowerCase();

  /* ---------- utilidades de dibujo ---------- */
  const fill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
  const stroke = (c: RGB) => doc.setDrawColor(c[0], c[1], c[2]);
  const ink = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
  const font = (weight: "normal" | "bold", size: number, color: RGB, familia: "helvetica" | "times" = "helvetica") => {
    doc.setFont(familia, weight);
    doc.setFontSize(size);
    ink(color);
  };
  const serif = (size: number, color: RGB = INK) => font("bold", size, color, "times");
  const card = (x: number, y: number, w: number, h: number, r = 4) => {
    fill(WHITE);
    stroke(RULE);
    doc.setLineWidth(0.9);
    doc.roundedRect(x, y, w, h, r, r, "FD");
  };
  const arco = (cx: number, cy: number, r: number, a0: number, a1: number, grosor: number, color: RGB) => {
    stroke(color);
    doc.setLineWidth(grosor);
    doc.setLineCap("round");
    const pasos = Math.max(2, Math.ceil(((a1 - a0) / (Math.PI * 2)) * 72));
    let px = cx + r * Math.sin(a0);
    let py = cy - r * Math.cos(a0);
    for (let i = 1; i <= pasos; i++) {
      const a = a0 + ((a1 - a0) * i) / pasos;
      const x = cx + r * Math.sin(a);
      const y = cy - r * Math.cos(a);
      doc.line(px, py, x, y);
      px = x;
      py = y;
    }
    doc.setLineCap("butt");
  };
  /** Encabezado de sección numerado: «1  Resumen ejecutivo» + regla. */
  const encabezado = (num: string, texto: string, sub: string) => {
    serif(24, MUTED);
    doc.text(num, M, TOP + 16);
    serif(24, INK);
    doc.text(texto, M + 30, TOP + 16);
    stroke(NAVY);
    doc.setLineWidth(1.4);
    doc.line(M, TOP + 26, W - M, TOP + 26);
    font("normal", 9.5, MUTED);
    doc.text(sub, M, TOP + 42);
  };
  const titulo = (texto: string, nota: string | null, y: number, size = 10.5) => {
    serif(size + 1, NAVY);
    doc.text(texto, M, y);
    stroke(RULE);
    doc.setLineWidth(0.6);
    doc.line(M, y + 4, W - M, y + 4);
    if (nota) {
      font("normal", 8, MUTED);
      doc.text(nota, W - M, y, { align: "right" });
    }
  };
  const leyendaFigura = (texto: string, y: number) => {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.4);
    ink(MUTED);
    doc.text(texto, M, y);
  };
  const seg = (x: number, y: number, w: number, h: number, c: RGB, borde: RGB = INK) => {
    fill(c);
    stroke(borde);
    doc.setLineWidth(0.5);
    doc.roundedRect(x, y, w, h, h / 2, h / 2, "FD");
  };
  const pill = (x: number, y: number, h: number, texto: string, p: Pill) => {
    font("bold", 6.6, p.fg);
    const w = doc.getTextWidth(texto) + 12;
    fill(p.bg);
    stroke(p.border);
    doc.setLineWidth(0.9);
    if (p.dashed) doc.setLineDashPattern([1.6, 1.4], 0);
    doc.roundedRect(x, y + h / 2 - 7, w, 14, 7, 7, "FD");
    if (p.dashed) doc.setLineDashPattern([], 0);
    font("bold", 6.6, p.fg);
    doc.text(texto, x + 6, y + h / 2 + 2.3);
  };
  const barra = (x: number, y: number, w: number, partes: { v: number; c: RGB; borde?: RGB }[]) => {
    const total = partes.reduce((a, p) => a + p.v, 0);
    fill(TRACK);
    doc.roundedRect(x, y, w, 10, 5, 5, "F");
    if (total <= 0) return;
    let px = x;
    partes.forEach((p) => {
      const pw = (p.v / total) * w;
      if (pw <= 0) return;
      seg(px, y, pw, 10, p.c, p.borde ?? INK);
      px += pw;
    });
  };
  const leyenda = (x: number, y: number, items: { label: string; v: number; c: RGB; borde?: RGB }[]) => {
    let lx = x;
    for (const it of items) {
      seg(lx, y - 7, 9, 9, it.c, it.borde ?? INK);
      font("normal", 7.8, BODY);
      const t = `${it.label}: ${it.v}`;
      doc.text(t, lx + 13, y);
      lx += doc.getTextWidth(t) + 30;
    }
  };

  /* ---------- páginas ---------- */
  const etiquetaPagina = new Map<number, string>();
  const toc: { num: string; texto: string; sub: string; pagina: number; nivel: 0 | 1 }[] = [];
  let seccion = "Resumen ejecutivo";
  const paginaActual = () => doc.getCurrentPageInfo().pageNumber;
  const nuevaPagina = (etiqueta: string) => {
    doc.addPage();
    seccion = etiqueta;
    etiquetaPagina.set(paginaActual(), etiqueta);
  };
  let endY = TOP;

  /* ==================================================================== */
  /* PORTADA                                                               */
  /* ==================================================================== */
  fill(NAVY);
  doc.rect(0, 0, W, 12, "F");
  font("bold", 9, NAVY);
  doc.text("GRUPO INTRAX GPS", 64, 70, { charSpace: 2 });
  font("normal", 9, MUTED);
  doc.text("Dirección de Operación  ·  Tablero de Equipo", 64, 84);
  stroke(RULE);
  doc.setLineWidth(0.6);
  doc.line(64, 96, W - 64, 96);

  serif(40, INK);
  doc.text("Reporte mensual", 64, 190);
  doc.text("de Equipo", 64, 234);
  fill(NAVY);
  doc.rect(64, 254, 64, 3, "F");
  font("normal", 22, NAVY, "times");
  doc.text(data.etiqueta, 64, 292);
  font("normal", 11, MUTED);
  doc.text("Trabajos programados, avance por técnico e historial de reasignaciones", 64, 314);

  // Ficha del documento
  const ficha: [string, string][] = [
    ["Periodo", `1 al ${ultimo} de ${mesNombre} de ${anio}`],
    ["Documento", folioDoc],
    ["Alcance", "Órdenes de trabajo y proyectos programados, por semana (lunes a domingo)"],
    ["Fecha de emisión", generado],
    ["Clasificación", "Uso interno"],
  ];
  const fy = 350;
  stroke(NAVY);
  doc.setLineWidth(1.2);
  doc.line(64, fy, W - 64, fy);
  ficha.forEach(([k, v], i) => {
    const y = fy + 20 + i * 20;
    font("bold", 8, MUTED);
    doc.text(k.toUpperCase(), 64, y, { charSpace: 0.6 });
    font("normal", 9.5, INK);
    doc.text(v, 190, y, { maxWidth: W - 64 - 190 });
    stroke(RULE);
    doc.setLineWidth(0.5);
    doc.line(64, y + 7, W - 64, y + 7);
  });

  /* ==================================================================== */
  /* 1. RESUMEN EJECUTIVO                                                  */
  /* ==================================================================== */
  nuevaPagina("1. Resumen ejecutivo");
  toc.push({ num: "1", texto: "Resumen ejecutivo", sub: "Hallazgos, indicadores y actividad del mes", pagina: paginaActual(), nivel: 0 });
  encabezado("1", "Resumen ejecutivo", `${data.etiqueta}  ·  ${plural(totalTrabajos, "trabajo", "trabajos")} en ${plural(data.semanas.length, "semana", "semanas")}`);

  // Hallazgos clave
  let hy = TOP + 68;
  titulo("Hallazgos clave", null, hy);
  hy += 18;
  hallazgos(data).forEach((h, i) => {
    fill(NAVY);
    doc.circle(M + 6, hy - 2.5, 6, "F");
    font("bold", 7, WHITE);
    doc.text(String(i + 1), M + 6, hy - 0.2, { align: "center" });
    font("bold", 9, INK);
    doc.text(h.lead, M + 20, hy);
    const lw = doc.getTextWidth(`${h.lead} `);
    font("normal", 9, BODY);
    const lineas = doc.splitTextToSize(h.texto, CW - 20 - lw) as string[];
    doc.text(lineas[0] ?? "", M + 20 + lw, hy);
    let extra = 0;
    if (lineas.length > 1) {
      const resto = doc.splitTextToSize(lineas.slice(1).join(" "), CW - 20) as string[];
      resto.forEach((l, j) => doc.text(l, M + 20, hy + 12 * (j + 1)));
      extra = resto.length * 12;
    }
    hy += 17 + extra;
  });

  // Indicadores
  const kpis: { label: string; valor: string; nota: string }[] = [
    { label: "Trabajos del mes", valor: String(totalTrabajos), nota: `${resumen.ordenes} órdenes · ${resumen.proyectos} proyectos` },
    { label: "Completados", valor: String(resumen.completados), nota: `${pct(resumen.avance)} de avance` },
    { label: "Abiertos", valor: String(resumen.abiertos), nota: resumen.cancelados ? plural(resumen.cancelados, "cancelado", "cancelados") : "sin cancelados" },
    { label: "Reasignaciones", valor: String(resumen.reasignaciones), nota: "movimientos en el tablero" },
  ];
  const kw = (CW - 3 * 10) / 4;
  const ky = hy + 8;
  kpis.forEach((k, i) => {
    const x = M + i * (kw + 10);
    card(x, ky, kw, 70);
    fill(NAVY);
    doc.rect(x, ky, kw, 3, "F");
    font("bold", 6.8, MUTED);
    doc.text(k.label.toUpperCase(), x + 12, ky + 21, { charSpace: 0.6 });
    serif(27, INK);
    doc.text(k.valor, x + 12, ky + 50);
    font("normal", 7, MUTED);
    doc.text(k.nota, x + 12, ky + 63);
  });

  // Estado y tipo
  const ey = ky + 70 + 24;
  titulo("Estado y tipo de trabajo", "Figura 1", ey);
  const bh = 112;
  card(M, ey + 12, CW, bh);
  const cx = M + 56;
  const cy = ey + 12 + bh / 2;
  arco(cx, cy, 30, 0, Math.PI * 2 - 0.001, 8, TRACK);
  if (resumen.avance > 0) arco(cx, cy, 30, 0, Math.max(0.05, resumen.avance * Math.PI * 2), 8, avanceRgb(resumen.avance));
  serif(16, INK);
  doc.text(pct(resumen.avance), cx, cy + 5, { align: "center" });
  font("normal", 6.6, MUTED);
  doc.text("AVANCE", cx, cy + 16, { align: "center", charSpace: 0.5 });
  const bx = M + 116;
  const bw = CW - 116 - 20;
  font("bold", 7.2, MUTED);
  doc.text("POR ESTADO", bx, ey + 12 + 22, { charSpace: 0.6 });
  barra(bx, ey + 12 + 28, bw, [{ v: resumen.completados, c: GREEN_D }, { v: resumen.abiertos, c: AMBER_L, borde: AMBER_D }, { v: resumen.cancelados, c: RED_M, borde: RED_D }]);
  leyenda(bx, ey + 12 + 54, [
    { label: "Completados", v: resumen.completados, c: GREEN_D },
    { label: "Abiertos", v: resumen.abiertos, c: AMBER_L, borde: AMBER_D },
    { label: "Cancelados", v: resumen.cancelados, c: RED_M, borde: RED_D },
  ]);
  font("bold", 7.2, MUTED);
  doc.text("POR TIPO", bx, ey + 12 + 74, { charSpace: 0.6 });
  barra(bx, ey + 12 + 80, bw, [{ v: resumen.ordenes, c: TEAL_D }, { v: resumen.proyectos, c: PINK_L, borde: PINK_D }]);
  leyenda(bx, ey + 12 + 98, [
    { label: "Órdenes", v: resumen.ordenes, c: TEAL_D },
    { label: "Proyectos", v: resumen.proyectos, c: PINK_L, borde: PINK_D },
  ]);

  // Actividad por semana
  const wy = ey + 12 + bh + 26;
  titulo("Actividad por semana", "Figura 2", wy);
  const ch = 132;
  card(M, wy + 12, CW, ch);
  const maxSem = Math.max(1, ...data.semanas.map((s) => Math.max(s.ordenes, s.proyectos)));
  const area = { x: M + 26, y: wy + 12 + 26, w: CW - 52, h: ch - 66 };
  stroke(RULE);
  doc.setLineWidth(0.5);
  for (let g = 0; g <= 2; g++) {
    const gy = area.y + area.h - (area.h * g) / 2;
    doc.line(area.x, gy, area.x + area.w, gy);
    font("normal", 6.5, MUTED);
    doc.text(String(Math.round((maxSem * g) / 2)), area.x - 6, gy + 2, { align: "right" });
  }
  const colW = area.w / data.semanas.length;
  data.semanas.forEach((s, i) => {
    const gx = area.x + i * colW + colW / 2;
    const bwid = Math.min(18, colW / 3.2);
    const dibujar = (v: number, dx: number, c: RGB, borde: RGB) => {
      const alto = (v / maxSem) * area.h;
      if (v > 0) {
        fill(c);
        stroke(borde);
        doc.setLineWidth(0.6);
        doc.rect(gx + dx, area.y + area.h - alto, bwid, alto, "FD");
      }
      font("bold", 7, INK);
      doc.text(String(v), gx + dx + bwid / 2, area.y + area.h - alto - 3, { align: "center" });
    };
    dibujar(s.ordenes, -bwid - 1.5, TEAL_D, INK);
    dibujar(s.proyectos, 1.5, PINK_L, PINK_D);
    font("bold", 7.2, NAVY);
    doc.text(`Semana ${s.n}`, gx, area.y + area.h + 13, { align: "center" });
    font("normal", 6.5, MUTED);
    doc.text(s.rango.replace(/ 20\d\d$/, ""), gx, area.y + area.h + 22, { align: "center" });
  });
  leyenda(M + CW - 190, wy + 12 + 16, [
    { label: "Órdenes", v: resumen.ordenes, c: TEAL_D },
    { label: "Proyectos", v: resumen.proyectos, c: PINK_L, borde: PINK_D },
  ]);

  /* ==================================================================== */
  /* 2. DESEMPEÑO POR TÉCNICO                                              */
  /* ==================================================================== */
  nuevaPagina("2. Desempeño por técnico");
  toc.push({ num: "2", texto: "Desempeño por técnico", sub: `${plural(data.tecnicos.length, "persona", "personas")} con trabajo en el mes`, pagina: paginaActual(), nivel: 0 });
  encabezado("2", "Desempeño por técnico", "Carga, trabajos completados y avance de cada persona del equipo");

  const top = data.tecnicos.slice(0, 8);
  let ty = TOP + 68;
  titulo("Carga por técnico", "Figura 3", ty);
  const rh = 20;
  const ah = Math.max(1, top.length) * rh + 30;
  card(M, ty + 12, CW, ah);
  const maxTec = Math.max(1, ...top.map((t) => t.total));
  top.forEach((t, i) => {
    const ry = ty + 12 + 16 + i * rh;
    font("bold", 8, INK);
    doc.text(t.nombre.length > 24 ? `${t.nombre.slice(0, 23)}...` : t.nombre, M + 14, ry + 4);
    const bx0 = M + 150;
    const bmax = CW - 150 - 64;
    fill(TRACK);
    doc.roundedRect(bx0, ry - 3, bmax, 8, 4, 4, "F");
    const total = (t.total / maxTec) * bmax;
    const done = t.total ? (t.completados / t.total) * total : 0;
    seg(bx0, ry - 3, Math.max(8, total), 8, AMBER_L, AMBER_D);
    if (done > 0) seg(bx0, ry - 3, Math.max(8, done), 8, GREEN_D, INK);
    font("bold", 8, INK);
    doc.text(String(t.total), bx0 + bmax + 10, ry + 4);
    font("normal", 7, MUTED);
    doc.text(pct(t.avance), W - M - 12, ry + 4, { align: "right" });
  });
  leyenda(M + 14, ty + 12 + ah - 9, [
    { label: "Completados", v: top.reduce((a, t) => a + t.completados, 0), c: GREEN_D },
    { label: "Abiertos", v: top.reduce((a, t) => a + t.abiertos, 0), c: AMBER_L, borde: AMBER_D },
  ]);
  ty += 12 + ah + 8;
  if (data.tecnicos.length > top.length) leyendaFigura(`Se muestran los ${top.length} técnicos con mayor carga; la tabla incluye a todo el equipo.`, ty + 4);
  endY = ty + 10;

  const base = {
    theme: "plain" as const,
    margin: { left: M, right: M, top: TOP, bottom: H - BOTTOM },
    styles: { font: "helvetica", fontSize: 7.8, textColor: BODY, cellPadding: { top: 6, bottom: 6, left: 7, right: 7 }, lineColor: RULE, lineWidth: { bottom: 0.6 }, overflow: "linebreak" as const, valign: "middle" as const },
    headStyles: { textColor: INK, fontStyle: "bold" as const, fontSize: 6.8, lineColor: NAVY, lineWidth: { bottom: 1.2 }, cellPadding: { top: 6, bottom: 6, left: 7, right: 7 } },
    willDrawPage: () => {
      if (!etiquetaPagina.has(paginaActual())) etiquetaPagina.set(paginaActual(), seccion);
    },
    didDrawPage: (d: { cursor?: { y: number } | null }) => {
      if (d.cursor) endY = d.cursor.y;
    },
  };
  const vacio = (y: number, texto: string) => {
    card(M, y, CW, 40);
    font("normal", 9, MUTED);
    doc.text(texto, M + CW / 2, y + 24, { align: "center" });
    endY = y + 40;
  };

  titulo("Detalle por técnico", "Tabla 1", endY + 14);
  if (!data.tecnicos.length) vacio(endY + 26, "Sin trabajos registrados este mes.");
  else {
    const sum = (f: (t: (typeof data.tecnicos)[number]) => number) => data.tecnicos.reduce((a, t) => a + f(t), 0);
    autoTable(doc, {
      ...base,
      startY: endY + 26,
      head: [["TÉCNICO", "ÓRDENES", "PROYECTOS", "TOTAL", "COMPLETADOS", "ABIERTOS", "AVANCE"]],
      body: data.tecnicos.map((t) => [t.nombre, t.ordenes, t.proyectos, t.total, t.completados, t.abiertos, pct(t.avance)]),
      foot: [["Total del equipo", sum((t) => t.ordenes), sum((t) => t.proyectos), sum((t) => t.total), sum((t) => t.completados), sum((t) => t.abiertos), pct(resumen.avance)]],
      showFoot: "lastPage",
      footStyles: { fontStyle: "bold", textColor: INK, fontSize: 8, lineColor: NAVY, lineWidth: { top: 1.2, bottom: 0 } },
      columnStyles: {
        0: { cellWidth: 146, fontStyle: "bold", textColor: INK, cellPadding: { top: 8, bottom: 8, left: 34, right: 7 } },
        1: { cellWidth: 54, halign: "center" },
        2: { cellWidth: 58, halign: "center" },
        3: { cellWidth: 46, halign: "center", fontStyle: "bold", textColor: INK },
        4: { cellWidth: 70, halign: "center", fontStyle: "bold", textColor: INK },
        5: { cellWidth: 54, halign: "center", fontStyle: "bold", textColor: INK },
        6: { cellWidth: 88 },
      },
      didParseCell: (h) => {
        if (h.section === "foot") h.cell.styles.halign = h.column.index >= 1 && h.column.index <= 5 ? "center" : "left";
      },
      didDrawCell: (h) => {
        if (h.section !== "body") return;
        const t = data.tecnicos[h.row.index];
        if (!t) return; // fila residual de un salto de página (índice -1)
        if (h.column.index === 0) {
          const sin = t.nombre === "Sin asignar";
          fill(WHITE);
          stroke(sin ? RULE : NAVY);
          doc.setLineWidth(0.9);
          doc.circle(h.cell.x + 17, h.cell.y + h.cell.height / 2, 9.5, "FD");
          font("bold", 6.8, sin ? MUTED : NAVY);
          doc.text(sin ? "?" : iniciales(t.nombre), h.cell.x + 17, h.cell.y + h.cell.height / 2 + 2.4, { align: "center" });
        }
        if (h.column.index === 6) {
          const bx1 = h.cell.x + 36;
          const bw1 = h.cell.width - 46;
          const by = h.cell.y + h.cell.height / 2 - 3;
          fill(TRACK);
          doc.roundedRect(bx1, by, bw1, 6, 3, 3, "F");
          if (t.avance > 0) seg(bx1, by, Math.max(6, bw1 * t.avance), 6, avanceRgb(t.avance), INK);
        }
      },
    });
  }

  /* ==================================================================== */
  /* 3. DETALLE SEMANAL                                                    */
  /* ==================================================================== */
  const sub = (texto: string, nota: string) => {
    let y = endY + 22;
    if (y > BOTTOM - 80) {
      nuevaPagina(seccion);
      y = TOP + 6;
    }
    titulo(texto, nota, y, 9.5);
    return y + 8;
  };
  const DIAS = ["L", "M", "M", "J", "V", "S", "D"];

  data.semanas.forEach((w, wi) => {
    nuevaPagina(`3.${w.n} Semana ${w.n}  ·  ${w.rango}`);
    if (wi === 0) toc.push({ num: "3", texto: "Detalle semanal", sub: "Una sección por semana, de lunes a domingo", pagina: paginaActual(), nivel: 0 });
    toc.push({ num: `3.${w.n}`, texto: `Semana ${w.n}`, sub: `${w.rango}  ·  ${plural(w.ordenes + w.proyectos, "trabajo", "trabajos")}`, pagina: paginaActual(), nivel: 1 });
    const ordenes = w.filas.filter((f) => f.tipo === "orden");
    const proyectos = w.filas.filter((f) => f.tipo === "proyecto");

    // Cabecera de la semana
    const by = TOP - 6;
    fill(NAVY);
    doc.rect(M, by, CW, 3, "F");
    font("bold", 7.5, MUTED);
    doc.text(`3.${w.n}  ·  SEMANA ${w.n}  ·  LUNES A DOMINGO`, M, by + 20, { charSpace: 1 });
    serif(20, INK);
    doc.text(w.rango, M, by + 45);
    const stats: [number, string][] = [[w.ordenes, "órdenes"], [w.proyectos, "proyectos"], [w.completados, "completados"], [w.historial.length, "movimientos"]];
    let sx = W - M;
    for (const [v, l] of [...stats].reverse()) {
      font("normal", 7, MUTED);
      const lw = doc.getTextWidth(l);
      doc.text(l, sx, by + 45, { align: "right" });
      serif(17, INK);
      doc.text(String(v), sx - lw / 2, by + 28, { align: "center" });
      sx -= Math.max(lw, 22) + 18;
    }
    stroke(RULE);
    doc.setLineWidth(0.6);
    doc.line(M, by + 54, W - M, by + 54);

    // Tira de los siete días
    const sy = by + 54 + 12;
    const dw = (CW - 6 * 6) / 7;
    const nombres = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];
    for (let i = 0; i < 7; i++) {
      const d = new Date(`${w.lunes}T12:00:00`);
      d.setDate(d.getDate() + i);
      const ymd = ymdDe(d);
      const fuera = ymd.slice(0, 7) !== data.mes;
      const n = w.filas.filter((f) => f.dias.includes(ymd)).length;
      const x = M + i * (dw + 6);
      fill(WHITE);
      stroke(n > 0 && !fuera ? NAVY : RULE);
      doc.setLineWidth(n > 0 && !fuera ? 1.4 : 0.7);
      if (fuera) doc.setLineDashPattern([2, 2], 0);
      doc.roundedRect(x, sy, dw, 46, 4, 4, "FD");
      doc.setLineDashPattern([], 0);
      font("bold", 6.5, fuera ? RULE : MUTED);
      doc.text(nombres[i], x + dw / 2, sy + 13, { align: "center", charSpace: 0.6 });
      serif(14, fuera ? RULE : INK);
      doc.text(String(d.getDate()), x + dw / 2, sy + 29, { align: "center" });
      if (!fuera) {
        if (n > 0) {
          fill(NAVY);
          doc.roundedRect(x + dw / 2 - 12, sy + 34, 24, 8, 4, 4, "F");
          font("bold", 6, WHITE);
          doc.text(`${n}`, x + dw / 2, sy + 40, { align: "center" });
        } else {
          font("normal", 6.5, MUTED);
          doc.text("-", x + dw / 2, sy + 40, { align: "center" });
        }
      }
    }
    endY = sy + 46;

    // Órdenes de trabajo
    let y = sub("Órdenes de trabajo", `${plural(ordenes.length, "orden", "órdenes")}`);
    if (!ordenes.length) vacio(y, "Sin órdenes de trabajo esta semana.");
    else
      autoTable(doc, {
        ...base,
        startY: y,
        head: [["DÍA", "FOLIO", "CLIENTE", "SERVICIO", "TÉCNICO", "ESTADO"]],
        body: ordenes.map((f) => [diaCorto(f.fecha), f.folio, f.cliente, f.extra || "-", f.tecnicos, f.estado]),
        columnStyles: {
          0: { cellWidth: 58, fontStyle: "bold", textColor: INK },
          1: { cellWidth: 62, fontStyle: "bold", textColor: NAVY },
          2: { cellWidth: 136, textColor: INK },
          3: { cellWidth: 98 },
          4: { cellWidth: 88 },
          5: { cellWidth: 74 },
        },
        didParseCell: (h) => {
          if (h.section === "body" && h.column.index === 5) h.cell.text = [""];
        },
        didDrawCell: (h) => {
          if (h.section !== "body" || h.column.index !== 5) return;
          const f = ordenes[h.row.index];
          if (f) pill(h.cell.x + 3, h.cell.y, h.cell.height, f.estado, estadoPill(f));
        },
      });

    // Proyectos
    y = sub("Proyectos", `${plural(proyectos.length, "proyecto", "proyectos")} con jornadas`);
    if (!proyectos.length) vacio(y, "Sin proyectos con jornadas esta semana.");
    else
      autoTable(doc, {
        ...base,
        startY: y,
        head: [["FOLIO", "CLIENTE", "TIPO DE TRABAJO", "EQUIPO", "JORNADAS", "AVANCE", "ESTADO"]],
        body: proyectos.map((f) => [
          f.folio,
          f.cliente,
          f.tipoTrabajo || "-",
          [f.responsable || f.tecnicos, ...(f.equipo?.length ? [`+ ${f.equipo.join(", ")}`] : [])].join("\n"),
          "",
          "",
          f.estado,
        ]),
        styles: { ...base.styles, minCellHeight: 30 },
        columnStyles: {
          0: { cellWidth: 56, fontStyle: "bold", textColor: NAVY },
          1: { cellWidth: 92, textColor: INK, fontStyle: "bold" },
          2: { cellWidth: 92 },
          3: { cellWidth: 80 },
          4: { cellWidth: 66 },
          5: { cellWidth: 56 },
          6: { cellWidth: 74 },
        },
        didParseCell: (h) => {
          if (h.section === "body" && h.column.index === 6) h.cell.text = [""];
        },
        didDrawCell: (h) => {
          if (h.section !== "body") return;
          const f = proyectos[h.row.index];
          if (!f) return;
          const cy0 = h.cell.y + h.cell.height / 2;
          if (h.column.index === 4) {
            const paso = 9.2;
            const x0 = h.cell.x + (h.cell.width - paso * 7) / 2 + paso / 2;
            for (let i = 0; i < 7; i++) {
              const d = new Date(`${w.lunes}T12:00:00`);
              d.setDate(d.getDate() + i);
              const activo = f.dias.includes(ymdDe(d));
              fill(activo ? NAVY : WHITE);
              stroke(activo ? NAVY : RULE);
              doc.setLineWidth(0.7);
              doc.circle(x0 + i * paso, cy0 - 2, 3.9, "FD");
              font("bold", 5, activo ? WHITE : MUTED);
              doc.text(DIAS[i], x0 + i * paso, cy0 - 0.4, { align: "center" });
            }
            font("normal", 6.4, MUTED);
            doc.text(f.extra, h.cell.x + h.cell.width / 2, cy0 + 10, { align: "center" });
          }
          if (h.column.index === 5) {
            const av = f.avance ?? 0;
            font("bold", 8, INK);
            doc.text(pct(av), h.cell.x + h.cell.width / 2, cy0 - 2, { align: "center" });
            const bx1 = h.cell.x + 8;
            const bw1 = h.cell.width - 16;
            fill(TRACK);
            doc.roundedRect(bx1, cy0 + 4, bw1, 5, 2.5, 2.5, "F");
            if (av > 0) seg(bx1, cy0 + 4, Math.max(5, bw1 * av), 5, avanceRgb(av), INK);
          }
          if (h.column.index === 6) pill(h.cell.x + 3, h.cell.y, h.cell.height, f.estado, estadoPill(f));
        },
      });

    // Reasignaciones
    y = sub("Reasignaciones", `${plural(w.historial.length, "movimiento", "movimientos")}`);
    if (!w.historial.length) vacio(y, "No hubo reasignaciones esta semana.");
    else
      autoTable(doc, {
        ...base,
        startY: y,
        head: [["FECHA Y HORA", "TIPO", "FOLIO", "CLIENTE", "MOVIMIENTO", "POR"]],
        body: w.historial.map((e) => [
          fmtHora(e.creado_at),
          e.tipo === "orden" ? "Orden" : "Proyecto",
          e.folio || `#${e.objeto_id}`,
          e.cliente || "-",
          `${e.accion === "deshacer" ? "(Deshacer) " : ""}${describirMovimiento(e) || "Sin cambios"}`,
          e.usuario_nombre || "-",
        ]),
        columnStyles: {
          0: { cellWidth: 74, fontStyle: "bold", textColor: INK },
          1: { cellWidth: 56, fontStyle: "bold" },
          2: { cellWidth: 60, fontStyle: "bold", textColor: NAVY },
          3: { cellWidth: 114, textColor: INK },
          4: { cellWidth: 136 },
          5: { cellWidth: 76 },
        },
      });
  });

  /* ==================================================================== */
  /* Contenido de la portada + encabezado y pie corridos                   */
  /* ==================================================================== */
  const total = doc.getNumberOfPages();

  doc.setPage(1);
  const baseY = 500;
  font("bold", 8, NAVY);
  doc.text("CONTENIDO", 64, baseY, { charSpace: 1.6 });
  stroke(NAVY);
  doc.setLineWidth(1.2);
  doc.line(64, baseY + 7, W - 64, baseY + 7);
  const paso = Math.min(18, (H - 70 - baseY - 24) / Math.max(1, toc.length));
  toc.forEach((t, i) => {
    const y = baseY + 24 + i * paso;
    const sangria = t.nivel === 1 ? 26 : 0;
    font(t.nivel === 0 ? "bold" : "normal", t.nivel === 0 ? 9.5 : 8.6, INK);
    doc.text(`${t.num}`, 64 + sangria, y);
    doc.text(t.texto, 64 + 26 + sangria, y);
    const w1 = doc.getTextWidth(t.texto);
    font("normal", 8, MUTED);
    doc.text(t.sub, 64 + 26 + sangria + w1 + 10, y);
    font("bold", 9.5, INK);
    doc.text(String(t.pagina), W - 64, y, { align: "right" });
  });
  font("normal", 7.5, MUTED);
  doc.text("Documento generado por el Sistema Grupo Intrax GPS a partir del tablero de Equipo.", 64, H - 40);

  for (let i = 2; i <= total; i++) {
    doc.setPage(i);
    fill(NAVY);
    doc.rect(M, 26, 8, 8, "F");
    font("bold", 7.8, INK);
    doc.text("GRUPO INTRAX GPS", M + 14, 33, { charSpace: 1 });
    font("normal", 7.8, MUTED);
    doc.text(`${folioDoc}  ·  ${etiquetaPagina.get(i) ?? ""}`, W - M, 33, { align: "right" });
    stroke(NAVY);
    doc.setLineWidth(0.9);
    doc.line(M, 42, W - M, 42);
    stroke(RULE);
    doc.setLineWidth(0.6);
    doc.line(M, H - 46, W - M, H - 46);
    font("normal", 7.5, MUTED);
    doc.text(`Reporte mensual de Equipo  ·  ${data.etiqueta}  ·  Uso interno`, M, H - 32);
    font("bold", 8, INK);
    doc.text(`Página ${i} de ${total}`, W - M, H - 32, { align: "right" });
  }

  return doc;
}

export async function descargarReporteMesPdf(data: ReporteMes): Promise<void> {
  const doc = await crearReporteMesPdf(data);
  doc.save(`Reporte-Equipo-${data.mes}.pdf`);
}
