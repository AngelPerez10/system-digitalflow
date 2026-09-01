from email.message import Message
from urllib.error import HTTPError
from urllib.request import Request

from django.test import SimpleTestCase

from apps.common import ssrf
from apps.common.ssrf import is_embed_url_allowed


class SsrfAllowlistTests(SimpleTestCase):
    def test_blocks_localhost(self):
        self.assertFalse(is_embed_url_allowed("http://localhost/image.png"))
        self.assertFalse(is_embed_url_allowed("http://127.0.0.1/image.png"))

    def test_blocks_private_ip(self):
        self.assertFalse(is_embed_url_allowed("http://10.0.0.5/image.png"))
        self.assertFalse(is_embed_url_allowed("http://192.168.1.10/image.png"))

    def test_allows_cloudinary(self):
        self.assertTrue(is_embed_url_allowed("https://res.cloudinary.com/demo/image/upload/v1/sample.jpg"))

    def test_allows_syscom_product_cdn(self):
        self.assertTrue(
            is_embed_url_allowed(
                "https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/YONUSA/SYS12000/portada_0S400.PNG"
            )
        )
        self.assertTrue(is_embed_url_allowed("https://www.syscom.mx/epcom/images/product.jpg"))

    def test_allows_intrax_media(self):
        self.assertTrue(is_embed_url_allowed("https://intrax.mx/wp-content/uploads/2024/01/producto.jpg"))

    def test_blocks_lookalike_suffix_domains(self):
        """Un dominio de atacante que solo termina en el nombre permitido no pasa."""
        self.assertFalse(is_embed_url_allowed("https://evilcloudinary.com/payload.png"))
        self.assertFalse(is_embed_url_allowed("https://notcloudinary.com/payload.png"))
        self.assertFalse(is_embed_url_allowed("https://evilsyscom.mx/payload.png"))
        self.assertFalse(is_embed_url_allowed("https://eviltvc.mx/payload.png"))
        self.assertFalse(is_embed_url_allowed("https://evilintrax.mx/payload.png"))
        # El dominio apex y los subdominios legítimos siguen permitidos.
        self.assertTrue(is_embed_url_allowed("https://cloudinary.com/demo.png"))
        self.assertTrue(is_embed_url_allowed("https://res.cloudinary.com/demo.png"))

    def test_allows_configured_hosts(self):
        original = ssrf.IMG_EMBED_ALLOW_HOSTS
        try:
            ssrf.IMG_EMBED_ALLOW_HOSTS = {"cdn.example.com"}
            self.assertTrue(is_embed_url_allowed("https://cdn.example.com/logo.png"))
            self.assertFalse(is_embed_url_allowed("https://evil.example.com/logo.png"))
        finally:
            ssrf.IMG_EMBED_ALLOW_HOSTS = original


class PdfImageEmbedTests(SimpleTestCase):
    def test_cloudinary_pdf_thumb_inserts_limit(self):
        from apps.common.pdf_images import cloudinary_pdf_thumb, embed_remote_images

        src = "https://res.cloudinary.com/demo/image/upload/v1/sample.jpg"
        self.assertEqual(
            cloudinary_pdf_thumb(src, width=720),
            "https://res.cloudinary.com/demo/image/upload/c_limit,w_720,q_auto:eco,f_jpg/v1/sample.jpg",
        )
        already = cloudinary_pdf_thumb(src, width=720)
        self.assertEqual(cloudinary_pdf_thumb(already, width=720), already)

        data = "data:image/png;base64,abc"
        self.assertEqual(embed_remote_images([data]).get(data), data)


class RedirectAllowlistTests(SimpleTestCase):
    """El destino de cada redirect se revalida: seguir 3xx a ciegas es SSRF."""

    def _redirect_to(self, newurl: str):
        from apps.common.pdf_images import _AllowlistRedirectHandler

        handler = _AllowlistRedirectHandler()
        req = Request("https://res.cloudinary.com/demo/image/upload/v1/sample.jpg")
        return handler.redirect_request(req, None, 302, "Found", Message(), newurl)

    def test_blocks_redirect_to_cloud_metadata(self):
        with self.assertRaises(HTTPError):
            self._redirect_to("http://169.254.169.254/latest/meta-data/")

    def test_blocks_redirect_to_private_ip(self):
        with self.assertRaises(HTTPError):
            self._redirect_to("http://10.0.0.5/internal.png")

    def test_blocks_redirect_to_disallowed_host(self):
        with self.assertRaises(HTTPError):
            self._redirect_to("https://evilcloudinary.com/payload.png")

    def test_blocks_redirect_to_non_http_scheme(self):
        with self.assertRaises(HTTPError):
            self._redirect_to("file:///etc/passwd")

    def test_allows_redirect_within_allowlist(self):
        redirected = self._redirect_to("https://res.cloudinary.com/demo/image/upload/v2/other.jpg")
        self.assertEqual(
            redirected.get_full_url(),
            "https://res.cloudinary.com/demo/image/upload/v2/other.jpg",
        )
