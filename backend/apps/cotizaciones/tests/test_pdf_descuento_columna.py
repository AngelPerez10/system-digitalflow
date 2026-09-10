"""La columna DESC del PDF solo aparece si alguna línea tiene descuento."""

from types import SimpleNamespace

from django.test import TestCase

from apps.cotizaciones.models import Cotizacion, CotizacionItem
from apps.cotizaciones.pdf_opciones import CotizacionPdfOpciones
from apps.cotizaciones.pdf_templates.cotizacion import generate_cotizacion_pdf_html


class PdfDescuentoColumnaTests(TestCase):
    def _html(self, descuento_pct: float, **opts):
        cot = Cotizacion.objects.create(cliente="ACME", subtotal=100, total=116)
        CotizacionItem.objects.create(
            cotizacion=cot,
            producto_externo_id="SYS-1",
            producto_nombre="Producto",
            cantidad=1,
            precio_lista=116,
            descuento_pct=descuento_pct,
        )
        return generate_cotizacion_pdf_html(cot, CotizacionPdfOpciones(**opts))

    def test_sin_descuento_oculta_columna_desc(self):
        html = self._html(0)
        self.assertNotIn(">DESC</th>", html)
        self.assertNotIn("0.00%", html)
        self.assertIn(">P. UNIT.</th>", html)
        self.assertIn(">IMPORTE</th>", html)

    def test_con_descuento_muestra_columna_desc(self):
        html = self._html(10)
        self.assertIn(">DESC</th>", html)
        self.assertIn("10.00%", html)

    def test_descuento_bajo_umbral_no_muestra_columna(self):
        """Valores < 0.01% se tratan como sin descuento (ruido de float)."""
        cot = SimpleNamespace(
            id=1,
            idx=1,
            cliente="ACME",
            cliente_id=None,
            fecha=None,
            subtotal=100,
            total=116,
            descuento_cliente_pct=0,
            anticipo_pct=60,
            categorias_productos=None,
            contacto="",
            contacto_telefono="",
            texto_arriba_precios="",
            terminos="",
            items=[
                SimpleNamespace(
                    categoria_id="",
                    cantidad=1,
                    precio_lista=100,
                    descuento_pct=0.009,
                    producto_externo_id="SYS-1",
                    sin_iva=False,
                    unidad="PZA",
                    producto_nombre="Producto",
                    producto_descripcion="",
                    pdf_descripcion_corta="",
                    thumbnail_url="",
                )
            ],
        )
        html = generate_cotizacion_pdf_html(cot, CotizacionPdfOpciones())
        self.assertNotIn(">DESC</th>", html)

    def test_ocultar_precios_tambien_oculta_desc(self):
        html = self._html(15, ocultar_precios_unitarios=True)
        self.assertNotIn(">DESC</th>", html)
        self.assertNotIn(">P. UNIT.</th>", html)
