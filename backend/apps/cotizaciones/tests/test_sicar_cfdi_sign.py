"""Tests para carga de llave CSD (formato SAT DER encriptado)."""
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import (
    BestAvailableEncryption,
    Encoding,
    NoEncryption,
    PrivateFormat,
)
from django.test import SimpleTestCase

from apps.cotizaciones.sicar_cfdi_sign import _prepare_csd_private_key, normalize_csd_blob, normalize_csd_password


class SicarCsdKeyTests(SimpleTestCase):
    def _rsa_key(self):
        return rsa.generate_private_key(public_exponent=65537, key_size=2048)

    def test_encrypted_der_pkcs8_sat_format(self):
        """Llaves .key del SAT suelen ser PKCS#8 DER encriptado (no PEM)."""
        password = "clave-csd-test"
        raw = self._rsa_key().private_bytes(
            Encoding.DER,
            PrivateFormat.PKCS8,
            BestAvailableEncryption(password.encode("utf-8")),
        )
        pem, passphrase = _prepare_csd_private_key(raw, password)
        self.assertIn(b"BEGIN RSA PRIVATE KEY", pem)
        self.assertEqual(passphrase, b"")

    def test_unencrypted_pem(self):
        raw = self._rsa_key().private_bytes(
            Encoding.PEM,
            PrivateFormat.TraditionalOpenSSL,
            NoEncryption(),
        )
        pem, passphrase = _prepare_csd_private_key(raw, "")
        self.assertIn(b"BEGIN RSA PRIVATE KEY", pem)
        self.assertEqual(passphrase, b"")

    def test_wrong_password_raises_clear_error(self):
        raw = self._rsa_key().private_bytes(
            Encoding.DER,
            PrivateFormat.PKCS8,
            BestAvailableEncryption(b"correcta"),
        )
        with self.assertRaises(ValueError) as ctx:
            _prepare_csd_private_key(raw, "incorrecta")
        self.assertIn("descifrar", str(ctx.exception).lower())

    def test_normalize_password_strips_null_and_spaces(self):
        self.assertEqual(normalize_csd_password("  clave\x00  "), "clave")

    def test_normalize_blob_from_base64_text(self):
        raw = self._rsa_key().private_bytes(Encoding.DER, PrivateFormat.PKCS8, NoEncryption())
        import base64

        encoded = base64.b64encode(raw).decode("ascii")
        self.assertEqual(normalize_csd_blob(encoded), raw)

    def test_unencrypted_der_loads_without_password(self):
        raw = self._rsa_key().private_bytes(Encoding.DER, PrivateFormat.PKCS8, NoEncryption())
        pem, passphrase = _prepare_csd_private_key(raw, "cualquier-cosa")
        self.assertIn(b"BEGIN RSA PRIVATE KEY", pem)
        self.assertEqual(passphrase, b"")
