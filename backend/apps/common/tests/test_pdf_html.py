from django.test import SimpleTestCase

from apps.common.pdf_html import PDF_PAGE_NUMBERS_STYLE_ID, ensure_print_page_numbers


class EnsurePrintPageNumbersTests(SimpleTestCase):
    def test_inserts_style_before_head_close(self):
        html = "<html><head><title>x</title></head><body></body></html>"
        out = ensure_print_page_numbers(html)
        self.assertIn(PDF_PAGE_NUMBERS_STYLE_ID, out)
        self.assertIn("content:counter(page)", out)
        self.assertNotIn("counter(pages)", out)
        self.assertIn("color-scheme:light", out)
        self.assertLess(out.find(PDF_PAGE_NUMBERS_STYLE_ID), out.lower().find("</head>"))

    def test_idempotent(self):
        html = "<html><head></head><body></body></html>"
        once = ensure_print_page_numbers(html)
        twice = ensure_print_page_numbers(once)
        self.assertEqual(once.count(PDF_PAGE_NUMBERS_STYLE_ID), 1)
        self.assertEqual(twice, once)

    def test_empty_passthrough(self):
        self.assertEqual(ensure_print_page_numbers(""), "")

    def test_request_wants_html_preview(self):
        from types import SimpleNamespace

        from apps.common.pdf_html import request_wants_html_preview

        self.assertTrue(request_wants_html_preview(SimpleNamespace(query_params={"html": "1"})))
        self.assertFalse(request_wants_html_preview(SimpleNamespace(query_params={"format": "html"})))
        self.assertFalse(request_wants_html_preview(SimpleNamespace(query_params={})))
