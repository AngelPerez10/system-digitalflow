import logging
import os
from datetime import date, datetime
from decimal import Decimal

from django.http import HttpResponse
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cotizaciones.pdf_render import PdfRenderError, any_provider_configured, render_html_to_pdf
from apps.cotizaciones.sicar_cfdi_pdf import cfdi_download_filename, generate_cfdi_pdf_html
from apps.cotizaciones.sicar_db import (
    _connect_sicar,
    _sicar_db_config,
    _sicar_error_detail,
)
from apps.cotizaciones.sicar_factura_service import (
    SicarFacturaError,
    create_timbrada_factura,
    get_sicar_cliente,
    list_sicar_series,
    search_sicar_clientes,
)
from apps.cotizaciones.views import CotizacionesPermission

logger = logging.getLogger(__name__)

PRIMARY_TABLE = "facturacfdi"
PRIMARY_KEY = "fcf_id"

# Evita DATE_FORMAT(..., '%Y-%m'): PyMySQL interpreta % en el SQL y rompe el agrupado por mes.
_MONTH_KEY_SQL = "CONCAT(YEAR(fecha), '-', LPAD(MONTH(fecha), 2, '0'))"

CFDI_DETAIL_TABLES = (
    "facturacfdi",
    "facturacfdiimp",
    "facturacfdiven",
)

LIST_SELECT = """
  fcf_id,
  serieFolio AS serie_folio,
  folio,
  fecha,
  nombreC AS nombre_c,
  rfcC AS rfc_c,
  subtotal,
  total,
  status,
  cli_id,
  uuid,
  formaPago AS forma_pago,
  metodoPago AS metodo_pago
"""


def _json_value(value):
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat(sep=" ", timespec="seconds")
    if isinstance(value, (bytes, bytearray)):
        return value.decode("utf-8", errors="replace")
    return value


def _serialize_row(row: dict | None) -> dict:
    if not row:
        return {}
    return {str(k): _json_value(v) for k, v in row.items()}


def _serialize_rows(rows: list[dict]) -> list[dict]:
    return [_serialize_row(r) for r in rows]


def _month_filter_sql(month: str | None) -> tuple[str, tuple]:
    month_value = (month or "").strip()
    if not month_value or len(month_value) != 7 or month_value[4] != "-":
        return "", ()
    return f" {_MONTH_KEY_SQL} = %s ", (month_value,)


def _search_filter_sql(q: str | None) -> tuple[str, tuple]:
    q_value = (q or "").strip()
    if not q_value:
        return "", ()
    like = f"%{q_value}%"
    return (
        " ("
        "CAST(fcf_id AS CHAR) LIKE %s OR "
        "serieFolio LIKE %s OR "
        "CAST(folio AS CHAR) LIKE %s OR "
        "nombreC LIKE %s OR "
        "rfcC LIKE %s OR "
        "uuid LIKE %s"
        ") ",
        (like, like, like, like, like, like),
    )


def _list_where_sql(month: str | None, q: str | None) -> tuple[str, tuple]:
    parts: list[str] = []
    params: list = []
    month_sql, month_params = _month_filter_sql(month)
    search_sql, search_params = _search_filter_sql(q)
    if month_sql:
        parts.append(month_sql.strip())
        params.extend(month_params)
    if search_sql:
        parts.append(search_sql.strip())
        params.extend(search_params)
    if not parts:
        return "", ()
    return f" WHERE {' AND '.join(parts)} ", tuple(params)


def _fetch_month_buckets(cursor) -> list[dict]:
    cursor.execute(
        f"""
        SELECT {_MONTH_KEY_SQL} AS month_key, COUNT(*) AS total
        FROM {PRIMARY_TABLE}
        GROUP BY {_MONTH_KEY_SQL}
        ORDER BY month_key DESC
        """
    )
    return cursor.fetchall() or []


def _resolve_default_month(cursor) -> str:
    cursor.execute(
        f"""
        SELECT {_MONTH_KEY_SQL} AS month_key
        FROM {PRIMARY_TABLE}
        ORDER BY fecha DESC, {PRIMARY_KEY} DESC
        LIMIT 1
        """
    )
    row = cursor.fetchone() or {}
    return str(row.get("month_key") or "")


def _sicar_config_or_response():
    cfg = _sicar_db_config()
    missing = [k for k in ("host", "user", "password", "database") if not cfg.get(k)]
    if missing:
        return None, Response({"detail": f"Faltan variables SICAR en entorno: {', '.join(missing)}"}, status=500)
    return cfg, None


def _fetch_factura_archivos(cursor, fcf_id: int) -> dict | None:
    """Solo lectura: facturacfdi + XML/QR desde xmlcfdi + diasCredito del cliente."""
    cursor.execute(
        f"""
        SELECT f.*, x.cfdi AS xml_cfdi, x.cbb AS cbb_png, c.diasCredito AS diasCredito
        FROM {PRIMARY_TABLE} f
        LEFT JOIN xmlcfdi x ON x.xcf_id = f.xcf_id
        LEFT JOIN cliente c ON c.cli_id = f.cli_id
        WHERE f.{PRIMARY_KEY} = %s
        LIMIT 1
        """,
        (fcf_id,),
    )
    row = cursor.fetchone()
    if not row:
        return None
    cursor.execute(
        "SELECT * FROM facturacfdiimp WHERE fcf_id = %s ORDER BY orden, imp_id",
        (fcf_id,),
    )
    row["_impuestos"] = cursor.fetchall() or []
    return row


def _attachment_response(content: bytes, content_type: str, filename: str, *, inline: bool = False) -> HttpResponse:
    disposition = "inline" if inline else "attachment"
    response = HttpResponse(content, content_type=content_type)
    response["Content-Disposition"] = f'{disposition}; filename="{filename}"'
    return response


class SicarFacturasListView(APIView):
    """Lista y creación de facturas CFDI en SICAR."""

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), CotizacionesPermission()]
        return [IsAuthenticated()]

    def get(self, request):
        try:
            page = max(1, int(request.query_params.get("page", "1")))
        except Exception:
            page = 1
        try:
            page_size = max(1, min(int(request.query_params.get("page_size", "25")), 500))
        except Exception:
            page_size = 25

        offset = (page - 1) * page_size
        month = (request.query_params.get("month", "") or "").strip()
        q = (request.query_params.get("q", "") or "").strip()

        cfg = _sicar_db_config()
        missing = [k for k in ("host", "user", "password", "database") if not cfg.get(k)]
        if missing:
            return Response({"detail": f"Faltan variables SICAR en entorno: {', '.join(missing)}"}, status=500)

        conn = None
        try:
            conn = _connect_sicar(cfg)
            with conn.cursor() as cursor:
                months = _fetch_month_buckets(cursor)
                active_month = month
                if q:
                    where_sql, where_params = _list_where_sql(None, q)
                else:
                    active_month = month or _resolve_default_month(cursor)
                    if not active_month:
                        return Response({"detail": "No hay facturas CFDI registradas."}, status=404)
                    where_sql, where_params = _list_where_sql(active_month, None)
                    if not where_params:
                        return Response(
                            {
                                "source_table": PRIMARY_TABLE,
                                "rows": [],
                                "month": None,
                                "months": months,
                                "q": None,
                                "pagination": {
                                    "page": 1,
                                    "page_size": page_size,
                                    "total": 0,
                                    "total_pages": 1,
                                },
                            }
                        )

                cursor.execute(f"SELECT COUNT(*) AS total FROM {PRIMARY_TABLE}{where_sql}", where_params)
                total = int((cursor.fetchone() or {}).get("total") or 0)

                cursor.execute(
                    f"""
                    SELECT {LIST_SELECT}
                    FROM {PRIMARY_TABLE}
                    {where_sql}
                    ORDER BY fecha DESC, {PRIMARY_KEY} DESC
                    LIMIT %s OFFSET %s
                    """,
                    (*where_params, page_size, offset),
                )
                rows = _serialize_rows(cursor.fetchall() or [])

            total_pages = (total + page_size - 1) // page_size if total > 0 else 1
            return Response(
                {
                    "source_table": PRIMARY_TABLE,
                    "rows": rows,
                    "month": (active_month or None) if not q else None,
                    "months": months,
                    "q": q or None,
                    "pagination": {
                        "page": page,
                        "page_size": page_size,
                        "total": total,
                        "total_pages": total_pages,
                    },
                }
            )
        except Exception as exc:
            logger.exception("Error consultando %s en SICAR", PRIMARY_TABLE)
            return Response({"detail": _sicar_error_detail(exc, cfg)}, status=502)
        finally:
            if conn is not None:
                try:
                    conn.close()
                except Exception:
                    pass

    def post(self, request):
        cfg = _sicar_db_config()
        missing = [k for k in ("host", "user", "password", "database") if not cfg.get(k)]
        if missing:
            return Response({"detail": f"Faltan variables SICAR en entorno: {', '.join(missing)}"}, status=500)
        try:
            result = create_timbrada_factura(request.data if isinstance(request.data, dict) else {})
            return Response(result, status=201)
        except SicarFacturaError as exc:
            logger.warning("Alta factura SICAR rechazada: %s", exc)
            return Response({"detail": str(exc)}, status=400)
        except Exception as exc:
            logger.exception("Error creando factura SICAR")
            return Response({"detail": _sicar_error_detail(exc, cfg)}, status=502)


class SicarFacturaCatalogosView(APIView):
    """Series CFDI y catálogos mínimos para el formulario."""

    permission_classes = [IsAuthenticated, CotizacionesPermission]

    def get(self, request):
        cfg, err = _sicar_config_or_response()
        if err:
            return err
        conn = None
        try:
            conn = _connect_sicar(cfg)
            with conn.cursor() as cursor:
                series = _serialize_rows(list_sicar_series(cursor))
            return Response(
                {
                    "series": series,
                    "forma_pago": [
                        {"clave": "01", "label": "01-Efectivo"},
                        {"clave": "03", "label": "03-Transferencia electrónica de fondos"},
                        {"clave": "04", "label": "04-Tarjeta de crédito"},
                        {"clave": "28", "label": "28-Tarjeta de débito"},
                        {"clave": "99", "label": "99-Por definir"},
                    ],
                    "metodo_pago": [
                        {"clave": "PUE", "label": "PUE-Pago en una sola exhibición"},
                        {"clave": "PPD", "label": "PPD-Pago en parcialidades o diferido"},
                    ],
                    "uso_cfdi": [
                        {"clave": "G01", "label": "G01-Adquisición de mercancías"},
                        {"clave": "G02", "label": "G02-Devoluciones, descuentos o bonificaciones"},
                        {"clave": "G03", "label": "G03-Gastos en general"},
                        {"clave": "I01", "label": "I01-Construcciones"},
                        {"clave": "I04", "label": "I04-Equipo de computo y accesorios"},
                        {"clave": "I08", "label": "I08-Otra maquinaria y equipo"},
                        {"clave": "D01", "label": "D01-Honorarios médicos, dentales y gastos hospitalarios"},
                        {"clave": "P01", "label": "P01-Por definir"},
                        {"clave": "S01", "label": "S01-Sin efectos fiscales"},
                        {"clave": "CP01", "label": "CP01-Pagos"},
                    ],
                }
            )
        except Exception as exc:
            logger.exception("Error cargando catálogos SICAR")
            return Response({"detail": _sicar_error_detail(exc, cfg)}, status=502)
        finally:
            if conn is not None:
                try:
                    conn.close()
                except Exception:
                    pass


class SicarClientesSearchView(APIView):
    """Búsqueda de clientes en SICAR para facturación."""

    permission_classes = [IsAuthenticated, CotizacionesPermission]

    def get(self, request):
        cfg, err = _sicar_config_or_response()
        if err:
            return err
        q = (request.query_params.get("q") or "").strip()
        try:
            limit = max(1, min(int(request.query_params.get("limit", "25")), 100))
        except Exception:
            limit = 25
        conn = None
        try:
            conn = _connect_sicar(cfg)
            with conn.cursor() as cursor:
                rows = _serialize_rows(search_sicar_clientes(cursor, q=q, limit=limit))
            return Response({"items": rows, "q": q or None})
        except Exception as exc:
            logger.exception("Error buscando clientes SICAR")
            return Response({"detail": _sicar_error_detail(exc, cfg)}, status=502)
        finally:
            if conn is not None:
                try:
                    conn.close()
                except Exception:
                    pass


class SicarClienteDetailView(APIView):
    """Detalle de un cliente SICAR para el formulario de factura."""

    permission_classes = [IsAuthenticated, CotizacionesPermission]

    def get(self, request, cli_id: int):
        cfg, err = _sicar_config_or_response()
        if err:
            return err
        conn = None
        try:
            conn = _connect_sicar(cfg)
            with conn.cursor() as cursor:
                row = get_sicar_cliente(cursor, cli_id)
            if not row:
                return Response({"detail": f"Cliente SICAR cli_id={cli_id} no encontrado."}, status=404)
            return Response(_serialize_row(row))
        except Exception as exc:
            logger.exception("Error cargando cliente SICAR %s", cli_id)
            return Response({"detail": _sicar_error_detail(exc, cfg)}, status=502)
        finally:
            if conn is not None:
                try:
                    conn.close()
                except Exception:
                    pass


class SicarFacturaDetalleView(APIView):
    """Detalle CFDI: facturacfdi + imp + ven."""

    permission_classes = [IsAuthenticated]

    def get(self, request, fcf_id: int):
        cfg = _sicar_db_config()
        missing = [k for k in ("host", "user", "password", "database") if not cfg.get(k)]
        if missing:
            return Response({"detail": f"Faltan variables SICAR en entorno: {', '.join(missing)}"}, status=500)

        conn = None
        try:
            conn = _connect_sicar(cfg, read_timeout=15)
            payload = {}

            for table_name in CFDI_DETAIL_TABLES:
                with conn.cursor() as cursor:
                    cursor.execute(
                        f"SELECT * FROM `{table_name}` WHERE `fcf_id` = %s LIMIT 500",
                        (fcf_id,),
                    )
                    payload[table_name] = _serialize_rows(cursor.fetchall() or [])

            if not payload.get("facturacfdi"):
                return Response({"detail": "CFDI no encontrado."}, status=404)

            return Response(
                {
                    "fcf_id": fcf_id,
                    "source_table": PRIMARY_TABLE,
                    "tables": payload,
                }
            )
        except Exception as exc:
            logger.exception("Error consultando detalle SICAR fcf_id=%s", fcf_id)
            return Response({"detail": _sicar_error_detail(exc, cfg)}, status=502)
        finally:
            if conn is not None:
                try:
                    conn.close()
                except Exception:
                    pass


class SicarFacturaXmlView(APIView):
    """Descarga el XML timbrado original desde xmlcfdi (solo lectura)."""

    permission_classes = [IsAuthenticated]

    def get(self, request, fcf_id: int):
        cfg, err = _sicar_config_or_response()
        if err:
            return err

        conn = None
        try:
            conn = _connect_sicar(cfg, read_timeout=20)
            with conn.cursor() as cursor:
                row = _fetch_factura_archivos(cursor, fcf_id)
            if not row:
                return Response({"detail": "CFDI no encontrado."}, status=404)

            xml_bytes = row.get("xml_cfdi")
            if not xml_bytes:
                return Response({"detail": "Este CFDI no tiene XML timbrado en SICAR."}, status=404)

            filename = cfdi_download_filename(
                str(row.get("serieFolio") or ""),
                str(row.get("uuid") or ""),
                "xml",
            )
            if isinstance(xml_bytes, str):
                xml_bytes = xml_bytes.encode("utf-8")
            return _attachment_response(bytes(xml_bytes), "application/xml; charset=utf-8", filename)
        except Exception as exc:
            logger.exception("Error descargando XML SICAR fcf_id=%s", fcf_id)
            return Response({"detail": _sicar_error_detail(exc, cfg)}, status=502)
        finally:
            if conn is not None:
                try:
                    conn.close()
                except Exception:
                    pass


class SicarFacturaPdfView(APIView):
    """Genera PDF imprimible a partir del XML/datos SICAR (solo lectura)."""

    permission_classes = [IsAuthenticated]

    def get(self, request, fcf_id: int):
        cfg, err = _sicar_config_or_response()
        if err:
            return err

        wants_html = (request.query_params.get("format") or "").lower() == "html"

        conn = None
        try:
            conn = _connect_sicar(cfg, read_timeout=20)
            with conn.cursor() as cursor:
                row = _fetch_factura_archivos(cursor, fcf_id)
            if not row:
                return Response({"detail": "CFDI no encontrado."}, status=404)

            impuestos = row.pop("_impuestos", [])
            xml_bytes = row.get("xml_cfdi")
            cbb_png = row.get("cbb_png")
            serie_folio = str(row.get("serieFolio") or "")
            uuid = str(row.get("uuid") or "")
            filename = cfdi_download_filename(serie_folio, uuid, "pdf")

            html = generate_cfdi_pdf_html(
                row,
                xml_bytes=xml_bytes,
                cbb_png=cbb_png,
                impuestos=impuestos,
            )
            if not html:
                return Response({"detail": "No se pudo generar la representación del CFDI."}, status=500)

            if wants_html or not any_provider_configured():
                response = HttpResponse(html, content_type="text/html; charset=utf-8")
                response["Content-Disposition"] = f'inline; filename="{filename.replace(".pdf", ".html")}"'
                return response

            try:
                pdf_bytes = render_html_to_pdf(html, size="Letter", landscape=False, timeout=90)
            except PdfRenderError:
                logger.exception("PDF CFDI render failed fcf_id=%s", fcf_id)
                return Response({"detail": "No se pudo generar el PDF."}, status=502)

            return _attachment_response(pdf_bytes, "application/pdf", filename, inline=True)
        except Exception as exc:
            logger.exception("Error generando PDF SICAR fcf_id=%s", fcf_id)
            return Response({"detail": _sicar_error_detail(exc, cfg)}, status=502)
        finally:
            if conn is not None:
                try:
                    conn.close()
                except Exception:
                    pass
