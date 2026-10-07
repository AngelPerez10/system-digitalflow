"""HTML del contrato de Internet Dedicado (PDF tamaño carta).

Todo dato capturado pasa por ``esc``: el HTML lo renderiza Chromium y un
``<script>`` en la razón social no debe ejecutarse ni romper el documento.
"""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal

from django.utils import timezone
from num2words import num2words

from apps.common.marca import logo_data_uri_for_pdf
from apps.common.pdf_html import esc

from ..models import TIPO_PERSONA_FISICA

MESES = (
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
)

ORDINALES = (
    "PRIMERA", "SEGUNDA", "TERCERA", "CUARTA", "QUINTA", "SEXTA", "SÉPTIMA",
    "OCTAVA", "NOVENA", "DÉCIMA", "DÉCIMA PRIMERA", "DÉCIMA SEGUNDA",
    "DÉCIMA TERCERA", "DÉCIMA CUARTA", "DÉCIMA QUINTA", "DÉCIMA SEXTA",
    "DÉCIMA SÉPTIMA", "DÉCIMA OCTAVA", "DÉCIMA NOVENA", "VIGÉSIMA",
    "VIGÉSIMA PRIMERA", "VIGÉSIMA SEGUNDA", "VIGÉSIMA TERCERA",
)

P = "“EL PRESTADOR”"
C = "“EL CLIENTE”"
LP = "“LAS PARTES”"


# ---------------------------------------------------------------- formato


def fecha_larga(value) -> str:
    if not value:
        return "____ de ____________ de ______"
    return f"{value.day:02d} de {MESES[value.month - 1]} de {value.year}"


def fecha_hora(value) -> str:
    if not value:
        return "—"
    local = timezone.localtime(value)
    return f"{fecha_larga(local.date())}, {local:%H:%M:%S} h (hora del centro de México)"


def cantidad_con_letra(n: int) -> str:
    return f"{num2words(int(n), lang='es')} ({int(n)})"


def dinero(value) -> str:
    monto = Decimal(str(value or 0)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return f"${monto:,.2f}"


def dinero_con_letra(value) -> str:
    monto = Decimal(str(value or 0)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    entero = int(monto)
    centavos = int((monto - entero) * 100)
    palabras = num2words(entero, lang="es").title().replace(" Y ", " y ")
    # num2words da "Un" para 1 000 000 -> "Un Millón"; ya en formato título.
    return f"{dinero(monto)} ({palabras} Pesos {centavos:02d}/100 M.N.)"


def _txt(value, placeholder: str = "____________________") -> str:
    s = str(value or "").strip()
    return esc(s) if s else placeholder


# ---------------------------------------------------------------- bloques


def _proemio(d: dict) -> str:
    pr = d["prestador"]
    rep_prestador = f", representada en este acto por el C. {_txt(pr['representante'])}" if pr.get("representante") else ""
    cliente = f"<strong>{_txt(d['cliente_razon_social'])}</strong>"
    if d["cliente_rfc"]:
        cliente += f", con Registro Federal de Contribuyentes {_txt(d['cliente_rfc'])}"
    rep_cliente = ""
    if d["cliente_tipo_persona"] != TIPO_PERSONA_FISICA and d["cliente_representante"]:
        rep_cliente = f", representada en este acto por el (la) C. {_txt(d['cliente_representante'])}"
    return (
        "<p class='proemio'>Contrato de prestación de servicios de Internet Dedicado que celebran, "
        f"por una parte, <strong>{_txt(pr['razon_social'])}</strong>, con Registro Federal de "
        f"Contribuyentes {_txt(pr['rfc'])}, a quien en lo sucesivo se le denominará {P}{rep_prestador}; "
        f"y por la otra parte, {cliente}, a quien en lo sucesivo se le denominará {C}{rep_cliente}; "
        f"a quienes en su conjunto se les denominará {LP}, mismas que se obligan al tenor de las "
        "siguientes declaraciones y cláusulas:</p>"
    )


def _declaraciones(d: dict) -> str:
    pr = d["prestador"]
    prestador = [
        "Que es una sociedad legalmente constituida conforme a las leyes mexicanas, bajo la "
        f"denominación {_txt(pr['razon_social'])}, y que cuenta con la capacidad legal, técnica y "
        "administrativa necesaria para prestar los servicios de telecomunicaciones objeto del "
        "presente contrato.",
        "Que su representante cuenta con las facultades suficientes para suscribir el presente "
        "instrumento en su nombre y representación.",
        "Que señala como correo electrónico oficial para efectos de este contrato el indicado en la "
        "Cláusula Décima Segunda.",
    ]

    rfc = f", identificada con Registro Federal de Contribuyentes {_txt(d['cliente_rfc'])}" if d["cliente_rfc"] else ""
    regimen = f", régimen fiscal {_txt(d['cliente_regimen_fiscal'])}" if d["cliente_regimen_fiscal"] else ""
    domicilio = (
        f", con domicilio fiscal en {_txt(d['cliente_domicilio_fiscal'])}" if d["cliente_domicilio_fiscal"] else ""
    )
    identificacion = ""
    if d["cliente_clave_elector"] or d["cliente_curp"]:
        partes = []
        if d["cliente_clave_elector"]:
            partes.append(f"Clave de Elector {_txt(d['cliente_clave_elector'])}")
        if d["cliente_curp"]:
            partes.append(f"CURP {_txt(d['cliente_curp'])}")
        identificacion = (
            "se identifica con Credencial para Votar expedida por el Instituto Nacional Electoral, con "
            + " y ".join(partes)
        )

    if d["cliente_tipo_persona"] == TIPO_PERSONA_FISICA:
        cliente = [
            f"Que es una persona física de nacionalidad mexicana, de nombre {_txt(d['cliente_razon_social'])}"
            f"{rfc}{regimen}{domicilio}.",
            "Que " + (f"{identificacion} y " if identificacion else "") + "cuenta con la capacidad legal "
            "necesaria para obligarse en los términos del presente contrato.",
        ]
    else:
        cliente = [
            "Que es una persona moral legalmente constituida conforme a las leyes mexicanas, bajo la "
            f"denominación {_txt(d['cliente_razon_social'])}{rfc}{regimen}{domicilio}.",
            f"Que su representante, el (la) C. {_txt(d['cliente_representante'])}, "
            + (f"quien {identificacion}, " if identificacion else "")
            + "cuenta con la capacidad legal y facultades necesarias para obligarse en los términos del presente "
            f"contrato en nombre de {C}, siendo un comerciante habilitado en términos del Código de Comercio.",
        ]
    cliente.append(
        "Que es su deseo contratar los servicios de Internet Dedicado que se describen en el presente "
        f"contrato, para el desarrollo de sus actividades, y que todos los datos que ha proporcionado a {P} "
        "son ciertos."
    )

    def lista(items):
        return "".join(f"<li>{x}</li>" for x in items)

    return (
        "<h2 class='seccion'>Declaraciones</h2>"
        f"<h3 class='declara'>I. Declara {P}:</h3><ol class='incisos'>{lista(prestador)}</ol>"
        f"<h3 class='declara'>II. Declara {C}:</h3><ol class='incisos'>{lista(cliente)}</ol>"
        f"<p>Expuesto lo anterior, {LP} se sujetan a las siguientes:</p>"
    )


def _clausulas(d: dict) -> list[tuple[str, list[str]]]:
    pr = d["prestador"]
    vig = cantidad_con_letra(d["vigencia_meses"])
    correo_p = _txt(pr.get("correo"), "el que se notifique por escrito")
    correo_c = _txt(d["cliente_correo"], "el que se notifique por escrito")
    return [
        ("OBJETO", [
            f"Por medio del presente contrato, {P} se obliga a proporcionar a {C} el servicio de Internet "
            "Dedicado, con las características técnicas y comerciales que se describen en la cláusula de "
            "Acuerdo de Nivel de Servicio (SLA) del presente instrumento, a cambio del pago de la "
            "contraprestación aquí establecida.",
        ]),
        ("EQUIPOS", [
            f"En caso de que el servicio contratado requiera de equipos para su funcionamiento, {P} los "
            f"proporcionará a {C} en arrendamiento, compraventa y/o comodato, según se indique en el Acta de "
            "Recepción de Servicios y/o Productos correspondiente. Para efectos de este contrato, se entenderá "
            "por comodato el equipamiento entregado en préstamo bajo el cuidado de "
            f"{C} en las instalaciones donde se preste el servicio, en cuyo caso serán aplicables las "
            "disposiciones del Código Civil Federal.",
        ]),
        ("DOMICILIO DEL SITIO Y REUBICACIÓN DEL SERVICIO", [
            "El domicilio de instalación y prestación del servicio será el ubicado en: "
            f"<strong>{_txt(d['domicilio_instalacion'])}</strong>.",
            f"En caso de que {C} requiera un cambio de domicilio, deberá informarlo a {P} con al menos "
            "sesenta (60) días naturales de anticipación y cubrir los costos que dicho cambio genere. El nuevo "
            "sitio deberá contar con las adecuaciones técnicas necesarias; en caso de que el cambio no sea "
            f"factible, se informará a {C} y el servicio continuará prestándose en el sitio originalmente "
            "contratado.",
        ]),
        ("INTERRUPCIÓN DE LOS SERVICIOS", [
            f"{P} no será responsable si el servicio contratado se suspende, interrumpe o disminuye por causas "
            "fuera de su control, o bien ante la necesidad de realizar mantenimientos preventivos o correctivos "
            f"para mejorar la prestación del servicio, en cuyo caso se informará a {C} al correo electrónico "
            "proporcionado con al menos cuatro (4) horas de anticipación.",
        ]),
        ("DURACIÓN Y VIGENCIA", [
            f"El presente contrato tendrá una vigencia forzosa de {vig} meses, contados a partir de la fecha de "
            "firma, plazo que iniciará su cómputo para efectos de facturación a partir de la fecha de emisión "
            f"de la primera factura, la cual será enviada al correo electrónico que {C} haya proporcionado. El "
            "periodo de facturación comenzará cuando el servicio esté listo para su entrega o bien haya sido "
            "entregado.",
            f"Una vez transcurrido el plazo forzoso de {vig} meses, el presente contrato continuará vigente por "
            f"tiempo indefinido, pudiendo cualquiera de {LP} darlo por terminado en cualquier momento, sin "
            "penalización alguna, mediante notificación por escrito a la otra parte con al menos treinta (30) "
            "días naturales de anticipación, señalada al correo electrónico oficial correspondiente. Durante "
            "este periodo indefinido podrán realizarse ajustes a las tarifas, incluyendo aquellos relacionados "
            "con variaciones en el Índice Nacional de Precios al Consumidor (INPC) publicado por el INEGI, "
            f"previa notificación a {C}. En caso de terminación o conclusión del contrato, {C} deberá devolver "
            "cualquier equipo que le haya sido proporcionado en comodato, en buen estado, o en su caso, pagar "
            "el monto correspondiente a dichos equipos.",
        ]),
        ("ORDEN DE TRABAJO (RECEPCIÓN DE SERVICIOS Y/O PRODUCTOS)", [
            "Cuando el servicio esté listo para su entrega y/u operación, se entregará una orden de trabajo "
            "(Recepción de Servicios y/o Productos), la cual firmará el personal autorizado por "
            f"{C} en señal de aceptación y entrega.",
        ]),
        ("RECONFIGURACIÓN DEL SERVICIO", [
            f"Si {C} solicita una reconfiguración de los parámetros iniciales del servicio, {P} le "
            "proporcionará hasta dos (2) reconfiguraciones anuales sin costo. Las reconfiguraciones "
            "adicionales serán facturadas por evento.",
        ]),
        ("NUEVOS SITIOS O PRODUCTOS", [
            f"Si {C} requiere agregar servicios adicionales a los contratados inicialmente o nuevos productos, "
            f"deberá celebrarse un nuevo contrato o convenio modificatorio. Si {C} requiere aumentar la "
            "capacidad del servicio en el mismo sitio contratado, deberá notificarlo al correo electrónico "
            f"señalado por {P} y confirmar la tarifa incremental correspondiente, la cual se reflejará en la "
            "factura siguiente.",
        ]),
        ("LÍMITE DE ALCANCE Y MAL USO", [
            f"Queda expresamente prohibido para {C} revender el servicio contratado con {P}. El uso del "
            f"servicio está diseñado para que {C} lo utilice conforme a sus necesidades; por lo anterior, {P} "
            "no será responsable por el mal uso, uso negligente, fraudulento, contrario a especificaciones o no "
            "autorizado de las instalaciones, redes, líneas y/o equipos, incluyendo virus o ataques "
            f"informáticos de cualquier tipo. {C} deberá vigilar y/o restringir el acceso, directo o indirecto, "
            "a sus instalaciones, redes o equipos.",
            "El servicio contratado no incluye protección contra ciberataques, pérdida de información o ataques "
            f"informáticos, por lo que {P} no asumirá responsabilidad alguna derivada de dichas circunstancias. "
            f"La responsabilidad de {P} se limita hasta el punto de entrega del servicio de su red.",
        ]),
        ("TERMINACIÓN ANTICIPADA", [
            f"Durante los primeros {vig} meses de vigencia forzosa, {C} podrá dar por terminado el presente "
            f"contrato de forma anticipada en cualquier momento, notificándolo por escrito a {P} con al menos "
            "treinta (30) días naturales de anticipación, cubriendo como única penalización una cantidad "
            "equivalente a tres (3) mensualidades del servicio, además de cualquier saldo pendiente de pago. "
            "Adicionalmente, deberá devolver en buen estado, en el domicilio que se le informe, cualquier "
            "equipo entregado en comodato, o en su caso, pagar el monto correspondiente a dichos equipos.",
            f"Transcurrido el plazo forzoso de {vig} meses, la terminación anticipada se sujetará a lo previsto "
            "en el último párrafo de la Cláusula Quinta, sin penalización. Asimismo, en caso de "
            f"incumplimientos graves y reiterados por parte de {P} a los niveles de servicio (SLA) establecidos "
            f"en la Cláusula Vigésima, {C} podrá dar por terminado el presente contrato de forma anticipada sin "
            "que le resulte aplicable la penalización equivalente a tres (3) mensualidades a que se refiere el "
            "párrafo anterior.",
        ]),
        ("RESPONSABILIDAD SOBRE COLABORADORES O EMPLEADOS", [
            f"Cada una de {LP} es responsable de las obligaciones frente a sus propios colaboradores o "
            "empleados, conforme a la legislación aplicable. Al tratarse de una relación estrictamente "
            "comercial, no deberá considerarse en ningún caso la existencia de relación laboral o de "
            f"subordinación entre {LP}.",
        ]),
        ("NOTIFICACIONES", [
            f"{LP} reconocen el correo electrónico proporcionado por cada una de ellas como medio válido para "
            "el envío y recepción de notificaciones, cambios y actualizaciones relacionadas con el servicio "
            f"contratado, así como con sus términos y condiciones. Para tal efecto, {LP} señalan como correos "
            "electrónicos oficiales para el envío de notificaciones, reportes y quejas relacionadas con el "
            f"presente contrato los siguientes: por {P}, <strong>{correo_p}</strong>; y por {C}, "
            f"<strong>{correo_c}</strong>. Cualquier cambio a estos correos deberá notificarse por escrito a "
            "la otra parte.",
        ]),
        ("CONFIDENCIALIDAD", [
            f"{LP} se obligan a no divulgar por medio alguno (publicaciones comerciales, conferencias, informes "
            "o cualquier otra forma) los datos, información y resultados obtenidos de la celebración de este "
            f"contrato sin la autorización expresa y por escrito de la otra parte, aceptando con ello {LP} que "
            "todos los datos y resultados de esta relación contractual son propiedad exclusiva de la otra "
            "parte, por lo que en este acto asumen la obligación de confidencialidad y discreción total. Para "
            "tal efecto, se determina que será considerada como información confidencial cualquier información "
            f"o datos proporcionados por {LP}, la cual estará sujeta a tratamiento especial y se tratará con la "
            "debida diligencia y discreción. La confidencialidad subsistirá y permanecerá vigente por tiempo "
            "indefinido, aun después de extintas las obligaciones contractuales del presente.",
        ]),
        ("JURISDICCIÓN", [
            f"Para todo lo relacionado con la interpretación y cumplimiento del presente contrato, {LP} se "
            f"someten a la jurisdicción de los Tribunales Competentes de {_txt(pr.get('jurisdiccion'))}, "
            "renunciando expresamente a cualquier otra jurisdicción que pudiera corresponderles en razón de su "
            "domicilio presente, futuro o por cualquier otra causa.",
        ]),
        ("AVISO DE PRIVACIDAD", [
            f"{C} acepta el tratamiento de sus datos personales y los de su representante por parte de {P}, "
            "conforme al aviso de privacidad que le sea proporcionado. Cualquier modificación al aviso de "
            "privacidad será notificada por correo electrónico.",
        ]),
        ("PRECIO Y FORMA DE PAGO", [
            f"{C} se obliga a pagar a {P}, como contraprestación por el servicio de Internet Dedicado objeto del "
            f"presente contrato, la cantidad de <strong>{esc(dinero_con_letra(d['precio_mensual']))}</strong> "
            "mensuales, más el Impuesto al Valor Agregado (IVA) correspondiente, durante los "
            f"{vig} meses de vigencia forzosa del contrato.",
            "El pago deberá realizarse dentro de los treinta (30) días naturales posteriores a la fecha de "
            "emisión de la factura correspondiente, mediante transferencia bancaria a la cuenta "
            f"{_txt(pr.get('cuenta_bancaria'))}, CLABE interbancaria {_txt(pr.get('clabe'))}, señalando el "
            "número de referencia correspondiente. En dicha cuenta también se realizarán los pagos adicionales "
            "por contratación, instalación, adecuaciones, intereses moratorios, penalizaciones y demás cargos "
            "relacionados con este contrato.",
        ]),
        ("FACTURACIÓN", [
            f"La factura será emitida, timbrada y enviada al correo electrónico que {C} proporcione para "
            "efectos de facturación. Una vez emitida, no podrán realizarse cambios a la misma.",
            "En caso de que existan gastos de instalación, adecuación y activación derivados de la prestación "
            f"del servicio y que sean a cargo de {C}, se enviará la factura correspondiente para su pago.",
        ]),
        ("MORA", [
            f"En caso de que {C} incurra en mora, {P} podrá suspender, restringir o cancelar el servicio de "
            "forma inmediata hasta que se cubra el adeudo, los intereses y, en su caso, los gastos de "
            f"reconexión, conforme a las tarifas publicadas por {P}. Los adeudos generarán intereses moratorios "
            f"a favor de {P} a razón del 2% (dos por ciento) mensual, a partir del día siguiente a la fecha "
            f"límite de pago. El hecho de que {P} omita reflejar un adeudo en alguna factura no representará "
            f"una renuncia a su acción de cobro, ni se interpretará como un derecho de {C} a no pagar dicho "
            "adeudo.",
        ]),
        ("CUMPLIMIENTO NORMATIVO Y ANTICORRUPCIÓN", [
            f"{LP} se obligan a adoptar únicamente prácticas comerciales éticas y legales en el desarrollo de "
            "las actividades inherentes al objeto del presente contrato, debiendo cumplir con todas las leyes "
            "aplicables a la relación comercial que este instrumento regula, incluidas las disposiciones "
            "anticorrupción, las leyes que impiden el pago de sobornos comerciales o privados, así como las "
            "relativas a la prevención de operaciones con recursos de procedencia ilícita.",
        ]),
        ("ACUERDO DE NIVEL DE SERVICIO (SLA)", [
            f"{P} se compromete a proporcionar el servicio de Internet Dedicado con un ancho de banda simétrico "
            f"de <strong>{int(d['plan_mbps'])} Mbps</strong>, garantizando la misma velocidad de carga y "
            "descarga, e incluyendo una (1) dirección IP pública fija asignada exclusivamente para el servicio "
            "contratado, salvo que por causas técnicas justificadas sea necesario realizar su sustitución, "
            f"notificándolo previamente a {C}.",
            f"En caso de presentarse una falla atribuible a la infraestructura o equipos administrados por {P}, "
            f"y una vez que {C} haya realizado el reporte por los canales oficiales de atención —soporte técnico "
            f"{_txt(pr.get('telefono_soporte'))} y servicio de emergencias 24/7 "
            f"{_txt(pr.get('telefono_emergencias'))}—, {P} se compromete a restablecer el servicio en un plazo "
            "máximo de cinco (5) horas, contadas a partir de la recepción y registro del reporte.",
            f"{P} realizará mantenimientos preventivos, consistentes en la revisión, limpieza y verificación "
            "periódica de los equipos y enlaces asignados al servicio, así como la actualización de firmware y "
            "parámetros de configuración cuando resulte necesario, con una periodicidad mensual, notificando a "
            f"{C} conforme a lo señalado en la Cláusula Cuarta. Asimismo, realizará mantenimientos correctivos "
            f"cuando se presente una falla reportada por {C} o detectada por {P}, consistentes en el "
            "diagnóstico, reparación o sustitución de los equipos o enlaces afectados, sujetos al tiempo máximo "
            "de restablecimiento de cinco (5) horas señalado en el párrafo anterior.",
            "El tiempo de atención comenzará a computarse únicamente cuando el reporte haya sido debidamente "
            f"registrado y siempre que exista acceso a las instalaciones de {C}, cuando este sea necesario para "
            "realizar las labores de diagnóstico o reparación.",
            "Quedan excluidos de este nivel de servicio los casos de fuerza mayor o caso fortuito, actos de "
            f"terceros, interrupciones del suministro eléctrico, daños ocasionados por {C} o por terceros, "
            "desastres naturales, vandalismo, afectaciones derivadas de trabajos de terceros sobre la "
            "infraestructura de telecomunicaciones, así como fallas en infraestructura ajena al control de "
            f"{P}.",
        ]),
        ("PENALIZACIÓN POR INCUMPLIMIENTO DEL SLA", [
            f"En caso de que {P} incumpla comprobablemente con los niveles de servicio establecidos en la "
            "Cláusula Vigésima (Acuerdo de Nivel de Servicio) del presente contrato, por causas que le sean "
            f"directamente imputables, {C} tendrá derecho a una compensación o crédito sobre el servicio, "
            "equivalente a la parte proporcional de la mensualidad correspondiente al tiempo en que el servicio "
            "no haya cumplido con los niveles pactados, misma que será aplicada en la factura del periodo "
            "inmediato siguiente.",
            f"En caso de incumplimientos graves y reiterados del SLA imputables a {P}, {C} tendrá derecho, "
            "adicionalmente, a dar por terminado el presente contrato de forma anticipada sin penalización, en "
            "términos de lo previsto en la Cláusula Décima.",
            "Quedan excluidos de la penalización prevista en esta cláusula los supuestos y causas de exclusión "
            "señalados en la Cláusula Vigésima del presente contrato.",
        ]),
        ("FIRMA", [
            f"{LP} acuerdan que el presente contrato podrá ser firmado de manera ológrafa o mediante firma "
            "electrónica, reconociendo dicha firma como la plena expresión de su voluntad y con toda la fuerza "
            "y validez legal, en términos de los artículos 89 a 99 del Código de Comercio. La constancia de "
            "firma electrónica que se anexa forma parte integrante del presente contrato.",
        ]),
    ]


def _firma_bloque(rol: str, razon_social: str, nombre: str, firma_png: str, firmado_at) -> str:
    if firma_png and firma_png.startswith("data:image/png;base64,"):
        imagen = f"<img class='firma-img' src='{esc(firma_png)}' alt='Firma' />"
    else:
        imagen = ""
    sello = (
        f"<div class='firma-sello'>Firmado electrónicamente el {esc(fecha_hora(firmado_at))}</div>"
        if firmado_at
        else "<div class='firma-sello pendiente'>Pendiente de firma</div>"
    )
    return (
        "<div class='firma'>"
        f"<div class='firma-rol'>{esc(rol)}</div>"
        f"<div class='firma-espacio'>{imagen}</div>"
        "<div class='firma-linea'></div>"
        + (f"<div class='firma-razon'>{esc(razon_social)}</div>" if (razon_social or "").strip() else "")
        + f"<div class='firma-nombre'>{_txt(nombre)}</div>"
        f"{sello}"
        "</div>"
    )


def _caratula(d: dict, folio: str) -> str:
    pr = d["prestador"]
    filas = [
        ("Prestador", f"{_txt(pr['razon_social'])}<span class='sub'>RFC {_txt(pr['rfc'])}</span>"),
        (
            "Cliente",
            f"{_txt(d['cliente_razon_social'])}"
            + (f"<span class='sub'>RFC {_txt(d['cliente_rfc'])}</span>" if d["cliente_rfc"] else ""),
        ),
        ("Servicio", f"Internet Dedicado simétrico de <strong>{int(d['plan_mbps'])} Mbps</strong> con 1 IP pública fija"),
        (
            "Contraprestación",
            f"<strong>{esc(dinero(d['precio_mensual']))}</strong> mensuales + IVA"
            f"<span class='sub'>{esc(dinero_con_letra(d['precio_mensual']).split(' ', 1)[1])}</span>",
        ),
        ("Vigencia forzosa", f"{esc(cantidad_con_letra(d['vigencia_meses']))} meses"),
        ("Sitio de instalación", _txt(d["domicilio_instalacion"])),
        ("Lugar y fecha", f"{_txt(d['ciudad_firma'])}, {esc(fecha_larga(d['fecha_firma']))}"),
    ]
    rows = "".join(f"<tr><th>{k}</th><td>{v}</td></tr>" for k, v in filas)
    return (
        "<section class='caratula'>"
        f"<div class='caratula-titulo'>Carátula del contrato <span>{esc(folio)}</span></div>"
        f"<table>{rows}</table>"
        "</section>"
    )


def _evidencia(contrato, d: dict, documento_sha256: str, eventos) -> str:
    pr = d["prestador"]
    firmantes = []
    if contrato.firmado_prestador_at:
        usuario = getattr(contrato.firmado_prestador_por, "username", "") or ""
        firmantes.append({
            "rol": "EL PRESTADOR",
            "nombre": contrato.firmado_prestador_nombre or pr.get("representante"),
            "metodo": "Firma autógrafa digital capturada en sesión autenticada del sistema"
            + (f" (usuario «{usuario}»)" if usuario else ""),
            "fecha": fecha_hora(contrato.firmado_prestador_at),
            "ip": contrato.firmado_prestador_ip or "—",
            "dispositivo": "—",
            "hash": contrato.firma_prestador_sha256,
        })
    if contrato.firmado_cliente_at:
        firmantes.append({
            "rol": "EL CLIENTE",
            "nombre": contrato.firma_cliente_nombre,
            "metodo": "Firma autógrafa digital mediante enlace único, con identidad verificada por "
            f"código de un solo uso enviado a {contrato.firmado_cliente_correo or '—'}",
            "fecha": fecha_hora(contrato.firmado_cliente_at),
            "ip": contrato.firmado_cliente_ip or "—",
            "dispositivo": contrato.firmado_cliente_user_agent or "—",
            "hash": contrato.firma_cliente_sha256,
        })
    bloques = "".join(
        "<table class='evid'>"
        f"<tr><th colspan='2' class='evid-rol'>{esc(f['rol'])} — {esc(f['nombre'])}</th></tr>"
        f"<tr><th>Método</th><td>{esc(f['metodo'])}</td></tr>"
        f"<tr><th>Fecha y hora</th><td>{esc(f['fecha'])}</td></tr>"
        f"<tr><th>Dirección IP</th><td class='mono'>{esc(f['ip'])}</td></tr>"
        f"<tr><th>Dispositivo</th><td class='small'>{esc(f['dispositivo'])}</td></tr>"
        f"<tr><th>Huella de la firma</th><td class='mono small'>SHA-256 {esc(f['hash'])}</td></tr>"
        "</table>"
        for f in firmantes
    )
    filas_eventos = "".join(
        f"<tr><td>{esc(fecha_hora(e.created_at))}</td><td>{esc(e.get_tipo_display())}</td>"
        f"<td class='mono'>{esc(e.ip or '—')}</td></tr>"
        for e in eventos
    )
    bitacora = (
        "<h3 class='evid-sub'>Bitácora del proceso de firma</h3>"
        f"<table class='bitacora'><tr><th>Fecha y hora</th><th>Evento</th><th>IP</th></tr>{filas_eventos}</table>"
        if filas_eventos
        else ""
    )
    return (
        "<section class='evidencia'>"
        "<h2 class='seccion'>Constancia de firma electrónica</h2>"
        "<p class='small'>Esta constancia forma parte integrante del contrato y acredita la manifestación de "
        "voluntad de los firmantes por medios electrónicos, conforme a la Cláusula Vigésima Segunda.</p>"
        "<table class='evid'>"
        f"<tr><th>Folio</th><td>{esc(contrato.folio or contrato.idx)}</td></tr>"
        f"<tr><th>Huella del contenido</th><td class='mono small'>SHA-256 {esc(documento_sha256 or '—')}</td></tr>"
        "</table>"
        f"{bloques}{bitacora}"
        "</section>"
    )


# ---------------------------------------------------------------- estilos


CSS = """
@page { size: Letter; margin: 22mm 20mm 20mm 20mm; }
* { box-sizing: border-box; }
html, body { margin: 0; background: #ffffff; color-scheme: light; }
body {
  font-family: "Inter", "Helvetica Neue", Helvetica, Arial, "Liberation Sans", sans-serif;
  font-size: 9.6pt; line-height: 1.55; color: #252523;
}
.serif { font-family: "Tiempos Headline", Georgia, "Times New Roman", "Liberation Serif", serif; }
.membrete {
  display: flex; align-items: center; justify-content: space-between;
  padding-bottom: 10px; border-bottom: 1.4px solid #141413; margin-bottom: 18px;
}
.membrete img { max-height: 44px; max-width: 170px; object-fit: contain; }
.membrete .meta { text-align: right; font-size: 8pt; color: #6c6a64; letter-spacing: .04em; }
.membrete .meta strong { display: block; color: #141413; font-size: 10pt; letter-spacing: .08em; }
.eyebrow { font-size: 7.5pt; letter-spacing: .18em; text-transform: uppercase; color: #a9583e; font-weight: 600; }
h1.titulo {
  font-family: "Tiempos Headline", Georgia, "Times New Roman", "Liberation Serif", serif;
  font-weight: 400; font-size: 22pt; line-height: 1.12; letter-spacing: -0.4px;
  color: #141413; margin: 4px 0 6px;
}
.subtitulo { font-size: 10pt; color: #6c6a64; margin: 0 0 16px; }
.caratula { border: 1px solid #e6dfd8; border-radius: 6px; background: #faf9f5; margin: 0 0 18px; overflow: hidden; break-inside: avoid; }
.caratula-titulo {
  background: #efe9de; padding: 7px 12px; font-size: 7.8pt; letter-spacing: .16em;
  text-transform: uppercase; font-weight: 600; color: #3d3d3a;
  display: flex; justify-content: space-between;
}
.caratula-titulo span { letter-spacing: .06em; color: #a9583e; }
.caratula table { width: 100%; border-collapse: collapse; }
.caratula th, .caratula td { padding: 6px 12px; vertical-align: top; border-top: 1px solid #ebe6df; text-align: left; }
.caratula th { width: 30%; font-size: 8pt; font-weight: 600; color: #6c6a64; text-transform: uppercase; letter-spacing: .06em; }
.caratula td { font-size: 9.4pt; color: #141413; }
.caratula .sub { display: block; font-size: 8pt; color: #6c6a64; }
p { margin: 0 0 8px; text-align: justify; hyphens: auto; }
.proemio { margin-bottom: 14px; }
h2.seccion {
  font-family: "Tiempos Headline", Georgia, "Times New Roman", "Liberation Serif", serif;
  font-weight: 400; font-size: 14pt; letter-spacing: -0.2px; color: #141413;
  text-align: center; margin: 18px 0 10px; padding-bottom: 6px;
  border-bottom: 1px solid #e6dfd8; break-after: avoid;
}
h3.declara { font-size: 9.6pt; font-weight: 600; color: #141413; margin: 10px 0 4px; break-after: avoid; }
ol.incisos { list-style: lower-alpha; margin: 0 0 8px; padding-left: 22px; }
ol.incisos li { margin-bottom: 5px; text-align: justify; padding-left: 2px; }
ol.incisos li::marker { font-weight: 600; }
.clausula { margin-bottom: 10px; }
.clausula h4 {
  margin: 0 0 3px; font-size: 9.2pt; font-weight: 700; color: #141413; letter-spacing: .02em;
  break-after: avoid;
}
.clausula h4 .num { color: #a9583e; }
.cierre { margin-top: 14px; }
.firmas { display: flex; gap: 28px; margin-top: 26px; break-inside: avoid; }
.firma { flex: 1; text-align: center; }
.firma-rol { font-size: 8pt; letter-spacing: .18em; font-weight: 600; color: #6c6a64; text-transform: uppercase; }
.firma-espacio { height: 74px; display: flex; align-items: flex-end; justify-content: center; margin-top: 6px; }
.firma-img { max-height: 70px; max-width: 220px; object-fit: contain; }
.firma-linea { border-top: 1px solid #141413; margin: 2px 12px 6px; }
.firma-razon { font-size: 8.4pt; font-weight: 600; color: #141413; }
.firma-nombre { font-size: 8.8pt; color: #252523; }
.firma-sello { margin-top: 4px; font-size: 7.4pt; color: #5d7d55; }
.firma-sello.pendiente { color: #8e8b82; font-style: italic; }
.evidencia { break-before: page; }
.evid { width: 100%; border-collapse: collapse; margin: 10px 0; border: 1px solid #e6dfd8; break-inside: avoid; }
.evid th, .evid td { text-align: left; padding: 5px 9px; border-top: 1px solid #ebe6df; vertical-align: top; font-size: 8.4pt; }
.evid th { width: 26%; color: #6c6a64; font-weight: 600; background: #faf9f5; }
.evid .evid-rol { width: auto; background: #efe9de; color: #141413; letter-spacing: .04em; }
.evid-sub { font-size: 9.4pt; margin: 16px 0 6px; color: #141413; }
.bitacora { width: 100%; border-collapse: collapse; font-size: 7.8pt; }
.bitacora th { text-align: left; color: #6c6a64; border-bottom: 1px solid #e6dfd8; padding: 4px 6px; }
.bitacora td { border-bottom: 1px solid #f0ebe3; padding: 4px 6px; }
.mono { font-family: "JetBrains Mono", "DejaVu Sans Mono", Consolas, monospace; word-break: break-all; }
.small { font-size: 7.8pt; color: #3d3d3a; }
.marca-agua {
  position: fixed; top: 42%; left: 0; right: 0; text-align: center;
  font-family: Georgia, "Times New Roman", serif; font-size: 92pt; letter-spacing: .12em;
  color: rgba(204, 120, 92, 0.10); transform: rotate(-28deg); z-index: 0; pointer-events: none;
}
"""


# ---------------------------------------------------------------- documento


def generar_contrato_html(contrato, d: dict, *, documento_sha256: str = "", eventos=(), borrador: bool = True) -> str:
    folio = contrato.folio or f"CTR-{contrato.idx or contrato.pk or ''}"
    logo = logo_data_uri_for_pdf()
    logo_html = f"<img src='{esc(logo)}' alt='' />" if logo.startswith("data:image/") else ""

    clausulas_html = "".join(
        "<div class='clausula'>"
        f"<h4><span class='num'>{ORDINALES[i]}.</span> {esc(titulo)}</h4>"
        + "".join(f"<p>{parrafo}</p>" for parrafo in parrafos)
        + "</div>"
        for i, (titulo, parrafos) in enumerate(_clausulas(d))
    )

    pr = d["prestador"]
    nombre_cliente = (
        d["cliente_razon_social"]
        if d["cliente_tipo_persona"] == TIPO_PERSONA_FISICA
        else (d["cliente_representante"] or "")
    )
    firmas = (
        "<div class='firmas'>"
        + _firma_bloque(
            "El Prestador",
            pr["razon_social"],
            contrato.firmado_prestador_nombre or pr.get("representante"),
            contrato.firma_prestador_png,
            contrato.firmado_prestador_at,
        )
        + _firma_bloque(
            "El Cliente",
            d["cliente_razon_social"] if d["cliente_tipo_persona"] != TIPO_PERSONA_FISICA else "",
            contrato.firma_cliente_nombre or nombre_cliente,
            contrato.firma_cliente_png,
            contrato.firmado_cliente_at,
        )
        + "</div>"
    )

    hay_firmas = bool(contrato.firmado_prestador_at or contrato.firmado_cliente_at)
    evidencia = _evidencia(contrato, d, documento_sha256, eventos) if hay_firmas else ""
    marca_agua = "<div class='marca-agua'>BORRADOR</div>" if borrador else ""

    return f"""<!doctype html>
<html lang="es"><head><meta charset="utf-8" />
<title>Contrato {esc(folio)}</title>
<style>{CSS}</style></head>
<body>
{marca_agua}
<header class="membrete">
  <div>{logo_html}</div>
  <div class="meta"><strong>{esc(folio)}</strong>Contrato de servicios</div>
</header>
<div class="eyebrow">Contrato de prestación de servicios</div>
<h1 class="titulo">Internet Dedicado</h1>
<p class="subtitulo">Que celebran {_txt(pr['razon_social'])} y {_txt(d['cliente_razon_social'])}</p>
{_caratula(d, folio)}
{_proemio(d)}
{_declaraciones(d)}
<h2 class="seccion">Cláusulas</h2>
{clausulas_html}
<p class="cierre">Leído que fue el presente contrato y enteradas {LP} de su contenido y alcance legal, lo
firman de conformidad en la ciudad de {_txt(d['ciudad_firma'])}, el día {esc(fecha_larga(d['fecha_firma']))}.</p>
{firmas}
{evidencia}
</body></html>"""
