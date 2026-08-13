from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.test import APITestCase

from apps.inventario.models import InventarioItem, InventarioMovimiento
from apps.ordenes.equipos_inventario import (
    normalize_equipos_payload,
    sync_orden_equipos_inventario,
)
from apps.ordenes.models import Orden
from apps.users.models import UserPermissions

User = get_user_model()


def _linea(
    *,
    linea_id='linea-1',
    item_id=1,
    cantidad=1,
    entregado=False,
    instalacion='no_instalado',
    movimiento_id=None,
    nombre='GPS Tracker',
    modelo='GT06',
):
    line = {
        'lineaId': linea_id,
        'inventarioItemId': item_id,
        'codigoBarras': '7501234567890',
        'nombre': nombre,
        'marca': 'Marca',
        'modelo': modelo,
        'imagenUrl': '',
        'cantidad': cantidad,
        'equipoEntregado': entregado,
        'estadoInstalacion': instalacion,
    }
    if movimiento_id is not None:
        line['movimientoSalidaId'] = movimiento_id
    return line


class SyncEquiposInventarioTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin_equipos',
            password='test-pass-123',
            is_staff=True,
        )
        self.tecnico = User.objects.create_user(
            username='tecnico_equipos',
            password='test-pass-123',
        )
        self.otro = User.objects.create_user(
            username='otro_user',
            password='test-pass-123',
        )
        self.item = InventarioItem.objects.create(
            codigo_barras='7501234567890',
            nombre='GPS Tracker',
            marca='Marca',
            modelo='GT06',
            cantidad=5,
        )
        self.orden = Orden.objects.create(
            cliente='Cliente test',
            direccion='Calle 1',
            telefono_cliente='5551234567',
            servicios_realizados=['Instalación'],
            creado_por=self.tecnico,
            tecnico_asignado=self.tecnico,
        )

    def test_admin_entregar_descuenta_stock(self):
        incoming = [
            _linea(item_id=self.item.id, cantidad=2, entregado=True),
        ]
        result = sync_orden_equipos_inventario(
            orden=self.orden,
            incoming=incoming,
            user=self.admin,
            previous=[],
        )
        self.item.refresh_from_db()
        self.assertEqual(self.item.cantidad, 3)
        self.assertEqual(len(result), 1)
        self.assertTrue(result[0]['equipoEntregado'])
        self.assertIsNotNone(result[0].get('movimientoSalidaId'))
        mov = InventarioMovimiento.objects.get(pk=result[0]['movimientoSalidaId'])
        self.assertEqual(mov.tipo, InventarioMovimiento.Tipo.SALIDA)
        self.assertEqual(mov.cantidad, 2)
        self.assertEqual(mov.orden_id, self.orden.id)
        self.assertEqual(mov.orden_linea_id, 'linea-1')
        self.assertEqual(mov.item_id, self.item.id)

    def test_admin_desmarcar_restaura_stock(self):
        previous = sync_orden_equipos_inventario(
            orden=self.orden,
            incoming=[_linea(item_id=self.item.id, cantidad=2, entregado=True)],
            user=self.admin,
            previous=[],
        )
        self.item.refresh_from_db()
        self.assertEqual(self.item.cantidad, 3)
        mov_id = previous[0]['movimientoSalidaId']

        result = sync_orden_equipos_inventario(
            orden=self.orden,
            incoming=[_linea(item_id=self.item.id, cantidad=2, entregado=False)],
            user=self.admin,
            previous=previous,
        )
        self.item.refresh_from_db()
        self.assertEqual(self.item.cantidad, 5)
        self.assertIsNone(result[0].get('movimientoSalidaId'))
        entrada = InventarioMovimiento.objects.filter(
            tipo=InventarioMovimiento.Tipo.ENTRADA,
            orden=self.orden,
            orden_linea_id='linea-1',
        ).first()
        self.assertIsNotNone(entrada)
        self.assertEqual(entrada.cantidad, 2)
        self.assertTrue(
            InventarioMovimiento.objects.filter(pk=mov_id, tipo='salida').exists()
        )

    def test_admin_remove_delivered_line_restores_stock(self):
        previous = sync_orden_equipos_inventario(
            orden=self.orden,
            incoming=[_linea(item_id=self.item.id, cantidad=2, entregado=True)],
            user=self.admin,
            previous=[],
        )
        self.item.refresh_from_db()
        self.assertEqual(self.item.cantidad, 3)

        result = sync_orden_equipos_inventario(
            orden=self.orden,
            incoming=[],
            user=self.admin,
            previous=previous,
        )
        self.item.refresh_from_db()
        self.assertEqual(result, [])
        self.assertEqual(self.item.cantidad, 5)
        self.assertTrue(
            InventarioMovimiento.objects.filter(
                tipo=InventarioMovimiento.Tipo.ENTRADA,
                orden=self.orden,
                orden_linea_id='linea-1',
                cantidad=2,
            ).exists()
        )

    def test_non_admin_no_puede_marcar_entregado(self):
        with self.assertRaises(PermissionDenied) as ctx:
            sync_orden_equipos_inventario(
                orden=self.orden,
                incoming=[_linea(item_id=self.item.id, cantidad=1, entregado=True)],
                user=self.tecnico,
                previous=[],
            )
        self.assertIn('administrador', str(ctx.exception).lower())
        self.item.refresh_from_db()
        self.assertEqual(self.item.cantidad, 5)
        self.assertFalse(InventarioMovimiento.objects.exists())

    def test_tecnico_asignado_puede_cambiar_instalacion(self):
        previous = [
            _linea(
                item_id=self.item.id,
                cantidad=1,
                entregado=True,
                instalacion='no_instalado',
                movimiento_id=999,
            )
        ]
        # Seed a real movimiento so previous looks coherent for stock logic;
        # technician must not trigger stock changes.
        mov = InventarioMovimiento.objects.create(
            item=self.item,
            tipo=InventarioMovimiento.Tipo.SALIDA,
            cantidad=1,
            usuario=self.admin,
            orden=self.orden,
            orden_linea_id='linea-1',
        )
        previous[0]['movimientoSalidaId'] = mov.id
        self.item.cantidad = 4
        self.item.save(update_fields=['cantidad'])

        incoming = [
            _linea(
                item_id=self.item.id,
                cantidad=1,
                entregado=True,
                instalacion='instalado',
                movimiento_id=mov.id,
            )
        ]
        result = sync_orden_equipos_inventario(
            orden=self.orden,
            incoming=incoming,
            user=self.tecnico,
            previous=previous,
        )
        self.assertEqual(result[0]['estadoInstalacion'], 'instalado')
        self.assertEqual(result[0]['movimientoSalidaId'], mov.id)
        self.assertTrue(result[0]['equipoEntregado'])
        self.item.refresh_from_db()
        self.assertEqual(self.item.cantidad, 4)
        self.assertEqual(
            InventarioMovimiento.objects.filter(tipo='entrada').count(),
            0,
        )

    def test_stock_insuficiente_no_cambia_stock(self):
        self.item.cantidad = 1
        self.item.save(update_fields=['cantidad'])
        with self.assertRaises(ValidationError) as ctx:
            sync_orden_equipos_inventario(
                orden=self.orden,
                incoming=[_linea(item_id=self.item.id, cantidad=2, entregado=True)],
                user=self.admin,
                previous=[],
            )
        msg = str(ctx.exception).lower()
        self.assertIn('stock insuficiente', msg)
        self.item.refresh_from_db()
        self.assertEqual(self.item.cantidad, 1)
        self.assertFalse(InventarioMovimiento.objects.exists())

    def test_duplicate_inventario_item_id_validation_error(self):
        raw = [
            _linea(linea_id='a', item_id=self.item.id, cantidad=1),
            _linea(linea_id='b', item_id=self.item.id, cantidad=2),
        ]
        with self.assertRaises(ValidationError):
            normalize_equipos_payload(raw)

    def test_cambiar_cantidad_entregada_requiere_desmarcar(self):
        previous = sync_orden_equipos_inventario(
            orden=self.orden,
            incoming=[_linea(item_id=self.item.id, cantidad=2, entregado=True)],
            user=self.admin,
            previous=[],
        )
        with self.assertRaises(ValidationError) as ctx:
            sync_orden_equipos_inventario(
                orden=self.orden,
                incoming=[_linea(item_id=self.item.id, cantidad=3, entregado=True)],
                user=self.admin,
                previous=previous,
            )
        self.assertIn('desmarca', str(ctx.exception).lower())
        self.item.refresh_from_db()
        self.assertEqual(self.item.cantidad, 3)

    def test_normalize_strips_client_movimiento_salida_id(self):
        cleaned = normalize_equipos_payload(
            [
                _linea(
                    item_id=self.item.id,
                    cantidad=1,
                    movimiento_id=12345,
                )
            ]
        )
        self.assertNotIn('movimientoSalidaId', cleaned[0])
        self.assertEqual(cleaned[0]['inventarioItemId'], self.item.id)
        self.assertEqual(cleaned[0]['cantidad'], 1)

    def test_admin_no_puede_cambiar_producto_misma_linea(self):
        other = InventarioItem.objects.create(
            codigo_barras='7501111222333',
            nombre='Otro GPS',
            marca='Otra',
            modelo='X1',
            cantidad=4,
        )
        previous = sync_orden_equipos_inventario(
            orden=self.orden,
            incoming=[_linea(item_id=self.item.id, cantidad=1, entregado=True)],
            user=self.admin,
            previous=[],
        )
        self.item.refresh_from_db()
        stock_item = self.item.cantidad
        stock_other = other.cantidad
        with self.assertRaises(ValidationError) as ctx:
            sync_orden_equipos_inventario(
                orden=self.orden,
                incoming=[
                    _linea(
                        linea_id='linea-1',
                        item_id=other.id,
                        cantidad=1,
                        entregado=True,
                        nombre='Otro GPS',
                        modelo='X1',
                    )
                ],
                user=self.admin,
                previous=previous,
            )
        self.assertIn('no se puede cambiar el producto', str(ctx.exception).lower())
        self.item.refresh_from_db()
        other.refresh_from_db()
        self.assertEqual(self.item.cantidad, stock_item)
        self.assertEqual(other.cantidad, stock_other)


class OrdenEquiposInventarioAPITests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin_equipos_api',
            password='test-pass-123',
            is_staff=True,
        )
        UserPermissions.objects.create(
            user=self.admin,
            permissions={
                'ordenes': {'view': True, 'create': True, 'edit': True, 'delete': True},
            },
        )
        self.tecnico = User.objects.create_user(
            username='tecnico_equipos_api',
            password='test-pass-123',
        )
        UserPermissions.objects.create(
            user=self.tecnico,
            permissions={
                'ordenes': {'view': True, 'create': True, 'edit': True, 'delete': False},
            },
        )
        self.item = InventarioItem.objects.create(
            codigo_barras='7509876543210',
            nombre='GPS Tracker API',
            marca='Marca',
            modelo='GT06-API',
            cantidad=10,
        )

    def _orden_payload(self, **extra):
        payload = {
            'cliente': 'Cliente API',
            'direccion': 'Calle API 1',
            'telefono_cliente': '5559998877',
            'servicios_realizados': ['Instalación'],
            'status': 'pendiente',
            'fecha_inicio': '2026-08-13',
            'tipo_orden': 'servicio_tecnico',
        }
        payload.update(extra)
        return payload

    def test_admin_post_with_delivered_lines_creates_and_deducts_stock(self):
        self.client.force_authenticate(user=self.admin)
        payload = self._orden_payload(
            equipos_inventario=[
                _linea(item_id=self.item.id, cantidad=3, entregado=True),
            ],
            tecnico_asignado=self.tecnico.id,
        )
        response = self.client.post('/api/ordenes/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('equipos_inventario', response.data)
        self.assertEqual(len(response.data['equipos_inventario']), 1)
        self.assertTrue(response.data['equipos_inventario'][0]['equipoEntregado'])
        self.assertIsNotNone(
            response.data['equipos_inventario'][0].get('movimientoSalidaId')
        )
        self.assertEqual(response.data['equipos_inventario_total'], 1)
        self.assertEqual(response.data['equipos_inventario_entregados'], 1)
        self.item.refresh_from_db()
        self.assertEqual(self.item.cantidad, 7)
        orden = Orden.objects.get(pk=response.data['id'])
        self.assertEqual(len(orden.equipos_inventario), 1)
        self.assertIsNotNone(orden.equipos_inventario[0].get('movimientoSalidaId'))

    def test_tecnico_put_entregado_returns_403(self):
        orden = Orden.objects.create(
            cliente='Cliente tech',
            direccion='Calle T',
            telefono_cliente='5551112233',
            servicios_realizados=['Instalación'],
            creado_por=self.tecnico,
            tecnico_asignado=self.tecnico,
            equipos_inventario=[],
        )
        self.client.force_authenticate(user=self.tecnico)
        payload = self._orden_payload(
            equipos_inventario=[
                _linea(item_id=self.item.id, cantidad=1, entregado=True),
            ],
        )
        response = self.client.put(f'/api/ordenes/{orden.id}/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.item.refresh_from_db()
        self.assertEqual(self.item.cantidad, 10)
        orden.refresh_from_db()
        self.assertEqual(orden.equipos_inventario or [], [])

    def test_assigned_tech_put_instalacion_ok(self):
        orden = Orden.objects.create(
            cliente='Cliente instal',
            direccion='Calle I',
            telefono_cliente='5554445566',
            servicios_realizados=['Instalación'],
            creado_por=self.tecnico,
            tecnico_asignado=self.tecnico,
        )
        previous = sync_orden_equipos_inventario(
            orden=orden,
            incoming=[_linea(item_id=self.item.id, cantidad=2, entregado=True)],
            user=self.admin,
            previous=[],
        )
        orden.equipos_inventario = previous
        orden.save(update_fields=['equipos_inventario'])
        self.item.refresh_from_db()
        stock_after_entrega = self.item.cantidad

        line = dict(previous[0])
        line['estadoInstalacion'] = 'instalado'
        self.client.force_authenticate(user=self.tecnico)
        payload = self._orden_payload(
            equipos_inventario=[line],
            tecnico_asignado=self.tecnico.id,
        )
        response = self.client.put(f'/api/ordenes/{orden.id}/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data['equipos_inventario'][0]['estadoInstalacion'],
            'instalado',
        )
        self.assertEqual(response.data['equipos_inventario_instalados'], 1)
        self.assertTrue(response.data['equipos_inventario'][0]['equipoEntregado'])
        self.assertEqual(
            response.data['equipos_inventario'][0].get('movimientoSalidaId'),
            previous[0]['movimientoSalidaId'],
        )
        self.item.refresh_from_db()
        self.assertEqual(self.item.cantidad, stock_after_entrega)
        self.assertEqual(
            InventarioMovimiento.objects.filter(
                tipo=InventarioMovimiento.Tipo.ENTRADA,
                orden=orden,
            ).count(),
            0,
        )


class OrdenEquiposLimitedEditAPITests(APITestCase):
    """Limited editor (ordenes.edit, not staff, not owner) must not 403 on equipos."""

    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin_equipos_le',
            password='test-pass-123',
            is_staff=True,
        )
        UserPermissions.objects.create(
            user=self.admin,
            permissions={
                'ordenes': {'view': True, 'create': True, 'edit': True, 'delete': True},
            },
        )
        self.owner = User.objects.create_user(
            username='owner_equipos_le',
            password='test-pass-123',
        )
        self.limited = User.objects.create_user(
            username='limited_equipos_le',
            password='test-pass-123',
            is_staff=False,
        )
        UserPermissions.objects.create(
            user=self.limited,
            permissions={
                'ordenes': {
                    'view': True,
                    'create': True,
                    'edit': True,
                    'delete': False,
                    'own_only': False,
                },
            },
        )
        self.item = InventarioItem.objects.create(
            codigo_barras='7505555666777',
            nombre='GPS Limited',
            marca='Marca',
            modelo='GT-LE',
            cantidad=8,
        )

    def _orden_payload(self, **extra):
        payload = {
            'cliente': 'Cliente Limited',
            'direccion': 'Calle Limited 1',
            'telefono_cliente': '5557778899',
            'servicios_realizados': ['Instalación'],
            'status': 'pendiente',
            'fecha_inicio': '2026-08-13',
            'tipo_orden': 'servicio_tecnico',
            'tecnico_asignado': self.owner.id,
        }
        payload.update(extra)
        return payload

    def test_limited_put_problematica_with_normalized_equipos_keeps_stock(self):
        self.client.force_authenticate(user=self.admin)
        create = self.client.post(
            '/api/ordenes/',
            self._orden_payload(
                equipos_inventario=[
                    _linea(item_id=self.item.id, cantidad=2, entregado=True),
                ],
            ),
            format='json',
        )
        self.assertEqual(create.status_code, status.HTTP_201_CREATED)
        orden_id = create.data['id']
        mov_id = create.data['equipos_inventario'][0]['movimientoSalidaId']
        self.assertIsNotNone(mov_id)
        self.item.refresh_from_db()
        stock_after = self.item.cantidad
        self.assertEqual(stock_after, 6)

        # Normalized shape: omit movimientoSalidaId (as client serialize would).
        stripped_line = {
            'lineaId': create.data['equipos_inventario'][0]['lineaId'],
            'inventarioItemId': self.item.id,
            'codigoBarras': '7505555666777',
            'nombre': 'GPS Limited',
            'marca': 'Marca',
            'modelo': 'GT-LE',
            'imagenUrl': '',
            'cantidad': 2,
            'equipoEntregado': True,
            'estadoInstalacion': 'no_instalado',
        }

        self.client.force_authenticate(user=self.limited)
        response = self.client.put(
            f'/api/ordenes/{orden_id}/',
            self._orden_payload(
                problematica='Falla remota limitada',
                equipos_inventario=[stripped_line],
            ),
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        orden = Orden.objects.get(pk=orden_id)
        self.assertEqual(orden.problematica, 'Falla remota limitada')
        self.assertEqual(len(orden.equipos_inventario), 1)
        self.assertEqual(
            orden.equipos_inventario[0].get('movimientoSalidaId'),
            mov_id,
        )
        self.item.refresh_from_db()
        self.assertEqual(self.item.cantidad, stock_after)
        self.assertEqual(
            InventarioMovimiento.objects.filter(
                tipo=InventarioMovimiento.Tipo.ENTRADA,
                orden_id=orden_id,
            ).count(),
            0,
        )
