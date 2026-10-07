import re

from rest_framework import serializers

from .models import Contrato, ContratoEvento
from .prestador import PRESTADOR_KEYS, normalizar_prestador
from .services import enlace_activo

_RFC_RE = re.compile(r"^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$")
_CURP_RE = re.compile(r"^[A-Z]{4}\d{6}[HMX][A-Z]{5}[A-Z0-9]\d$")
_CLAVE_ELECTOR_RE = re.compile(r"^[A-Z0-9]{18}$")


class ContratoSerializer(serializers.ModelSerializer):
    estado_display = serializers.CharField(source="get_estado_display", read_only=True)
    creado_por_nombre = serializers.SerializerMethodField()
    firmado_prestador_por_nombre = serializers.SerializerMethodField()
    enlace_activo = serializers.SerializerMethodField()
    tiene_pdf_sellado = serializers.SerializerMethodField()
    firma_prestador = serializers.SerializerMethodField()
    firma_cliente = serializers.SerializerMethodField()

    class Meta:
        model = Contrato
        fields = [
            "id", "idx", "folio", "cliente",
            "cliente_tipo_persona", "cliente_razon_social", "cliente_rfc", "cliente_regimen_fiscal",
            "cliente_domicilio_fiscal", "cliente_representante", "cliente_clave_elector",
            "cliente_curp", "cliente_correo",
            "domicilio_instalacion", "plan_mbps", "precio_mensual", "vigencia_meses",
            "fecha_firma", "ciudad_firma", "prestador_datos",
            "estado", "estado_display", "documento_sha256",
            "firmado_prestador_at", "firmado_prestador_nombre", "firmado_prestador_por_nombre",
            "firma_cliente_nombre", "firmado_cliente_at", "firmado_cliente_correo",
            "firma_prestador", "firma_cliente",
            "tiene_pdf_sellado", "pdf_sellado_sha256", "sellado_at",
            "enlace_activo",
            "creado_por", "creado_por_nombre", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "idx", "folio", "estado", "documento_sha256",
            "firmado_prestador_at", "firmado_prestador_nombre",
            "firma_cliente_nombre", "firmado_cliente_at", "firmado_cliente_correo",
            "pdf_sellado_sha256", "sellado_at", "creado_por", "created_at", "updated_at",
        ]

    def get_creado_por_nombre(self, obj):
        u = obj.creado_por
        return (u.get_full_name() or u.username) if u else ""

    def get_firmado_prestador_por_nombre(self, obj):
        u = obj.firmado_prestador_por
        return (u.get_full_name() or u.username) if u else ""

    def get_enlace_activo(self, obj):
        enlace = enlace_activo(obj) if obj.pk else None
        if not enlace:
            return None
        return {
            "expira_at": enlace.expira_at,
            "correo_destino": enlace.correo_destino,
            "verificado": bool(enlace.verificado_at),
            "bloqueado": enlace.otp_intentos >= 5,
            "created_at": enlace.created_at,
        }

    def get_tiene_pdf_sellado(self, obj):
        return bool(obj.pdf_sellado)

    def _firma(self, png):
        # Solo en el detalle (vista del contrato); en el listado no se mandan imágenes.
        if self.context.get("incluir_firmas"):
            return png or ""
        return ""

    def get_firma_prestador(self, obj):
        return self._firma(obj.firma_prestador_png)

    def get_firma_cliente(self, obj):
        return self._firma(obj.firma_cliente_png)

    # -------------------------------------------------------- validación

    def _upper(self, attrs, campo, regex, etiqueta):
        if campo not in attrs:
            return
        valor = (attrs.get(campo) or "").strip().upper().replace(" ", "")
        if valor and not regex.match(valor):
            raise serializers.ValidationError({campo: f"{etiqueta} no tiene un formato válido."})
        attrs[campo] = valor

    def validate_prestador_datos(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Formato inválido.")
        desconocidas = set(value) - set(PRESTADOR_KEYS)
        if desconocidas:
            raise serializers.ValidationError("Campos no permitidos: " + ", ".join(sorted(desconocidas)))
        datos = normalizar_prestador(value)
        if datos["correo"]:
            serializers.EmailField().run_validation(datos["correo"])
        return datos

    def validate_cliente_razon_social(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("La razón social / nombre del cliente es obligatoria.")
        return value

    def validate_plan_mbps(self, value):
        if value < 1 or value > 100000:
            raise serializers.ValidationError("Indica un ancho de banda entre 1 y 100,000 Mbps.")
        return value

    def validate_precio_mensual(self, value):
        if value < 0 or value > 10_000_000:
            raise serializers.ValidationError("Precio fuera de rango.")
        return value

    def validate_vigencia_meses(self, value):
        if value < 1 or value > 120:
            raise serializers.ValidationError("La vigencia debe estar entre 1 y 120 meses.")
        return value

    def validate(self, attrs):
        self._upper(attrs, "cliente_rfc", _RFC_RE, "El RFC")
        self._upper(attrs, "cliente_curp", _CURP_RE, "La CURP")
        self._upper(attrs, "cliente_clave_elector", _CLAVE_ELECTOR_RE, "La clave de elector")
        for campo in (
            "cliente_regimen_fiscal", "cliente_domicilio_fiscal", "cliente_representante",
            "cliente_correo", "domicilio_instalacion", "ciudad_firma",
        ):
            if campo in attrs and isinstance(attrs[campo], str):
                attrs[campo] = attrs[campo].strip()
        return attrs


class ContratoEventoSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)
    usuario_nombre = serializers.SerializerMethodField()

    class Meta:
        model = ContratoEvento
        fields = ["id", "tipo", "tipo_display", "ip", "user_agent", "usuario_nombre", "detalle", "created_at"]

    def get_usuario_nombre(self, obj):
        u = obj.usuario
        return (u.get_full_name() or u.username) if u else ""
