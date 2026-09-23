/**
 * Teléfono en formato internacional para WhatsApp (solo dígitos). Un número
 * mexicano de 10 dígitos recibe la lada 52; uno que ya trae lada se respeta.
 * Devuelve `null` si no parece un teléfono.
 */
export function telefonoWhatsApp(telefono: string | null | undefined): string | null {
  const digitos = (telefono ?? '').replace(/\D/g, '');
  if (digitos.length === 10) return `52${digitos}`;
  if (digitos.length >= 11 && digitos.length <= 15) return digitos;
  return null;
}

/**
 * Enlaces para abrir WhatsApp con el mensaje listo: primero la app, y el
 * enlace web como respaldo si la app no está instalada.
 */
export function enlacesWhatsApp(telefono: string | null, texto: string): { app: string; web: string } {
  const t = encodeURIComponent(texto);
  return {
    app: telefono ? `whatsapp://send?phone=${telefono}&text=${t}` : `whatsapp://send?text=${t}`,
    web: telefono ? `https://wa.me/${telefono}?text=${t}` : `https://wa.me/?text=${t}`,
  };
}

/** Mensaje que acompaña el enlace del PDF («el reporte de servicio ODT-12», «el reporte del proyecto PRY-3»). */
export function mensajePdf(documento: string, url: string): string {
  return `Hola, te compartimos ${documento}. Puedes verlo y descargarlo aquí: ${url}`;
}
