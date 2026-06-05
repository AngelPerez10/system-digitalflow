from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.users.models import UserPermissions

User = get_user_model()


class TareasSmokeTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="tareas_user", password="test-pass-123")
        UserPermissions.objects.create(
            user=self.user,
            permissions={
                "tareas": {"view": True, "create": True, "edit": True, "delete": False},
            },
        )
        self.client.force_authenticate(user=self.user)

    def test_list_tareas_denied_without_view(self):
        denied = User.objects.create_user(username="sin_tareas", password="test-pass-123")
        UserPermissions.objects.create(user=denied, permissions={"tareas": {}})
        self.client.force_authenticate(user=denied)
        response = self.client.get("/api/tareas/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_tareas_ok(self):
        response = self.client.get("/api/tareas/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
