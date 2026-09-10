"""«Simplificar descripción» en el PDF: además oculta miniatura y detalle largo (modelo)."""

from django.test import TestCase

from apps.cotizaciones.models import Cotizacion, CotizacionItem
from apps.cotizaciones.pdf_opciones import CotizacionPdfOpciones
from apps.cotizaciones.pdf_templates.cotizacion import generate_cotizacion_pdf_html

DETALLE_LARGO = "ESPEC-LARGA-9271 sensor progresivo lente 2.8mm IR 30m especificaciones internas"
NOMBRE_MODELO = "DS-2CD2043G2-IU"
DESC_CORTA = "Camara IP 4MP resumida"


class PdfSimplificarDescripcionTests(TestCase):
    def setUp(self):
        self.cot = Cotizacion.objects.create(cliente="ACME", subtotal=100, total=116)
        CotizacionItem.objects.create(
            cotizacion=self.cot,
            producto_externo_id="SYS-123",
            producto_nombre=NOMBRE_MODELO,
            producto_descripcion=DETALLE_LARGO,
            pdf_descripcion_corta=DESC_CORTA,
            thumbnail_url="https://cdn.example.com/foto.jpg",
            cantidad=1,
            precio_lista=116,
        )

    def _html(self, **opts):
        return generate_cotizacion_pdf_html(self.cot, CotizacionPdfOpciones(**opts))

    def test_por_defecto_muestra_imagen_y_detalle(self):
        html = self._html()
        self.assertIn("IMG</th>", html)
        self.assertIn("imgcell", html)
        self.assertIn(DETALLE_LARGO, html)
        self.assertIn(NOMBRE_MODELO, html)

    def test_simplificar_oculta_imagen_y_detalle_largo(self):
        html = self._html(simplificar_descripcion=True)
        # Sin columna de imagen.
        self.assertNotIn("IMG</th>", html)
        self.assertNotIn("imgcell", html)
        # Sin detalle largo (modelo / specs del equipo).
        self.assertNotIn(DETALLE_LARGO, html)
        self.assertNotIn(NOMBRE_MODELO, html)
        # Solo la descripción corta.
        self.assertIn(DESC_CORTA, html)

    def test_simplificar_mantiene_columnas_alineadas(self):
        """El colspan de la fila «Sin conceptos» debe seguir cuadrando sin la col IMG."""
        vacia = Cotizacion.objects.create(cliente="Vacia")
        html = generate_cotizacion_pdf_html(
            vacia, CotizacionPdfOpciones(simplificar_descripcion=True)
        )
        # Sin descuentos: 3 base (CANT, UNIDAD, DESCRIPCIÓN) + P.UNIT + IMPORTE = 5
        self.assertIn("colspan='5'", html)
        self.assertNotIn(">DESC</th>", html)
