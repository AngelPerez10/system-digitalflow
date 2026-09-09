"""Notificaciones in-app: API del header + generación por eventos y escaneos."""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.notificaciones import eventos
from apps.notificaciones.models import Notificacion
from apps.operacion.models import PolizaMantenimiento
from apps.ordenes.models import Orden
from apps.users.models import UserPermissions

User = get_user_model()


def _con_permiso_ordenes(user):
    UserPermissions.objects.create(
        user=user,
        permissions={"ordenes": {"view": True, "create": True, "edit": True, "own_only": True}},
    )


class NotificacionesAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="notif_u", password="x")
        self.otro = User.objects.create_user(username="notif_otro", password="x")
        self.client.force_authenticate(self.user)
        for i in range(3):
            Notificacion.objects.create(
                destinatario=self.user, tipo=Notificacion.Tipo.ORDEN_PENDIENTE,
                titulo=f"n{i}", url="/ordenes",
            )
        Notificacion.objects.create(
            destinatario=self.otro, tipo=Notificacion.Tipo.ORDEN_PENDIENTE, titulo="ajena",
        )

    def test_listado_solo_propias_con_contador(self):
        resp = self.client.get("/api/notificaciones/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data["results"]), 3)
        self.assertEqual(resp.data["no_leidas"], 3)

    def test_resumen(self):
        resp = self.client.get("/api/notificaciones/resumen/")
        self.assertEqual(resp.data, {"total": 3, "no_leidas": 3})

    def test_marcar_una_leida(self):
        nid = Notificacion.objects.filter(destinatario=self.user).first().pk
        resp = self.client.post(f"/api/notificaciones/{nid}/leer/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["no_leidas"], 2)
        self.assertIsNotNone(Notificacion.objects.get(pk=nid).leida_at)

    def test_no_puedo_marcar_ajena(self):
        ajena = Notificacion.objects.get(destinatario=self.otro)
        resp = self.client.post(f"/api/notificaciones/{ajena.pk}/leer/")
        self.assertEqual(resp.data["actualizadas"], 0)
        self.assertIsNone(Notificacion.objects.get(pk=ajena.pk).leida_at)

    def test_marcar_todas(self):
        resp = self.client.post("/api/notificaciones/marcar-todas/")
        self.assertEqual(resp.data["no_leidas"], 0)
        self.assertFalse(
            Notificacion.objects.filter(destinatario=self.user, leida_at__isnull=True).exists()
        )

    def test_filtro_no_leidas(self):
        n = Notificacion.objects.filter(destinatario=self.user).first()
        n.leida_at = timezone.now()
        n.save(update_fields=["leida_at"])
        resp = self.client.get("/api/notificaciones/?no_leidas=1")
        self.assertEqual(len(resp.data["results"]), 2)

    def test_requiere_login(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get("/api/notificaciones/").status_code, 401)


class NotificacionesEventosTests(APITestCase):
    def test_orden_liberada_notifica_a_quien_puede_tomarla(self):
        liberador = User.objects.create_user(username="lib", password="x", is_staff=True)
        tecnico = User.objects.create_user(username="tec_pool", password="x")
        _con_permiso_ordenes(tecnico)
        orden = Orden.objects.create(
            cliente="ACME", status="pendiente", prioridad_pool="media",
            en_pool=True, liberada_por=liberador, liberada_at=timezone.now(),
        )

        creadas = eventos.notificar_orden_liberada(orden)

        self.assertGreaterEqual(creadas, 1)
        self.assertTrue(
            Notificacion.objects.filter(
                destinatario=tecnico, tipo=Notificacion.Tipo.ORDEN_LIBERADA
            ).exists()
        )
        # El liberador no se avisa a sí mismo.
        self.assertFalse(Notificacion.objects.filter(destinatario=liberador).exists())
        # Idempotente para la misma liberación.
        self.assertEqual(eventos.notificar_orden_liberada(orden), 0)

    def test_orden_asignada_avisa_al_tecnico(self):
        admin = User.objects.create_user(username="adm", password="x", is_staff=True)
        tecnico = User.objects.create_user(username="tec_asig", password="x")
        orden = Orden.objects.create(cliente="ACME", status="pendiente", tecnico_asignado=tecnico)

        eventos.notificar_orden_asignada(orden, tecnico_id=tecnico.pk, actor_id=admin.pk)
        eventos.notificar_orden_asignada(orden, tecnico_id=tecnico.pk, actor_id=admin.pk)  # dedupe

        self.assertEqual(
            Notificacion.objects.filter(
                destinatario=tecnico, tipo=Notificacion.Tipo.ORDEN_ASIGNADA
            ).count(),
            1,
        )
        # No se avisa si el técnico se autoasigna.
        eventos.notificar_orden_asignada(orden, tecnico_id=tecnico.pk, actor_id=tecnico.pk)
        self.assertEqual(Notificacion.objects.filter(destinatario=tecnico).count(), 1)

    def test_escaneo_prioridad_escalada(self):
        User.objects.create_user(username="adm2", password="x", is_staff=True)
        tecnico = User.objects.create_user(username="tec_esc", password="x")
        orden = Orden.objects.create(
            cliente="ACME", status="pendiente", prioridad_pool="baja", tecnico_asignado=tecnico,
        )
        Orden.objects.filter(pk=orden.pk).update(
            fecha_creacion=timezone.now() - timedelta(hours=100)
        )

        creadas = eventos.escanear_prioridad_escalada()

        self.assertGreaterEqual(creadas, 2)  # admin + técnico
        n = Notificacion.objects.filter(
            destinatario=tecnico, tipo=Notificacion.Tipo.ORDEN_PRIORIDAD_ESCALADA
        ).first()
        self.assertIsNotNone(n)
        self.assertIn("Alta", n.titulo)
        # Segunda corrida no duplica.
        self.assertEqual(eventos.escanear_prioridad_escalada(), 0)

    def test_escaneo_ordenes_pendientes(self):
        User.objects.create_user(username="adm3", password="x", is_staff=True)
        orden = Orden.objects.create(cliente="ACME", status="pendiente", prioridad_pool="media")
        Orden.objects.filter(pk=orden.pk).update(
            fecha_creacion=timezone.now() - timedelta(days=10)
        )
        self.assertGreaterEqual(eventos.escanear_ordenes_pendientes(dias=7), 1)
        self.assertEqual(eventos.escanear_ordenes_pendientes(dias=7), 0)  # dedupe diario

    def test_escaneo_polizas_proximas(self):
        User.objects.create_user(username="adm4", password="x", is_staff=True)
        PolizaMantenimiento.objects.create(
            cliente_nombre="ACME",
            fecha1=(timezone.now().date() + timedelta(days=3)),
            fecha2=(timezone.now().date() + timedelta(days=90)),
        )
        creadas = eventos.escanear_polizas_proximas(dias_aviso=7)
        self.assertGreaterEqual(creadas, 1)
        n = Notificacion.objects.filter(
            tipo=Notificacion.Tipo.POLIZA_MANTENIMIENTO_PROXIMO
        ).first()
        self.assertIsNotNone(n)
        self.assertIn("mantenimiento 1", n.cuerpo)
        self.assertEqual(eventos.escanear_polizas_proximas(dias_aviso=7), 0)  # dedupe por fecha
