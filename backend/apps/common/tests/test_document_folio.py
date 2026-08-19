from django.test import SimpleTestCase

from apps.common.document_folio import (
    FOLIO_SERIE_COT,
    FOLIO_SERIE_ODT,
    FOLIO_SERIE_POL,
    format_document_folio,
    resolve_document_folio,
)


class DocumentFolioTests(SimpleTestCase):
    def test_format_document_folio(self):
        self.assertEqual(format_document_folio(FOLIO_SERIE_COT, 1042), "COT-1042")
        self.assertEqual(format_document_folio(FOLIO_SERIE_ODT, "5001"), "ODT-5001")
        self.assertEqual(format_document_folio(FOLIO_SERIE_POL, 10001), "POL-10001")
        self.assertEqual(format_document_folio("PRJ", None), "—")

    def test_resolve_document_folio_prefers_prefixed(self):
        self.assertEqual(resolve_document_folio(FOLIO_SERIE_ODT, "ODT-88", 99), "ODT-88")
        self.assertEqual(resolve_document_folio(FOLIO_SERIE_ODT, "legacy-text", 99), "legacy-text")
        self.assertEqual(resolve_document_folio(FOLIO_SERIE_ODT, "5001", None), "ODT-5001")
        self.assertEqual(resolve_document_folio(FOLIO_SERIE_ODT, "", 5001), "ODT-5001")
