from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.clientes.models import Cliente

from .close_validation import validate_proyecto_cierre
from .models import Proyecto

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
            "fecha_autorizacion",
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
