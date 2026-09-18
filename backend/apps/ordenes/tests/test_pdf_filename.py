from types import SimpleNamespace

from django.test import SimpleTestCase

from apps.ordenes.views import _orden_pdf_filename


class OrdenPdfFilenameTests(SimpleTestCase):
    def test_uses_business_folio_not_pk(self):
        orden = SimpleNamespace(id=1305, idx=5686, folio="ODT-5686")
        self.assertEqual(_orden_pdf_filename(orden), "Orden_ODT-5686.pdf")

    def test_builds_folio_from_idx_when_folio_empty(self):
        orden = SimpleNamespace(id=1305, idx=5686, folio="")
        self.assertEqual(_orden_pdf_filename(orden), "Orden_ODT-5686.pdf")

    def test_falls_back_to_pk(self):
        orden = SimpleNamespace(id=1305, idx=None, folio=None)
        self.assertEqual(_orden_pdf_filename(orden), "Orden_1305.pdf")
