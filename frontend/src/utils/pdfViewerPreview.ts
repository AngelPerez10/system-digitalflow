/**
 * Chrome hereda `color-scheme: dark` del ERP y pinta el plugin PDF en negro.
 * Un documento anidado con `color-scheme: only light` + <embed> muestra el PDF.
 */

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

export function pdfEmbedPreviewUrl(pdfObjectUrl: string): string {
  const src = escapeAttr(pdfObjectUrl);
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Vista previa del PDF</title>
  <style>
    html, body { margin: 0; height: 100%; background: #fff; color-scheme: only light; }
    embed { display: block; width: 100%; height: 100%; border: 0; }
  </style>
</head>
<body>
  <embed type="application/pdf" src="${src}" title="Vista previa del PDF" />
</body>
</html>`;
  return URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
}

export function objectUrlsForPdfViewer(pdfBlob: Blob): { previewUrl: string; downloadUrl: string } {
  const downloadUrl = URL.createObjectURL(
    pdfBlob.type === "application/pdf" ? pdfBlob : new Blob([pdfBlob], { type: "application/pdf" }),
  );
  return { previewUrl: pdfEmbedPreviewUrl(downloadUrl), downloadUrl };
}
