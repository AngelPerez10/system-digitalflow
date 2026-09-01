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

    def test_normalize_blob_conserva_der_que_termina_en_whitespace(self):
        """Un DER que acaba en 0x09-0x0d/0x20 no debe perder su último byte.

        `.strip()` sobre bytes borra esos códigos: ~2.7% de las llaves CSD
        reales quedaban corruptas y el error decía «revisa la contraseña».
        """
        for last in (0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x20, 0x00):
            der = bytes([0x30, 0x03, 0x02, 0x01, last])
            self.assertEqual(normalize_csd_blob(der), der, f"último byte {last:#04x}")

    def test_normalize_blob_recorta_padding_de_mysql(self):
        """El padding que sí sobra (más allá de la longitud declarada) se va."""
        der = bytes([0x30, 0x03, 0x02, 0x01, 0x41])
        self.assertEqual(normalize_csd_blob(der + b"\x00\x00\x00"), der)

    def test_normalize_blob_der_largo_con_longitud_multibyte(self):
        """Forma larga del ASN.1 (0x82 + 2 bytes de longitud)."""
        contenido = b"\x41" * 300
        der = bytes([0x30, 0x82, 0x01, 0x2C]) + contenido
        self.assertEqual(normalize_csd_blob(der + b"\x00"), der)

    def test_normalize_blob_der_real_no_se_altera(self):
        raw = self._rsa_key().private_bytes(Encoding.DER, PrivateFormat.PKCS8, NoEncryption())
        self.assertEqual(normalize_csd_blob(raw), raw)
