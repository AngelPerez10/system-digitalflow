"""Mapeo de productos TVC: enlace, stock, cotización y descripción."""
from django.test import SimpleTestCase

from apps.productos.tvc_views import _map_tvc_product

PROYECTO = {
    'tvc_id': 1523,
    'tvc_model': '42133',
    'provider_model': 'AM-114',
    'name': 'VIVOTEK AM-114 - Soporte',
    'brand': 'VIVOTEK ',
    'product_flow_type': 'Proyecto',
    'list_price': '-',
    'distributor_price': '-',
    'media': {
        'main_image': 'https://cdn.tvc.mx/media/1/AM-114.png',
        'gallery': ['https://cdn.tvc.mx/media/2/imag1.jpg'],
        'documents': ['https://cdn.tvc.mx/media/3/Etiqueta.txt', 'https://cdn.tvc.mx/media/4/FICHA-TECNICA-AM-114.pdf'],
    },
    'overviews': [
        {'title': 'Especificaciones.', 'description': '<p>Peso: 1&nbsp;kg<br>Alto: 110 mm</p>', 'order': 2},
        {'title': 'Información General.', 'description': '<p class="x">Soporte de <b>techo</b>.</p>', 'order': 1},
    ],
}

VALOR = {
    'tvc_id': 7910,
    'tvc_model': 'VIA040012',
    'name': 'Soporte',
    'product_flow_type': 'Valor',
    'list_price': '183.0000',
    'distributor_price': 115.29,
    'total_inventories': '31',
    'media': {},
}


class MapeoTvcTests(SimpleTestCase):
    def test_enlace_a_la_ficha_publica_por_id(self):
        self.assertEqual(_map_tvc_product(PROYECTO)['link'], 'https://tvc.mx/products/1523')

    def test_proyecto_sin_precio_ni_stock_es_cotizacion(self):
        m = _map_tvc_product(PROYECTO, exchange_rate=17.5)
        self.assertIsNone(m['precio_mxn'])
        self.assertIsNone(m['total_existencia'])
        self.assertTrue(m['precio_bajo_cotizacion'])
        self.assertEqual(m['estado_inventario'], 'sin_dato')

    def test_valor_trae_precio_y_stock(self):
        m = _map_tvc_product(VALOR, exchange_rate=20)
        self.assertEqual(m['precio_mxn'], round(183 * 20 * 1.16, 2))
        self.assertEqual(m['total_existencia'], 31)
        self.assertFalse(m['precio_bajo_cotizacion'])

    def test_inventario_detallado_se_suma(self):
        m = _map_tvc_product({**VALOR, 'inventory_detailed': [{'quantity': '3'}, {'quantity': '20'}]})
        self.assertEqual(m['total_existencia'], 23)

    def test_descripcion_en_orden_y_sin_html(self):
        m = _map_tvc_product(PROYECTO)
        self.assertEqual(
            m['secciones'],
            [
                {'titulo': 'Información General', 'texto': 'Soporte de techo.'},
                {'titulo': 'Especificaciones', 'texto': 'Peso: 1 kg\nAlto: 110 mm'},
            ],
        )

    def test_galeria_y_documentos(self):
        m = _map_tvc_product(PROYECTO)
        self.assertEqual(len(m['imagenes']), 2)
        self.assertEqual([d['nombre'] for d in m['documentos']], ['FICHA TECNICA AM 114'])
