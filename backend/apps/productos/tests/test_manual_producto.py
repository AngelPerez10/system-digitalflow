from django.test import SimpleTestCase

from apps.productos.manual_producto import (
    build_manual_producto_descripcion,
    manual_producto_id_from_externo,
    resolve_item_descripcion,
)


class ManualProductoHelperTests(SimpleTestCase):
    def test_build_descripcion_includes_caracteristicas(self):
        text = build_manual_producto_descripcion(
            marca="Marca X",
            modelo="Modelo Y",
            caracteristicas="Línea 1\nLínea 2",
        )
        self.assertIn("Marca X · Modelo Y", text)
        self.assertIn("Línea 1", text)
        self.assertIn("Línea 2", text)

    def test_manual_id_parser(self):
        self.assertEqual(manual_producto_id_from_externo("manual:42"), 42)
        self.assertIsNone(manual_producto_id_from_externo("syscom:1"))

    def test_resolve_prefers_catalog_map(self):
        resolved = resolve_item_descripcion(
            "manual:5",
            "solo marca",
            {5: "Marca · Modelo\n\nCaracterística A"},
        )
        self.assertEqual(resolved, "Marca · Modelo\n\nCaracterística A")
