"""Helpers puros de unicidad de cotización (sin DB)."""

from django.test import SimpleTestCase

from apps.operacion.cotizacion_unicidad import (
    canonical_cotizacion_id,
    collect_proyecto_cotizacion_ids,
    find_internal_duplicate_ids,
)


def _bloque_df(cot_id: str = "df-42", folio: str = "1042") -> dict:
    return {
        "vinculoId": f"vin-{cot_id}",
        "orden": 1,
        "cotizacion": {
            "id": cot_id,
            "origen": "digitalflow",
            "folio": folio,
            "cliente": "Cliente unicidad",
            "fecha": "2026-09-01",
        },
        "lineas": [],
    }


class CotizacionUnicidadHelperTests(SimpleTestCase):
    def test_canonical_keeps_origen_namespace(self):
        self.assertEqual(canonical_cotizacion_id("df-12"), "df-12")
        self.assertEqual(canonical_cotizacion_id("12", "digitalflow"), "df-12")
        self.assertEqual(canonical_cotizacion_id("sicar-89"), "sicar-89")
        self.assertEqual(canonical_cotizacion_id("89", "sicar"), "sicar-89")
        self.assertNotEqual(
            canonical_cotizacion_id("12", "digitalflow"),
            canonical_cotizacion_id("12", "sicar"),
        )

    def test_internal_duplicate_principal_and_adicional(self):
        cotizaciones = [_bloque_df("df-7")]
        adicional = {
            "id": "df-7",
            "origen": "digitalflow",
            "folio": "10007",
            "cliente": "X",
            "fecha": "2026-09-01",
        }
        self.assertEqual(
            find_internal_duplicate_ids(cotizaciones, adicional),
            ["df-7"],
        )
        ids = collect_proyecto_cotizacion_ids(cotizaciones, adicional)
        self.assertEqual(ids, {"df-7"})
