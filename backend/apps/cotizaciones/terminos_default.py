"""Términos y condiciones por defecto de una cotización (espejo de la web).

La web los precarga en el formulario; la app móvil no manda `terminos` al
crear y el serializer los rellena aquí con el nombre de la marca del sistema.
"""


def terminos_cotizacion_default(nombre_empresa: str) -> str:
    nombre = (nombre_empresa or "").strip() or "Grupo Intrax"
    return (
        "TÉRMINOS Y CONDICIONES\n\n"
        "- Se requiere 60% de anticipo para iniciar trabajos y 40% al finalizar la instalación.\n"
        "- No se programan trabajos sin anticipo confirmado.\n"
        "- Precios expresados en pesos mexicanos.\n"
        "- Vigencia de la cotización: 15 días naturales.\n"
        "- Los equipos cuentan con 1 año de garantía por defectos de fábrica.\n"
        "- La mano de obra y configuraciones tienen 3 meses de garantía.\n"
        "- La garantía no aplica por mal uso, golpes, humedad, variaciones de voltaje o manipulación por terceros.\n"
        "- La cotización incluye únicamente los conceptos especificados; trabajos adicionales se cotizan aparte.\n"
        "- El cliente deberá proporcionar accesos, energía eléctrica y condiciones adecuadas para la instalación.\n"
        f"- Retrasos por causas externas no son responsabilidad de {nombre}.\n"
        f"- Los equipos son propiedad de {nombre} hasta liquidar el pago total.\n"
        "- El anticipo o liquidación no es reembolsable en caso de cancelación.\n"
        "- La aceptación de la cotización implica conformidad con estos términos."
    )
