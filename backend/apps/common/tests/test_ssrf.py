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

    def test_allows_configured_hosts(self):
        original = ssrf.IMG_EMBED_ALLOW_HOSTS
        try:
            ssrf.IMG_EMBED_ALLOW_HOSTS = {"cdn.example.com"}
            self.assertTrue(is_embed_url_allowed("https://cdn.example.com/logo.png"))
            self.assertFalse(is_embed_url_allowed("https://evil.example.com/logo.png"))
        finally:
            ssrf.IMG_EMBED_ALLOW_HOSTS = original
