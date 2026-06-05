from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.users.models import UserPermissions

User = get_user_model()


class ClientesSmokeTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="clientes_user", password="test-pass-123")
        UserPermissions.objects.create(
            user=self.user,
            permissions={
                "clientes": {"view": True, "create": True, "edit": True, "delete": False},
            },
        )
        self.client.force_authenticate(user=self.user)

    def test_list_clientes_denied_without_view(self):
        denied = User.objects.create_user(username="sin_clientes", password="test-pass-123")
        UserPermissions.objects.create(user=denied, permissions={"clientes": {}})
        self.client.force_authenticate(user=denied)
        response = self.client.get("/api/clientes/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_clientes_ok(self):
        response = self.client.get("/api/clientes/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
