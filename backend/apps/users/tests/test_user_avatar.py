"""Foto de perfil de otro usuario (`users/accounts/<id>/avatar/`), solo administradores."""

from unittest import mock

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from apps.users.models import UserPermissions

User = get_user_model()

PNG_DATA_URL = 'data:image/png;base64,iVBORw0KGgo='


def avatar_url(user_id: int) -> str:
    return f'/api/v1/users/accounts/{user_id}/avatar/'


@mock.patch('apps.users.views._delete_avatar_public_id')
@mock.patch('apps.users.views._upload_avatar_data_url', return_value=('https://cdn/x.png', 'users/avatars/x'))
class UserAvatarTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(username='admin1', password='x', is_staff=True, is_superuser=True)
        self.tecnico = User.objects.create_user(username='tecnico1', password='x')

    def test_admin_sube_foto_de_un_tecnico(self, upload, _delete):
        self.client.force_authenticate(user=self.admin)
        res = self.client.put(avatar_url(self.tecnico.id), {'avatar': PNG_DATA_URL}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['avatar_url'], 'https://cdn/x.png')
        upload.assert_called_once_with(self.tecnico.id, PNG_DATA_URL)
        perfil = UserPermissions.objects.get(user=self.tecnico)
        self.assertEqual(perfil.avatar_url, 'https://cdn/x.png')
        self.assertEqual(perfil.avatar_public_id, 'users/avatars/x')

    def test_admin_quita_la_foto(self, _upload, delete):
        UserPermissions.objects.update_or_create(
            user=self.tecnico, defaults={'avatar_url': 'https://cdn/old.png', 'avatar_public_id': 'old'}
        )
        self.client.force_authenticate(user=self.admin)
        res = self.client.delete(avatar_url(self.tecnico.id))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['avatar_url'], '')
        delete.assert_called_once_with('old')
        self.assertEqual(UserPermissions.objects.get(user=self.tecnico).avatar_url, '')

    def test_rechaza_lo_que_no_es_data_url(self, upload, _delete):
        self.client.force_authenticate(user=self.admin)
        res = self.client.put(avatar_url(self.tecnico.id), {'avatar': 'https://otra/foto.png'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        upload.assert_not_called()

    def test_put_vacio_no_borra(self, _upload, delete):
        self.client.force_authenticate(user=self.admin)
        res = self.client.put(avatar_url(self.tecnico.id), {'avatar': ''}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        delete.assert_not_called()

    def test_un_tecnico_no_puede_cambiar_fotos(self, upload, _delete):
        otro = User.objects.create_user(username='tecnico2', password='x')
        self.client.force_authenticate(user=self.tecnico)
        res = self.client.put(avatar_url(otro.id), {'avatar': PNG_DATA_URL}, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        upload.assert_not_called()

    def test_usuario_inexistente(self, _upload, _delete):
        self.client.force_authenticate(user=self.admin)
        res = self.client.put(avatar_url(99999), {'avatar': PNG_DATA_URL}, format='json')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_me_sigue_subiendo_la_foto_propia(self, upload, _delete):
        self.client.force_authenticate(user=self.tecnico)
        res = self.client.patch('/api/v1/me/', {'avatar': PNG_DATA_URL}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        upload.assert_called_once_with(self.tecnico.id, PNG_DATA_URL)
        self.assertEqual(res.data['avatar_url'], 'https://cdn/x.png')
