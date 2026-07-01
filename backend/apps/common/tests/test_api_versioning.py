from django.test import SimpleTestCase
from django.urls import Resolver404, resolve


class ApiVersioningUrlTests(SimpleTestCase):
    def assert_resolves(self, path: str):
        try:
            resolve(path)
        except Resolver404 as exc:
            self.fail(f"{path} did not resolve: {exc}")

    def test_legacy_api_prefix_still_resolves(self):
        self.assert_resolves("/api/ordenes/")
        self.assert_resolves("/api/auth/csrf/")

    def test_v1_api_prefix_resolves_same_domains(self):
        self.assert_resolves("/api/v1/ordenes/")
        self.assert_resolves("/api/v1/auth/csrf/")
