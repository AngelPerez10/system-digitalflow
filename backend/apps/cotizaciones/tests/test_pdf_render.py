from django.test import SimpleTestCase

from apps.cotizaciones.pdf_render import PDF_FOOTER_TEMPLATE, playwright_pdf_kwargs


class PlaywrightPdfPageNumbersTests(SimpleTestCase):
    def test_footer_uses_chromium_page_classes(self):
        self.assertIn('class="pageNumber"', PDF_FOOTER_TEMPLATE)
        self.assertNotIn("totalPages", PDF_FOOTER_TEMPLATE)
        self.assertNotIn(" / ", PDF_FOOTER_TEMPLATE)
        self.assertIn("text-align:right", PDF_FOOTER_TEMPLATE)

    def test_pdf_kwargs_enable_header_footer_and_bottom_margin(self):
        opts = playwright_pdf_kwargs(paper_format="A4", landscape=False)
        self.assertTrue(opts["display_header_footer"])
        self.assertEqual(opts["footer_template"], PDF_FOOTER_TEMPLATE)
        self.assertEqual(opts["margin"]["bottom"], "10mm")
        self.assertEqual(opts["margin"]["top"], "0")
        self.assertEqual(opts["format"], "A4")
        self.assertFalse(opts["landscape"])

    def test_landscape_preserved(self):
        opts = playwright_pdf_kwargs(paper_format="LETTER", landscape=True)
        self.assertTrue(opts["landscape"])
        self.assertEqual(opts["format"], "LETTER")
