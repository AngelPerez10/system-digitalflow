"""Tests for signature ink crop + transparent background."""
from __future__ import annotations

import base64
import io
import unittest

from PIL import Image

from apps.common.signature_image import normalize_signature_image, signature_image_to_png_data_uri
from apps.ordenes.image_services import folder_is_firmas, optimize_image


def _png_data_url(img: Image.Image) -> str:
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return f"data:image/png;base64,{base64.b64encode(buf.getvalue()).decode('ascii')}"


class SignatureNormalizeTests(unittest.TestCase):
    def test_strips_white_and_crops_to_ink(self):
        img = Image.new("RGB", (400, 800), (255, 255, 255))
        # Small dark stroke in the center of a tall portrait canvas
        for x in range(180, 220):
            for y in range(380, 420):
                img.putpixel((x, y), (9, 9, 11))
        # Fake guide line (light gray)
        for x in range(40, 360):
            img.putpixel((x, 600), (211, 211, 216))

        out = normalize_signature_image(img)
        self.assertEqual(out.mode, "RGBA")
        self.assertLess(out.width, 120)
        self.assertLess(out.height, 120)

        # Corners of the cropped image should be transparent (padding around ink)
        corner = out.getpixel((0, 0))
        self.assertEqual(corner[3], 0)

    def test_optimize_as_signature_returns_png(self):
        img = Image.new("RGB", (200, 400), (255, 255, 255))
        for x in range(90, 110):
            for y in range(190, 210):
                img.putpixel((x, y), (20, 20, 20))
        data_url = _png_data_url(img)
        out = optimize_image(data_url, max_size_kb=80, as_signature=True)
        self.assertTrue(out.startswith("data:image/png;base64,"))

    def test_folder_is_firmas(self):
        self.assertTrue(folder_is_firmas("ordenes/firmas"))
        self.assertTrue(folder_is_firmas("proyectos/firmas"))
        self.assertFalse(folder_is_firmas("ordenes/fotos"))

    def test_signature_png_data_uri_roundtrip(self):
        img = Image.new("RGBA", (40, 20), (0, 0, 0, 0))
        img.putpixel((10, 10), (0, 0, 0, 255))
        uri = signature_image_to_png_data_uri(normalize_signature_image(img))
        self.assertTrue(uri.startswith("data:image/png;base64,"))

    def test_all_white_returns_original_not_empty(self):
        img = Image.new("RGB", (80, 120), (255, 255, 255))
        out = normalize_signature_image(img)
        self.assertEqual(out.size, (80, 120))
        # No PNG 1×1 vacío (dejaba el pad del ERP en blanco).
        self.assertNotEqual(out.size, (1, 1))


if __name__ == "__main__":
    unittest.main()
