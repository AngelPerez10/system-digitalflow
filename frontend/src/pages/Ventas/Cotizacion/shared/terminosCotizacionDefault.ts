import { MARCA_NOMBRE_DEFAULT } from "@/config/marcaIniciales";

export function terminosCotizacionDefault(nombreEmpresa: string): string {
  const nombre = nombreEmpresa.trim() || MARCA_NOMBRE_DEFAULT;
  return (
    "TÉRMINOS Y CONDICIONES\n\n" +
    "- Se requiere 60% de anticipo para iniciar trabajos y 40% al finalizar la instalación.\n" +
    "- No se programan trabajos sin anticipo confirmado.\n" +
    "- Precios expresados en pesos mexicanos.\n" +
    "- Vigencia de la cotización: 15 días naturales.\n" +
    "- Los equipos cuentan con 1 año de garantía por defectos de fábrica.\n" +
    "- La mano de obra y configuraciones tienen 3 meses de garantía.\n" +
    "- La garantía no aplica por mal uso, golpes, humedad, variaciones de voltaje o manipulación por terceros.\n" +
    "- La cotización incluye únicamente los conceptos especificados; trabajos adicionales se cotizan aparte.\n" +
    "- El cliente deberá proporcionar accesos, energía eléctrica y condiciones adecuadas para la instalación.\n" +
    `- Retrasos por causas externas no son responsabilidad de ${nombre}.\n` +
    `- Los equipos son propiedad de ${nombre} hasta liquidar el pago total.\n` +
    "- El anticipo o liquidación no es reembolsable en caso de cancelación.\n" +
    "- La aceptación de la cotización implica conformidad con estos términos."
  );
}
