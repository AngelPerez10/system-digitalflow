"""Órdenes del portal cliente: solo las suyas, solo lectura, sin campos internos.

El `OrdenViewSet` del ERP no sirve para el portal (exige el módulo `ordenes`), así
que estas vistas son la única puerta del cliente a sus servicios. Lo que se fija
aquí es la frontera: qué ve, qué no ve y qué no puede tocar.
"""

from datetime import date

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from apps.clientes.models import Cliente
from apps.clientes.portal_models import ClientePortalAccount
from apps.ordenes.models import Orden, OrdenCalificacion

User = get_user_model()

LISTA_URL = '/api/v1/portal-cliente/ordenes/'


def _detalle_url(orden_id: int) -> str:
    return f'/api/v1/portal-cliente/ordenes/{orden_id}/'


class PortalOrdenesTests(APITestCase):
    def setUp(self):
        self.client = APIClient()

        self.cliente = Cliente.objects.create(nombre='Cliente Uno')
        self.otro_cliente = Cliente.objects.create(nombre='Cliente Dos')

        self.user = User.objects.create_user(username='105040', password='portal-pass-1')
        self.cuenta = ClientePortalAccount.objects.create(
            user=self.user,
            cliente=self.cliente,
            portal_username='105040',
            must_change_password=False,
        )

        self.tecnico = User.objects.create_user(
            username='tecnico1', password='tec-pass-1', first_name='Iván', last_name='Cruz'
        )

        self.mia = Orden.objects.create(
            cliente_id=self.cliente,
            direccion='Av. Siempre Viva 1',
            problematica='No graba la cámara',
            status='pendiente',
            tecnico_asignado=self.tecnico,
            fecha_inicio=date(2026, 8, 10),
            comentario_tecnico='Se reemplazó el disco',
            status_administrativo='en_revision',
        )
        self.ajena = Orden.objects.create(
            cliente_id=self.otro_cliente,
            direccion='Calle Falsa 123',
            status='resuelto',
            fecha_inicio=date(2026, 8, 11),
        )

    def _auth_cliente(self):
        self.client.force_authenticate(user=self.user)

    def test_lista_solo_devuelve_ordenes_del_cliente(self):
        self._auth_cliente()
        resp = self.client.get(LISTA_URL)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        ids = [row['id'] for row in resp.data]
        self.assertEqual(ids, [self.mia.id])

    def test_lista_no_expone_campos_internos(self):
        self._auth_cliente()
        fila = self.client.get(LISTA_URL).data[0]
        for prohibido in (
            'status_administrativo',
            'cotizaciones_adjuntas',
            'equipos_inventario',
            'creado_por',
            'telefono_cliente',
            'cliente_id',
            'idx',
        ):
            self.assertNotIn(prohibido, fila)
        self.assertEqual(fila['tecnico_asignado_full_name'], 'Iván Cruz')

    def test_lista_incluye_la_foto_del_tecnico(self):
        from apps.users.models import UserPermissions

        perfil, _ = UserPermissions.objects.get_or_create(user=self.tecnico)
        perfil.avatar_url = 'https://cdn.example/tecnico1.jpg'
        perfil.save(update_fields=['avatar_url'])

        self._auth_cliente()
        fila = self.client.get(LISTA_URL).data[0]
        self.assertEqual(fila['tecnico_asignado_avatar_url'], 'https://cdn.example/tecnico1.jpg')

    def test_sin_foto_el_campo_llega_vacio_no_ausente(self):
        self._auth_cliente()
        fila = self.client.get(LISTA_URL).data[0]
        self.assertEqual(fila['tecnico_asignado_avatar_url'], '')

    def test_detalle_de_orden_propia(self):
        self._auth_cliente()
        resp = self.client.get(_detalle_url(self.mia.id))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['comentario_tecnico'], 'Se reemplazó el disco')
        self.assertIn('fotos_urls', resp.data)
        self.assertIn('firma_cliente_url', resp.data)
        self.assertIn('firma_encargado_url', resp.data)
        self.assertIn('equipos_inventario', resp.data)
        self.assertNotIn('status_administrativo', resp.data)

    def test_orden_de_otro_cliente_es_404_no_403(self):
        """404 a propósito: el portal no confirma que exista el servicio de otro."""
        self._auth_cliente()
        resp = self.client.get(_detalle_url(self.ajena.id))
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_filtro_por_mes(self):
        self._auth_cliente()
        Orden.objects.create(
            cliente_id=self.cliente, status='pendiente', fecha_inicio=date(2026, 7, 3)
        )
        agosto = self.client.get(LISTA_URL, {'mes': '2026-08'})
        self.assertEqual([r['id'] for r in agosto.data], [self.mia.id])
        julio = self.client.get(LISTA_URL, {'mes': '2026-07'})
        self.assertEqual(len(julio.data), 1)
        self.assertNotEqual(julio.data[0]['id'], self.mia.id)

    def test_cuenta_suspendida_no_entra(self):
        self.cuenta.status = ClientePortalAccount.STATUS_SUSPENDED
        self.cuenta.save(update_fields=['status'])
        self._auth_cliente()
        self.assertEqual(self.client.get(LISTA_URL).status_code, status.HTTP_403_FORBIDDEN)

    def test_tecnico_no_entra_al_portal(self):
        self.client.force_authenticate(user=self.tecnico)
        self.assertEqual(self.client.get(LISTA_URL).status_code, status.HTTP_403_FORBIDDEN)

    def test_anonimo_no_entra(self):
        self.assertEqual(self.client.get(LISTA_URL).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_el_cliente_no_puede_escribir(self):
        self._auth_cliente()
        for metodo, url in (
            (self.client.post, LISTA_URL),
            (self.client.patch, _detalle_url(self.mia.id)),
            (self.client.delete, _detalle_url(self.mia.id)),
        ):
            resp = metodo(url, {}, format='json')
            self.assertIn(
                resp.status_code,
                (status.HTTP_403_FORBIDDEN, status.HTTP_405_METHOD_NOT_ALLOWED),
            )


class PortalCalificacionTests(APITestCase):
    """Calificar al técnico: como al terminar un viaje — resuelta y una sola vez."""

    def setUp(self):
        self.client = APIClient()
        self.cliente = Cliente.objects.create(nombre='Cliente Uno')
        self.otro_cliente = Cliente.objects.create(nombre='Cliente Dos')

        self.user = User.objects.create_user(username='105041', password='portal-pass-2')
        ClientePortalAccount.objects.create(
            user=self.user,
            cliente=self.cliente,
            portal_username='105041',
            must_change_password=False,
        )
        self.tecnico = User.objects.create_user(
            username='tecnico2', password='tec-pass-2', first_name='Ana', last_name='Ruiz'
        )

        self.resuelta = Orden.objects.create(
            cliente_id=self.cliente, status='resuelto', tecnico_asignado=self.tecnico
        )
        self.pendiente = Orden.objects.create(cliente_id=self.cliente, status='pendiente')
        self.ajena = Orden.objects.create(cliente_id=self.otro_cliente, status='resuelto')

        self.client.force_authenticate(user=self.user)

    def _url(self, orden_id: int) -> str:
        return f'/api/v1/portal-cliente/ordenes/{orden_id}/calificar/'

    def test_califica_una_orden_resuelta(self):
        resp = self.client.post(
            self._url(self.resuelta.id),
            {'estrellas': 5, 'comentario': 'Muy atento y puntual'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['estrellas'], 5)

        calificacion = OrdenCalificacion.objects.get(orden=self.resuelta)
        self.assertEqual(calificacion.tecnico, self.tecnico)
        self.assertEqual(calificacion.creado_por, self.user)
        self.assertEqual(calificacion.comentario, 'Muy atento y puntual')

    def test_comentario_es_opcional(self):
        resp = self.client.post(self._url(self.resuelta.id), {'estrellas': 4}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(OrdenCalificacion.objects.get(orden=self.resuelta).comentario, '')

    def test_no_se_puede_calificar_una_orden_sin_resolver(self):
        resp = self.client.post(self._url(self.pendiente.id), {'estrellas': 5}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(OrdenCalificacion.objects.filter(orden=self.pendiente).exists())

    def test_no_se_califica_dos_veces(self):
        self.client.post(self._url(self.resuelta.id), {'estrellas': 5}, format='json')
        repetida = self.client.post(self._url(self.resuelta.id), {'estrellas': 1}, format='json')
        self.assertEqual(repetida.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(OrdenCalificacion.objects.get(orden=self.resuelta).estrellas, 5)

    def test_estrellas_fuera_de_rango(self):
        for valor in (0, 6, -1):
            resp = self.client.post(
                self._url(self.resuelta.id), {'estrellas': valor}, format='json'
            )
            self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_no_puede_calificar_orden_ajena(self):
        resp = self.client.post(self._url(self.ajena.id), {'estrellas': 5}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_tecnico_no_puede_calificar(self):
        self.client.force_authenticate(user=self.tecnico)
        resp = self.client.post(self._url(self.resuelta.id), {'estrellas': 5}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_el_detalle_expone_puede_calificar_y_la_calificacion(self):
        detalle = self.client.get(_detalle_url(self.resuelta.id)).data
        self.assertTrue(detalle['puede_calificar'])
        self.assertIsNone(detalle['calificacion'])

        self.client.post(self._url(self.resuelta.id), {'estrellas': 3, 'comentario': 'Ok'}, format='json')

        despues = self.client.get(_detalle_url(self.resuelta.id)).data
        self.assertFalse(despues['puede_calificar'])
        self.assertEqual(despues['calificacion']['estrellas'], 3)
        self.assertEqual(despues['calificacion']['comentario'], 'Ok')

    def test_una_orden_sin_resolver_no_ofrece_calificar(self):
        detalle = self.client.get(_detalle_url(self.pendiente.id)).data
        self.assertFalse(detalle['puede_calificar'])
        self.assertIsNone(detalle['calificacion'])
