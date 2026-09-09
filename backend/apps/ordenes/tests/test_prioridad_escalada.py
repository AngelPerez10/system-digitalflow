"""Escalado automático de `prioridad_pool` por antigüedad de la orden."""

from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from apps.ordenes.models import Orden
from apps.ordenes.prioridad import prioridad_pool_efectiva
from apps.ordenes.serializers import OrdenListSerializer


def _efectiva(base, horas, status="pendiente"):
    creada = timezone.now() - timedelta(hours=horas)
    return prioridad_pool_efectiva(base, creada, status)


class PrioridadEscaladaHelperTests(TestCase):
    def test_sin_escalar_antes_de_72h(self):
        self.assertEqual(_efectiva("baja", 10), "baja")
        self.assertEqual(_efectiva("media", 71), "media")

    def test_escala_un_nivel_entre_72_y_96h(self):
        self.assertEqual(_efectiva("baja", 72), "media")
        self.assertEqual(_efectiva("baja", 95), "media")
        self.assertEqual(_efectiva("media", 80), "alta")

    def test_escala_dos_niveles_a_partir_de_96h(self):
        self.assertEqual(_efectiva("baja", 96), "alta")
        self.assertEqual(_efectiva("baja", 500), "alta")
        self.assertEqual(_efectiva("media", 200), "alta")

    def test_alta_no_sube_mas(self):
        self.assertEqual(_efectiva("alta", 500), "alta")

    def test_resuelta_no_escala(self):
        self.assertEqual(_efectiva("baja", 500, status="resuelto"), "baja")
        self.assertEqual(_efectiva("media", 500, status="completada"), "media")

    def test_sin_prioridad_base_no_escala(self):
        self.assertEqual(_efectiva("", 500), "")

    def test_sin_fecha_creacion_no_escala(self):
        self.assertEqual(prioridad_pool_efectiva("baja", None, "pendiente"), "baja")


class PrioridadEscaladaSerializerTests(TestCase):
    def test_serializer_expone_prioridad_efectiva(self):
        orden = Orden.objects.create(
            cliente="Cliente antiguo", status="pendiente", prioridad_pool="baja"
        )
        Orden.objects.filter(pk=orden.pk).update(
            fecha_creacion=timezone.now() - timedelta(hours=100)
        )
        orden.refresh_from_db()

        data = OrdenListSerializer(orden).data
        self.assertEqual(data["prioridad_pool"], "baja")
        self.assertEqual(data["prioridad_pool_efectiva"], "alta")
