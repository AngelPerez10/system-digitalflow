"""Historial de reasignaciones del tablero Equipo (solo administradores).

- GET  /api/equipo-historial/?limit=50[&tipo=orden&objeto_id=12][&mes=2026-09]  → más recientes primero
- POST /api/equipo-historial/  → registra una reasignación o un «deshacer»
  (cambio de técnico, de día —`desde_fecha`/`hacia_fecha`— o ambos)

La reasignación en sí sigue haciéndose con el PATCH de cada módulo (órdenes /
proyectos); el tablero registra aquí el movimiento cuando el guardado sale bien.
"""

from rest_framework import mixins, serializers, viewsets
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response

from .models import EquipoReasignacion


class IsStaffOrSuperuser(BasePermission):
    """Mismo criterio de «administrador» que el resto de la app (staff o superuser)."""

    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        return bool(
            user
            and user.is_authenticated
            and (getattr(user, "is_staff", False) or getattr(user, "is_superuser", False))
        )


class EquipoReasignacionSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.SerializerMethodField()
    usuario_avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = EquipoReasignacion
        fields = [
            "id",
            "tipo",
            "objeto_id",
            "folio",
            "cliente",
            "accion",
            "desde_id",
            "desde_nombre",
            "hacia_id",
            "hacia_nombre",
            "desde_fecha",
            "hacia_fecha",
            "usuario",
            "usuario_nombre",
            "usuario_avatar_url",
            "creado_at",
        ]
        read_only_fields = ["id", "usuario", "usuario_nombre", "usuario_avatar_url", "creado_at"]

    def get_usuario_nombre(self, obj):
        u = obj.usuario
        if not u:
            return ""
        full = f"{(u.first_name or '').strip()} {(u.last_name or '').strip()}".strip()
        return full or u.username or u.email or ""

    def get_usuario_avatar_url(self, obj):
        perfil = getattr(obj.usuario, "permissions_profile", None) if obj.usuario else None
        return (getattr(perfil, "avatar_url", "") or "").strip()

    def validate(self, attrs):
        mismo_tecnico = attrs.get("desde_id") == attrs.get("hacia_id")
        mismo_dia = attrs.get("desde_fecha") == attrs.get("hacia_fecha")
        if mismo_tecnico and mismo_dia:
            raise serializers.ValidationError("El origen y el destino son el mismo técnico y el mismo día.")
        for key in ("folio", "cliente", "desde_nombre", "hacia_nombre"):
            if key in attrs:
                attrs[key] = str(attrs[key] or "").strip()
        return attrs


class EquipoReasignacionViewSet(
    mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet
):
    serializer_class = EquipoReasignacionSerializer
    permission_classes = [IsAuthenticated, IsStaffOrSuperuser]
    pagination_class = None

    MAX_LIMIT = 200
    # Con `?mes=YYYY-MM` (reporte mensual) se permite traer todo el mes.
    MAX_LIMIT_MES = 2000
    DEFAULT_LIMIT = 50

    def get_queryset(self):
        qs = EquipoReasignacion.objects.select_related(
            "usuario", "usuario__permissions_profile"
        )
        params = self.request.query_params
        tipo = (params.get("tipo") or "").strip()
        if tipo in ("orden", "proyecto"):
            qs = qs.filter(tipo=tipo)
        objeto_id = (params.get("objeto_id") or "").strip()
        if objeto_id.isdigit():
            qs = qs.filter(objeto_id=int(objeto_id))
        mes = (params.get("mes") or "").strip()
        if len(mes) == 7 and mes[:4].isdigit() and mes[4] == "-" and mes[5:].isdigit():
            anio, mes_num = int(mes[:4]), int(mes[5:])
            if 1 <= mes_num <= 12:
                qs = qs.filter(creado_at__year=anio, creado_at__month=mes_num)
        return qs

    def list(self, request, *args, **kwargs):
        raw = (request.query_params.get("limit") or "").strip()
        limit = int(raw) if raw.isdigit() else self.DEFAULT_LIMIT
        tope = self.MAX_LIMIT_MES if (request.query_params.get("mes") or "").strip() else self.MAX_LIMIT
        limit = min(max(limit, 1), tope)
        rows = self.get_queryset()[:limit]
        return Response(self.get_serializer(rows, many=True).data)

    def perform_create(self, serializer):
        serializer.save(usuario=self.request.user)
