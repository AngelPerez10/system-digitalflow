from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import serializers

from apps.clientes.models import Cliente

from .close_validation import validate_proyecto_cierre
from .cotizacion_autorizacion import authorize_pending_digitalflow_cotizaciones
from .models import Proyecto, ProyectoInstalacion
from .tipos_trabajo import (
    assert_tecnico_locked_fields,
    is_assigned_technician_actor,
    normalize_tipos_trabajo,
    sync_legacy_tipo_trabajo,
)

User = get_user_model()


def _equipos_counts(equipos) -> tuple[int, int, int]:
    items = equipos if isinstance(equipos, list) else []
    total = len(items)
    entregados = 0
    instalados = 0
    for eq in items:
        if not isinstance(eq, dict):
            continue
        if eq.get("equipoEntregado"):
            entregados += 1
        if eq.get("estadoInstalacion") == "instalado":
            instalados += 1
    return total, entregados, instalados


def _cotizacion_list_meta(cotizaciones) -> tuple[int, str, str]:
    bloques = cotizaciones if isinstance(cotizaciones, list) else []
    count = len(bloques)
    if count == 0:
        return 0, "—", "digitalflow"
    if count > 1:
        first = bloques[0] if isinstance(bloques[0], dict) else {}
        cot = first.get("cotizacion") if isinstance(first, dict) else None
        origen = "digitalflow"
        if isinstance(cot, dict):
            origen = str(cot.get("origen") or "digitalflow").strip() or "digitalflow"
        return count, f"{count} cotiz.", origen
    first = bloques[0] if isinstance(bloques[0], dict) else {}
    cot = first.get("cotizacion") if isinstance(first, dict) else None
    if not isinstance(cot, dict):
        return count, "—", "digitalflow"
    folio = str(cot.get("folio") or "").strip() or "—"
    origen = str(cot.get("origen") or "digitalflow").strip() or "digitalflow"
    return count, folio, origen


class ProyectoSerializer(serializers.ModelSerializer):
    cliente_id = serializers.PrimaryKeyRelatedField(
        source="cliente",
        queryset=Cliente.objects.all(),
        allow_null=True,
        required=False,
    )
    tecnico_id = serializers.PrimaryKeyRelatedField(
        source="tecnico",
        queryset=User.objects.all(),
        allow_null=True,
        required=False,
    )
    auxiliar_id = serializers.PrimaryKeyRelatedField(
        source="auxiliar",
        queryset=User.objects.all(),
        allow_null=True,
        required=False,
    )

    equipos_total = serializers.SerializerMethodField()
    equipos_entregados = serializers.SerializerMethodField()
    equipos_instalados = serializers.SerializerMethodField()
    cotizaciones_count = serializers.SerializerMethodField()
    cotizacion_folio = serializers.SerializerMethodField()
    cotizacion_origen = serializers.SerializerMethodField()
    creado_por_username = serializers.CharField(
        source="creado_por.username", read_only=True, allow_null=True
    )

    class Meta:
        model = Proyecto
        fields = [
            "id",
            "idx",
            "folio",
            "cliente_id",
            "cliente_nombre",
            "status",
            "motivo_pausa",
            "tipo_trabajo_id",
            "tipo_trabajo_nombre",
            "tipos_trabajo",
            "fecha_autorizacion",
            "quien_autorizo",
            "fechas_inicio",
            "hora_llegada",
            "hora_salida",
            "tecnico_id",
            "tecnico_nombre",
            "auxiliar_id",
            "auxiliar_nombre",
            "vehiculo_asignado",
            "herramientas_generales",
            "cotizaciones",
            "cotizacion_adicional",
            "equipos",
            "notas_por_dia",
            "porcentaje_avance",
            "incidencias",
            "requerimientos_adicionales",
            "requiere_presupuesto_adicional",
            "evidencias_urls",
            "firma_cliente_url",
            "firma_tecnico_url",
            "equipos_total",
            "equipos_entregados",
            "equipos_instalados",
            "cotizaciones_count",
            "cotizacion_folio",
            "cotizacion_origen",
            "creado_por",
            "creado_por_username",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "idx",
            "folio",
            "equipos_total",
            "equipos_entregados",
            "equipos_instalados",
            "cotizaciones_count",
            "cotizacion_folio",
            "cotizacion_origen",
            "creado_por",
            "creado_por_username",
            "created_at",
            "updated_at",
        ]

    def get_equipos_total(self, obj: Proyecto) -> int:
        return _equipos_counts(obj.equipos)[0]

    def get_equipos_entregados(self, obj: Proyecto) -> int:
        return _equipos_counts(obj.equipos)[1]

    def get_equipos_instalados(self, obj: Proyecto) -> int:
        return _equipos_counts(obj.equipos)[2]

    def get_cotizaciones_count(self, obj: Proyecto) -> int:
        return _cotizacion_list_meta(obj.cotizaciones)[0]

    def get_cotizacion_folio(self, obj: Proyecto) -> str:
        return _cotizacion_list_meta(obj.cotizaciones)[1]

    def get_cotizacion_origen(self, obj: Proyecto) -> str:
        return _cotizacion_list_meta(obj.cotizaciones)[2]

    def validate_porcentaje_avance(self, value):
        if value is None:
            return 0
        return max(0, min(100, int(value)))

    def validate_folio(self, value):
        if isinstance(value, str) and value.strip() == "":
            return None
        return value

    def validate(self, attrs):
        attrs = super().validate(attrs)
        instance = getattr(self, "instance", None)
        request = self.context.get("request")
        user = getattr(request, "user", None) if request is not None else None

        if instance is not None and is_assigned_technician_actor(user, instance):
            lock_errors = assert_tecnico_locked_fields(instance, attrs)
            if lock_errors:
                raise serializers.ValidationError(lock_errors)

        if "tipos_trabajo" in attrs:
            tipos = normalize_tipos_trabajo(attrs.get("tipos_trabajo"))
        elif "tipo_trabajo_id" in attrs or "tipo_trabajo_nombre" in attrs:
            tid = attrs.get(
                "tipo_trabajo_id",
                getattr(instance, "tipo_trabajo_id", None) if instance else None,
            )
            tname = attrs.get(
                "tipo_trabajo_nombre",
                getattr(instance, "tipo_trabajo_nombre", "") if instance else "",
            )
            tipos = normalize_tipos_trabajo(
                [{"id": tid, "nombre": tname or ""}] if tid else []
            )
        elif instance is not None:
            tipos = normalize_tipos_trabajo(getattr(instance, "tipos_trabajo", None))
            if not tipos and getattr(instance, "tipo_trabajo_id", None):
                tipos = normalize_tipos_trabajo(
                    [
                        {
                            "id": instance.tipo_trabajo_id,
                            "nombre": instance.tipo_trabajo_nombre or "",
                        }
                    ]
                )
        else:
            tipos = []

        if (
            "tipos_trabajo" in attrs
            or "tipo_trabajo_id" in attrs
            or "tipo_trabajo_nombre" in attrs
            or instance is None
        ):
            attrs["tipos_trabajo"] = tipos
            legacy_id, legacy_nombre = sync_legacy_tipo_trabajo(tipos)
            attrs["tipo_trabajo_id"] = legacy_id
            attrs["tipo_trabajo_nombre"] = legacy_nombre

        status = attrs.get("status", getattr(instance, "status", "en_proceso"))
        requiere = attrs.get(
            "requiere_presupuesto_adicional",
            getattr(instance, "requiere_presupuesto_adicional", False) if instance else False,
        )
        requerimientos = attrs.get(
            "requerimientos_adicionales",
            getattr(instance, "requerimientos_adicionales", "") if instance else "",
        )
        cotizacion_adicional = attrs.get(
            "cotizacion_adicional",
            getattr(instance, "cotizacion_adicional", None) if instance else None,
        )

        result = validate_proyecto_cierre(
            status=status,
            requiere_presupuesto_adicional=bool(requiere),
            requerimientos_adicionales=requerimientos,
            cotizacion_adicional=cotizacion_adicional,
        )
        if not result.ok:
            raise serializers.ValidationError({"status": [result.message]})
        return attrs

    def create(self, validated_data):
        with transaction.atomic():
            instance = super().create(validated_data)
            authorize_pending_digitalflow_cotizaciones(instance.cotizaciones)
            return instance

    def update(self, instance, validated_data):
        request = self.context.get("request")
        user = getattr(request, "user", None) if request is not None else None
        with transaction.atomic():
            instance = super().update(instance, validated_data)
            # Técnico asignado no vincula cotizaciones; no debe autorizar por side-effect.
            if not is_assigned_technician_actor(user, instance):
                authorize_pending_digitalflow_cotizaciones(instance.cotizaciones)
            return instance


class ProyectoInstalacionSerializer(serializers.ModelSerializer):
    proyecto = serializers.PrimaryKeyRelatedField(queryset=Proyecto.objects.all())
    proyecto_idx = serializers.IntegerField(source="proyecto.idx", read_only=True, allow_null=True)
    proyecto_folio = serializers.SerializerMethodField()
    cliente_nombre = serializers.CharField(source="proyecto.cliente_nombre", read_only=True)

    class Meta:
        model = ProyectoInstalacion
        fields = [
            "id",
            "idx",
            "proyecto",
            "proyecto_idx",
            "proyecto_folio",
            "cliente_nombre",
            "payload",
            "dibujo_url",
            "creado_por",
            "fecha_creacion",
            "fecha_actualizacion",
        ]
        read_only_fields = [
            "id",
            "idx",
            "proyecto_idx",
            "proyecto_folio",
            "cliente_nombre",
            "creado_por",
            "fecha_creacion",
            "fecha_actualizacion",
        ]

    def get_proyecto_folio(self, obj: ProyectoInstalacion) -> str:
        from apps.common.document_folio import FOLIO_SERIE_PRJ, resolve_document_folio

        proyecto = obj.proyecto
        return resolve_document_folio(FOLIO_SERIE_PRJ, getattr(proyecto, "folio", None), getattr(proyecto, "idx", None))

    def validate_payload(self, value):
        if value is None:
            return {}
        if not isinstance(value, dict):
            raise serializers.ValidationError("payload debe ser un objeto JSON.")
        return value

    def validate_dibujo_url(self, value):
        if value is None:
            return ""
        return str(value)

    def validate_proyecto(self, proyecto: Proyecto) -> Proyecto:
        request = self.context.get("request")
        user = getattr(request, "user", None) if request is not None else None
        if not user or not getattr(user, "is_authenticated", False):
            return proyecto
        from apps.users.permissions import user_module_own_only

        if not user_module_own_only(user, "proyectos"):
            return proyecto
        allowed = (
            proyecto.creado_por_id == getattr(user, "id", None)
            or proyecto.tecnico_id == getattr(user, "id", None)
            or proyecto.auxiliar_id == getattr(user, "id", None)
        )
        if not allowed:
            raise serializers.ValidationError("No tienes acceso a este proyecto.")
        return proyecto
