"""Creación de factura CFDI timbrada en SICAR (venta + factura + XML)."""
from __future__ import annotations

import logging
import re
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from num2words import num2words

from apps.cotizaciones.sicar_cfdi_builder import build_cfdi_xml
from apps.cotizaciones.sicar_cfdi_sign import sign_cfdi_xml
from apps.cotizaciones.sicar_cfdi_stamp import SicarStampError, build_qr_png, stamp_cfdi_xml
from apps.cotizaciones.sicar_db import (
    _connect_sicar,
    _sicar_db_config,
    execute,
    fetch_all,
    fetch_one,
    last_insert_id,
    sicar_setting_int,
    sicar_setting_str,
)

logger = logging.getLogger(__name__)


class SicarFacturaError(Exception):
    pass


def _money(value: Decimal | float | int) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _total_letra(total: Decimal) -> str:
    entero = int(total)
    centavos = int((_money(total) - Decimal(entero)) * 100)
    palabras = num2words(entero, lang="es").upper()
    return f"({palabras} PESOS {centavos:02d}/100 MN)"


def _label_with_clave(clave: str, descripcion: str) -> str:
    clave = str(clave or "").strip()
    desc = str(descripcion or "").strip()
    if not clave:
        return desc
    if desc.lower().startswith(clave.lower()):
        return desc
    return f"{clave}-{desc}" if desc else clave


def _load_empresa(cursor) -> dict[str, Any]:
    row = fetch_one(cursor, "SELECT * FROM empresa WHERE emp_id = 1 LIMIT 1")
    if not row:
        raise SicarFacturaError("No se encontró configuración de empresa en SICAR.")
    return row


def _load_csd(cursor) -> dict[str, Any]:
    row = fetch_one(
        cursor,
        "SELECT * FROM sellodigital WHERE seleccionado = 1 ORDER BY sdi_id DESC LIMIT 1",
    )
    if not row:
        raise SicarFacturaError("No hay CSD seleccionado en sellodigital.")
    password = sicar_setting_str("SICAR_CSD_PASSWORD")
    if not password:
        password = str(row.get("pwd") or "")
    if not password:
        raise SicarFacturaError("Configure SICAR_CSD_PASSWORD en backend/.env.")
    row["_password"] = password
    return row


def _load_cliente(cursor, cli_id: int) -> dict[str, Any]:
    row = fetch_one(cursor, "SELECT * FROM cliente WHERE cli_id = %s LIMIT 1", (cli_id,))
    if not row:
        raise SicarFacturaError(f"Cliente SICAR cli_id={cli_id} no encontrado.")
    return row


def _load_serie(cursor, scf_id: int) -> dict[str, Any]:
    row = fetch_one(cursor, "SELECT * FROM seriecfdi WHERE scf_id = %s LIMIT 1", (scf_id,))
    if not row:
        raise SicarFacturaError(f"Serie CFDI scf_id={scf_id} no encontrada.")
    return row


def _reserve_folio(cursor, scf_id: int) -> tuple[int, str]:
    row = fetch_one(
        cursor,
        "SELECT COALESCE(MAX(folio), 0) + 1 AS next_folio FROM facturacfdi WHERE scf_id = %s FOR UPDATE",
        (scf_id,),
    )
    serie_row = _load_serie(cursor, scf_id)
    folio = int((row or {}).get("next_folio") or 1)
    serie = str(serie_row.get("serie") or "").strip()
    serie_folio = f"{serie}-{folio}" if serie else str(folio)
    return folio, serie_folio


def _emisor_from_empresa(empresa: dict[str, Any]) -> dict[str, Any]:
    return {
        "rfc": empresa["rfc"],
        "nombre": empresa.get("nombreFiscal") or empresa.get("nombre"),
        "regimen": empresa.get("regimen") or "601-General de Ley Personas Morales",
        "codigo_postal": empresa.get("codigoPostalFiscal") or empresa.get("codigoPostal"),
        "domicilio": empresa.get("domicilioFiscal") or empresa.get("domicilio"),
        "colonia": empresa.get("coloniaFiscal") or "",
        "localidad": empresa.get("localidad") or empresa.get("ciudadFiscal") or "",
        "ciudad": empresa.get("ciudadFiscal") or empresa.get("ciudad") or "",
        "estado": empresa.get("estadoFiscal") or empresa.get("estado") or "",
        "pais": empresa.get("paisFiscal") or "MÉXICO",
        "telefono": empresa.get("telefono") or "",
        "celular": empresa.get("celular") or "",
        "mail": empresa.get("mail") or "",
        "lugar_expedicion": empresa.get("codigoPostalUbi") or empresa.get("codigoPostalFiscal"),
        "domicilio_ubi": empresa.get("domicilioUbi") or "",
        "no_ext_ubi": empresa.get("noExtUbi") or "",
        "no_int_ubi": empresa.get("noIntUbi") or "",
        "colonia_ubi": empresa.get("coloniaUbi") or "",
        "localidad_ubi": empresa.get("localidadUbi") or "",
        "ciudad_ubi": empresa.get("ciudadUbi") or "",
        "estado_ubi": empresa.get("estadoUbi") or "",
        "pais_ubi": empresa.get("paisUbi") or "MÉXICO",
    }


def _receptor_from_cliente(cliente: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    regimen = payload.get("regimen_c") or cliente.get("rgf_id")
    regimen_label = str(payload.get("regimen_c_label") or payload.get("regimen_c") or "616-Sin obligaciones fiscales")
    return {
        "rfc": str(payload.get("rfc_c") or cliente.get("rfc") or "").strip().upper(),
        "nombre": str(payload.get("nombre_c") or cliente.get("nombre") or "").strip(),
        "codigo_postal": str(payload.get("cod_pos_c") or cliente.get("codigoPostal") or ""),
        "regimen": regimen_label,
        "uso_cfdi": str(payload.get("uso_cfdi") or cliente.get("usoCfdi") or "G03"),
        "domicilio": str(payload.get("domicilio_c") or cliente.get("domicilio") or "-"),
        "colonia": str(payload.get("colonia_c") or cliente.get("colonia") or ""),
        "localidad": str(payload.get("localidad_c") or cliente.get("localidad") or ""),
        "ciudad": str(payload.get("ciudad_c") or cliente.get("ciudad") or ""),
        "estado": str(payload.get("estado_c") or cliente.get("estado") or ""),
        "pais": str(payload.get("pais_c") or cliente.get("pais") or "MÉXICO"),
        "telefono": str(payload.get("telefono_c") or cliente.get("telefono") or cliente.get("celular") or ""),
    }


def _insert_venta(
    cursor,
    *,
    totals: dict[str, Decimal],
    letra: str,
    fecha: datetime,
    vnd_id: int,
) -> int:
    execute(
        cursor,
        """
        INSERT INTO venta (
            fecha, subtotal0, subtotal, descuento, total, cambio, letra,
            monAbr, monTipoCambio, comentario, decimales, porPeriodo, ventaPorAjuste,
            peso, totalCompra, totalUtilidad, subtotalCompra, subtotalUtilidad,
            status, caj_id, mon_id, vnd_id
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s,
            'MXN', 1.000000, '', 2, 0, 0,
            0, %s, %s, %s, %s,
            1, 1, 1, %s
        )
        """,
        (
            fecha,
            totals["subtotal0"],
            totals["subtotal"],
            totals["descuento"],
            totals["total"],
            Decimal("0"),
            letra,
            totals["subtotal"] * Decimal("0.38"),
            totals["subtotal"] * Decimal("0.62"),
            totals["subtotal"] * Decimal("0.38"),
            totals["subtotal"] * Decimal("0.62"),
            vnd_id,
        ),
    )
    return last_insert_id(cursor)


def _insert_detallev(cursor, ven_id: int, art_id: int, item: dict[str, Any], orden: int) -> None:
    cantidad = _money(item.get("cantidad") or 1)
    precio_sin = _money(item.get("precio_sin") or item.get("valor_unitario") or 0)
    importe_sin = _money(cantidad * precio_sin)
    tasa = Decimal(str(item.get("tasa_iva", "0.16")))
    precio_con = _money(precio_sin * (1 + tasa))
    importe_con = _money(importe_sin * (1 + tasa))
    execute(
        cursor,
        """
        INSERT INTO detallev (
            ven_id, art_id, clave, descripcion, cantidad, unidad,
            precioNorSin, precioNorCon, precioSin, precioCon,
            importeNorSin, importeNorCon, importeSin, importeCon,
            descPorcentaje, descTotal, precioCompra, importeCompra,
            sinGravar, caracteristicas, orden, detImp, claveProdServ, claveUnidad, cuentaPredial
        ) VALUES (
            %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s,
            %s, %s, %s, %s,
            0, 0, %s, %s,
            0, '', %s, 1, %s, %s, ''
        )
        """,
        (
            ven_id,
            art_id,
            str(item.get("clave") or "SERVI")[:45],
            str(item.get("descripcion") or "Servicio")[:1000],
            cantidad,
            str(item.get("unidad") or "SERV")[:5],
            precio_sin,
            precio_con,
            precio_sin,
            precio_con,
            importe_sin,
            importe_con,
            importe_sin,
            importe_con,
            precio_sin * Decimal("0.01"),
            importe_sin * Decimal("0.01"),
            orden,
            str(item.get("clave_prod_serv") or "01010101"),
            str(item.get("clave_unidad") or "E48"),
        ),
    )


def _insert_ventaimp(cursor, ven_id: int, subtotal: Decimal, iva: Decimal) -> None:
    execute(
        cursor,
        """
        INSERT INTO ventaimp (ven_id, imp_id, total, subtotal, tras, orden, aplicaIVA)
        VALUES (%s, 1, %s, %s, 1, 0, 0)
        """,
        (ven_id, iva, subtotal),
    )


def _insert_xmlcfdi(cursor, xml_bytes: bytes, qr_png: bytes) -> int:
    execute(
        cursor,
        "INSERT INTO xmlcfdi (cfdi, cbb, timbrado) VALUES (%s, %s, 1)",
        (xml_bytes, qr_png),
    )
    return last_insert_id(cursor)


def _insert_facturacfdi(
    cursor,
    *,
    payload: dict[str, Any],
    empresa: dict[str, Any],
    emisor: dict[str, Any],
    receptor: dict[str, Any],
    totals: dict[str, Decimal],
    letra: str,
    folio: int,
    serie_folio: str,
    scf_id: int,
    cli_id: int,
    xcf_id: int,
    stamp_meta: dict[str, str],
    sign_meta: dict[str, str],
    forma_pago: str,
    metodo_pago: str,
    uso_cfdi: str,
    fecha: datetime,
) -> int:
    reg_clave_c = str(payload.get("reg_clave_c") or "")
    if not reg_clave_c and receptor.get("regimen"):
        m = re.match(r"^(\d{3})", str(receptor["regimen"]))
        reg_clave_c = m.group(1) if m else ""

    execute(
        cursor,
        """
        INSERT INTO facturacfdi (
            serieFolio, folio,
            nombreE, rfcE, domicilioE, localidadE, ciudadE, estadoE, paisE, codPosE,
            telefonoE, celularE, mailE, cuentaE, coloniaE,
            nombreC, rfcC, domicilioC, localidadC, ciudadC, estadoC, paisC, codPosC,
            telefonoC, coloniaC, regClaveC, regimenC,
            fecha, subtotal0, subtotal, descuento, total, letra,
            subtotalNor, descuentoFac,
            monAbr, monTipoCambio, formaPago, metodoPago, efectos,
            cadenaOriginal, versionCfdi, noCertificado, regimen,
            domicilioUbi, noExtUbi, noIntUbi, coloniaUbi, localidadUbi, ciudadUbi, estadoUbi, paisUbi, codigoPostalUbi,
            moneda, noSerieCert, fechaCert, selloDigital, selloSat, uuid, usoCfdi, comentario,
            decimales, porPeriodo, consumo, peso,
            totalCompra, totalUtilidad, subtotalCompra, subtotalUtilidad,
            status, cli_id, scf_id, xcf_id, caj_id, mon_id
        ) VALUES (
            %s, %s,
            %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s,
            %s, %s,
            'MXN', 1.000000, %s, %s, 'Efectos fiscales al pago',
            %s, '4.0', %s, %s,
            %s, %s, %s, %s, %s, %s, %s, %s, %s,
            'MXN', %s, %s, %s, %s, %s, %s, '',
            2, 0, 0, 0,
            %s, %s, %s, %s,
            1, %s, %s, %s, 1, 1
        )
        """,
        (
            serie_folio,
            folio,
            emisor["nombre"],
            emisor["rfc"],
            emisor["domicilio"],
            emisor["localidad"],
            emisor["ciudad"],
            emisor["estado"],
            emisor["pais"],
            emisor["codigo_postal"],
            emisor["telefono"],
            emisor["celular"],
            emisor["mail"],
            "",
            emisor["colonia"],
            receptor["nombre"],
            receptor["rfc"],
            receptor["domicilio"],
            receptor["localidad"],
            receptor["ciudad"],
            receptor["estado"],
            receptor["pais"],
            receptor["codigo_postal"],
            receptor["telefono"],
            receptor["colonia"],
            reg_clave_c,
            str(receptor.get("regimen") or "").split("-", 1)[-1],
            fecha,
            totals["subtotal0"],
            totals["subtotal"],
            totals["descuento"],
            totals["total"],
            letra,
            totals["subtotal"],
            Decimal("0"),
            forma_pago,
            metodo_pago,
            sign_meta.get("cadena_original") or stamp_meta.get("cadena_original") or "",
            sign_meta.get("no_certificado") or "",
            empresa.get("regimen") or "601-General de Ley Personas Morales",
            emisor["domicilio_ubi"],
            emisor["no_ext_ubi"],
            emisor["no_int_ubi"],
            emisor["colonia_ubi"],
            emisor["localidad_ubi"],
            emisor["ciudad_ubi"],
            emisor["estado_ubi"],
            emisor["pais_ubi"],
            emisor["lugar_expedicion"],
            stamp_meta.get("no_serie_cert_sat") or "",
            stamp_meta.get("fecha_cert") or fecha,
            sign_meta.get("sello") or stamp_meta.get("sello_cfd") or "",
            stamp_meta.get("sello_sat") or "",
            stamp_meta.get("uuid") or "",
            _label_with_clave("", uso_cfdi) if "-" not in uso_cfdi else uso_cfdi,
            totals["subtotal"] * Decimal("0.38"),
            totals["subtotal"] * Decimal("0.62"),
            totals["subtotal"] * Decimal("0.38"),
            totals["subtotal"] * Decimal("0.62"),
            cli_id,
            scf_id,
            xcf_id,
        ),
    )
    return last_insert_id(cursor)


def _insert_facturacfdiimp(cursor, fcf_id: int, subtotal: Decimal, iva: Decimal) -> None:
    execute(
        cursor,
        """
        INSERT INTO facturacfdiimp (
            fcf_id, imp_id, total, subtotal, tipoFactor, nombreImp, valor, tras, orden, aplicaIVA
        ) VALUES (%s, 1, %s, %s, 'Tasa', 'I.V.A.', 16.000000, 1, 0, 0)
        """,
        (fcf_id, iva, subtotal),
    )


def _insert_facturacfdiven(cursor, fcf_id: int, ven_id: int) -> None:
    execute(
        cursor,
        "INSERT INTO facturacfdiven (fcf_id, ven_id, status) VALUES (%s, %s, 1)",
        (fcf_id, ven_id),
    )


def create_timbrada_factura(payload: dict[str, Any]) -> dict[str, Any]:
    """Crea venta + CFDI timbrado + registros SICAR en una transacción."""
    cli_id = int(payload.get("cli_id") or 0)
    scf_id = int(payload.get("scf_id") or 2)
    conceptos = payload.get("conceptos") or []
    if not cli_id:
        raise SicarFacturaError("cli_id es obligatorio.")
    if not conceptos:
        raise SicarFacturaError("Agrega al menos un concepto.")

    forma_pago = str(payload.get("forma_pago") or "99-Por definir")
    metodo_pago = str(payload.get("metodo_pago") or "PPD-Pago en parcialidades o diferido")
    uso_cfdi = str(payload.get("uso_cfdi") or "G03-Gastos en general")

    cfg = _sicar_db_config()
    art_id = sicar_setting_int("SICAR_DEFAULT_ART_ID", 1300)
    vnd_id = sicar_setting_int("SICAR_DEFAULT_VND_ID", 3)

    conn = _connect_sicar(cfg, read_timeout=60)
    try:
        conn.begin()
        cursor = conn.cursor()

        empresa = _load_empresa(cursor)
        csd = _load_csd(cursor)
        cliente = _load_cliente(cursor, cli_id)
        emisor = _emisor_from_empresa(empresa)
        receptor = _receptor_from_cliente(cliente, payload)

        folio, serie_folio = _reserve_folio(cursor, scf_id)
        serie_row = _load_serie(cursor, scf_id)
        serie = str(serie_row.get("serie") or "")

        xml_unsigned, build_totals = build_cfdi_xml(
            emisor=emisor,
            receptor=receptor,
            conceptos=conceptos,
            forma_pago=forma_pago,
            metodo_pago=metodo_pago,
            lugar_expedicion=str(emisor.get("lugar_expedicion") or ""),
            serie=serie,
            folio=folio,
        )

        signed_xml, sign_meta = sign_cfdi_xml(
            xml_unsigned,
            bytes(csd["fCer"]),
            bytes(csd["fKey"]),
            str(csd["_password"]),
        )

        pac_token = sicar_setting_str("SICAR_PAC_TOKEN") or str(empresa.get("claveApi") or "")
        try:
            stamped_xml, stamp_meta = stamp_cfdi_xml(signed_xml, token=pac_token or None)
        except SicarStampError as exc:
            raise SicarFacturaError(str(exc)) from exc

        totals = {
            "subtotal0": _money(build_totals["subtotal"]),
            "subtotal": _money(build_totals["subtotal"]),
            "descuento": Decimal("0"),
            "total": _money(build_totals["total"]),
        }
        letra = _total_letra(totals["total"])
        fecha = build_totals["fecha"]

        qr_png = build_qr_png(
            uuid=stamp_meta["uuid"],
            rfc_emisor=str(emisor["rfc"]),
            rfc_receptor=str(receptor["rfc"]),
            total=str(totals["total"]),
            sello_cfd=sign_meta.get("sello") or stamp_meta.get("sello_cfd") or "",
        )

        ven_id = _insert_venta(cursor, totals=totals, letra=letra, fecha=fecha, vnd_id=vnd_id)
        for orden, item in enumerate(conceptos):
            _insert_detallev(cursor, ven_id, art_id, item, orden)
        _insert_ventaimp(cursor, ven_id, totals["subtotal"], _money(build_totals["iva"]))

        xcf_id = _insert_xmlcfdi(cursor, stamped_xml, qr_png)
        fcf_id = _insert_facturacfdi(
            cursor,
            payload=payload,
            empresa=empresa,
            emisor=emisor,
            receptor=receptor,
            totals=totals,
            letra=letra,
            folio=folio,
            serie_folio=serie_folio,
            scf_id=scf_id,
            cli_id=cli_id,
            xcf_id=xcf_id,
            stamp_meta=stamp_meta,
            sign_meta=sign_meta,
            forma_pago=forma_pago,
            metodo_pago=metodo_pago,
            uso_cfdi=uso_cfdi,
            fecha=fecha,
        )
        _insert_facturacfdiimp(cursor, fcf_id, totals["subtotal"], _money(build_totals["iva"]))
        _insert_facturacfdiven(cursor, fcf_id, ven_id)

        conn.commit()
        return {
            "fcf_id": fcf_id,
            "ven_id": ven_id,
            "xcf_id": xcf_id,
            "uuid": stamp_meta.get("uuid"),
            "serie_folio": serie_folio,
            "folio": folio,
            "total": float(totals["total"]),
        }
    except SicarFacturaError:
        conn.rollback()
        raise
    except Exception as exc:
        conn.rollback()
        logger.exception("Error creando factura SICAR")
        raise SicarFacturaError(f"No se pudo crear la factura: {exc}") from exc
    finally:
        conn.close()


def list_sicar_series(cursor) -> list[dict[str, Any]]:
    return fetch_all(cursor, "SELECT scf_id, serie, folioIni, emp_id FROM seriecfdi ORDER BY scf_id")


_SICAR_CLIENTE_FORM_SQL = """
    c.cli_id, c.clave, c.nombre, c.representante, c.domicilio, c.noExt, c.noInt,
    c.localidad, c.ciudad, c.estado, c.pais, c.codigoPostal, c.colonia,
    c.rfc, c.curp,
    COALESCE(NULLIF(TRIM(c.telefono), ''), NULLIF(TRIM(lf.telefonoC), ''), '') AS telefono,
    COALESCE(NULLIF(TRIM(c.celular), ''), '') AS celular,
    c.mail, c.comentario,
    c.limite, c.precio, c.diasCredito, c.usoCfdi, c.idCIF, c.rgf_id,
    rf.clave AS regClaveC, rf.descripcion AS regimenDescripcion,
    lf.telefonoC AS telefonoC
"""

_SICAR_CLIENTE_FROM = """
    FROM cliente c
    LEFT JOIN regimenfiscal rf ON rf.rgf_id = c.rgf_id
    LEFT JOIN (
        SELECT fc.cli_id, fc.telefonoC
        FROM facturacfdi fc
        INNER JOIN (
            SELECT cli_id, MAX(fcf_id) AS max_fcf_id
            FROM facturacfdi
            GROUP BY cli_id
        ) latest ON latest.cli_id = fc.cli_id AND latest.max_fcf_id = fc.fcf_id
    ) lf ON lf.cli_id = c.cli_id
"""


def get_sicar_cliente(cursor, cli_id: int) -> dict[str, Any] | None:
    return fetch_one(
        cursor,
        f"SELECT {_SICAR_CLIENTE_FORM_SQL} {_SICAR_CLIENTE_FROM} WHERE c.cli_id = %s AND c.status = 1 LIMIT 1",
        (cli_id,),
    )


def search_sicar_clientes(cursor, q: str = "", limit: int = 25) -> list[dict[str, Any]]:
    q = (q or "").strip()
    if q:
        like = f"%{q}%"
        return fetch_all(
            cursor,
            f"""
            SELECT {_SICAR_CLIENTE_FORM_SQL}
            {_SICAR_CLIENTE_FROM}
            WHERE c.status = 1 AND (c.nombre LIKE %s OR c.rfc LIKE %s OR c.clave LIKE %s)
            ORDER BY c.nombre
            LIMIT %s
            """,
            (like, like, like, limit),
        )
    return fetch_all(
        cursor,
        f"""
        SELECT {_SICAR_CLIENTE_FORM_SQL}
        {_SICAR_CLIENTE_FROM}
        WHERE c.status = 1
        ORDER BY c.nombre
        LIMIT %s
        """,
        (limit,),
    )
