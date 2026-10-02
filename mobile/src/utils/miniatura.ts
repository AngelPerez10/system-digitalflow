/**
 * Miniatura ligera de una foto de Cloudinary: recorte, calidad y formato
 * automáticos al ancho pedido (en px físicos). Una foto de evidencia pesa
 * ~80 KB; en una lista de tarjetas eso multiplicado se nota en datos móviles
 * y memoria — la miniatura pesa una fracción. Cualquier otra URL (data URI,
 * otro host) se devuelve igual.
 */
export function miniaturaUrl(url: string, ancho = 360, proporcion = 0.75): string {
  const marca = '/image/upload/';
  if (!url || !url.includes('res.cloudinary.com') || !url.includes(marca)) return url;
  const [cabeza, cola] = url.split(marca);
  const alto = Math.round(ancho * proporcion);
  return `${cabeza}${marca}c_fill,w_${ancho},h_${alto},q_auto,f_auto/${cola}`;
}
