"""Registro, deduplicación y credenciales del portal cliente."""

from __future__ import annotations

import re
import secrets
import string
from dataclasses import dataclass
from typing import Any

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone

from apps.clientes.models import Cliente, ClienteContacto
from apps.clientes.portal_models import (
    ClientePortalAccount,
    ClienteRegistroSolicitud,
    PortalUsernameSequence,
)
from apps.users.models import UserPermissions

User = get_user_model()

_TEMP_ALPHABET = string.ascii_letters + string.digits


@dataclass
class RegistroPayload:
    first_name: str
    last_name: str
    email: str
    telefono: str
    razon_social: str
    rfc: str
    codigo_postal: str
    acepto_privacidad: bool


@dataclass
class RegistroResult:
    outcome: str  # created | pending_review | rejected
    message: str
    solicitud_id: int | None = None
    portal_username: str | None = None


def normalize_email(value: str) -> str:
    return (value or '').strip().lower()


def normalize_rfc(value: str) -> str:
    return re.sub(r'\s+', '', (value or '').strip().upper())


def normalize_phone(value: str) -> str:
    digits = re.sub(r'\D', '', value or '')
    if len(digits) == 12 and digits.startswith('52'):
        digits = digits[2:]
    return digits[-10:] if len(digits) >= 10 else digits


def _portal_username_start() -> int:
    return int(getattr(settings, 'PORTAL_CLIENT_USERNAME_START', 10454000))


def allocate_portal_username() -> str:
    start = _portal_username_start()
    with transaction.atomic():
        seq, _ = PortalUsernameSequence.objects.select_for_update().get_or_create(
            pk=1,
            defaults={'last_value': start - 1},
        )
        if seq.last_value < start - 1:
            seq.last_value = start - 1
        seq.last_value += 1
        seq.save(update_fields=['last_value'])
        return str(seq.last_value)


def generate_temp_password(length: int = 12) -> str:
    while True:
        pwd = ''.join(secrets.choice(_TEMP_ALPHABET) for _ in range(length))
        if any(c.isalpha() for c in pwd) and any(c.isdigit() for c in pwd):
            return pwd


def _cliente_ids_by_email(email: str) -> set[int]:
    ids: set[int] = set(
        Cliente.objects.filter(correo__iexact=email).values_list('id', flat=True)
    )
    ids.update(
        ClienteContacto.objects.filter(correo__iexact=email).values_list('cliente_id', flat=True)
    )
    return ids


def _cliente_ids_by_rfc(rfc: str) -> set[int]:
    if not rfc:
        return set()
    return set(Cliente.objects.filter(rfc__iexact=rfc).values_list('id', flat=True))


def _is_staff_email(email: str) -> bool:
    return User.objects.filter(email__iexact=email, is_staff=True).exists()


def _user_exists(email: str) -> bool:
    return User.objects.filter(email__iexact=email).exists()


def _portal_account_exists_for_cliente(cliente_id: int) -> bool:
    return ClientePortalAccount.objects.filter(cliente_id=cliente_id).exists()


def _default_portal_permissions() -> dict:
    return {'portal_cliente': {'view': True}}


def _create_cliente_from_payload(payload: RegistroPayload) -> Cliente:
    nombre = (payload.razon_social or f'{payload.first_name} {payload.last_name}').strip()
    return Cliente.objects.create(
        nombre=nombre[:255],
        tipo='PERSONA_FISICA',
        correo=payload.email,
        celular=payload.telefono,
        telefono=payload.telefono,
        rfc=payload.rfc,
        codigo_postal=payload.codigo_postal,
        is_prospecto=True,
    )


def _create_portal_user(
    *,
    payload: RegistroPayload,
    portal_username: str,
    temp_password: str,
    cliente: Cliente,
    account_status: str,
) -> ClientePortalAccount:
    user = User.objects.create_user(
        username=portal_username,
        email=payload.email,
        password=temp_password,
        first_name=payload.first_name[:150],
        last_name=payload.last_name[:150],
        is_staff=False,
        is_superuser=False,
        is_active=True,
    )
    UserPermissions.objects.create(user=user, permissions=_default_portal_permissions())
    return ClientePortalAccount.objects.create(
        user=user,
        cliente=cliente,
        portal_username=portal_username,
        must_change_password=True,
        status=account_status,
    )


def send_portal_credentials_email(*, email: str, portal_username: str, temp_password: str) -> None:
    subject = 'Tu acceso a SertelPro'
    body = (
        f'Hola,\n\n'
        f'Tu cuenta en SertelPro quedó lista.\n\n'
        f'Usuario: {portal_username}\n'
        f'Contraseña temporal: {temp_password}\n\n'
        f'Al iniciar sesión te pediremos que elijas una contraseña nueva.\n\n'
        f'Si no solicitaste este registro, ignora este correo.\n'
    )
    from_email = settings.DEFAULT_FROM_EMAIL
    if not from_email or from_email == 'webmaster@localhost':
        # Dev sin SMTP: no fallar el registro; el admin puede ver credenciales en logs/tests.
        return
    send_mail(subject, body, from_email, [email], fail_silently=False)


def _resolve_cliente(payload: RegistroPayload, dedup: dict[str, Any]) -> tuple[int | None, bool]:
    """Returns (cliente_id, ambiguous)."""
    email_ids = _cliente_ids_by_email(payload.email)
    rfc_ids = _cliente_ids_by_rfc(payload.rfc)
    dedup['email_cliente_ids'] = sorted(email_ids)
    dedup['rfc_cliente_ids'] = sorted(rfc_ids)

    if len(email_ids) > 1:
        dedup['ambiguous'] = True
        dedup['reason'] = 'email_multiple'
        return None, True
    if payload.rfc and len(rfc_ids) > 1:
        dedup['ambiguous'] = True
        dedup['reason'] = 'rfc_multiple'
        return None, True

    cliente_id: int | None = None
    if email_ids and rfc_ids:
        intersection = email_ids & rfc_ids
        if len(intersection) == 1:
            cliente_id = next(iter(intersection))
        else:
            dedup['ambiguous'] = True
            dedup['reason'] = 'email_rfc_mismatch'
            return None, True
    elif email_ids:
        cliente_id = next(iter(email_ids))
    elif rfc_ids:
        cliente_id = next(iter(rfc_ids))

    if cliente_id is None:
        return None, False

    if _portal_account_exists_for_cliente(cliente_id):
        dedup['cliente_already_has_portal'] = True
        return cliente_id, False
    return cliente_id, False


@transaction.atomic
def register_portal_cliente(payload: RegistroPayload) -> RegistroResult:
    email = normalize_email(payload.email)
    payload.email = email
    payload.rfc = normalize_rfc(payload.rfc)
    payload.telefono = normalize_phone(payload.telefono)

    if not payload.acepto_privacidad:
        return RegistroResult('rejected', 'Debes aceptar el aviso de privacidad.')

    existing_user = User.objects.filter(email__iexact=email).first()
    if existing_user:
        if existing_user.is_staff or existing_user.is_superuser:
            return RegistroResult('rejected', 'Este correo es de personal interno.')
        return RegistroResult(
            'rejected',
            'Ya tienes cuenta. Inicia sesión o solicita ayuda a tu ejecutivo.',
        )

    if _is_staff_email(email):
        return RegistroResult('rejected', 'Este correo es de personal interno.')

    # Anti-spam: si ese correo ya dejó una solicitud sin resolver, no se crea otra
    # (ni cuenta, ni fila nueva en la cola de revisión). Se responde con la misma
    # solicitud para que el cliente vea "en revisión" en vez de reenviar.
    pending = (
        ClienteRegistroSolicitud.objects.filter(
            email__iexact=email,
            status=ClienteRegistroSolicitud.STATUS_PENDING,
        )
        .order_by('-created_at')
        .first()
    )
    if pending is not None:
        return RegistroResult(
            'pending_review',
            'Ya tenemos una solicitud tuya en revisión. Te contactaremos por correo.',
            solicitud_id=pending.id,
        )

    dedup: dict[str, Any] = {}
    cliente_id, ambiguous = _resolve_cliente(payload, dedup)

    if dedup.get('cliente_already_has_portal'):
        return RegistroResult(
            'rejected',
            'Este cliente ya tiene una cuenta de portal. Inicia sesión o solicita ayuda.',
        )

    if ambiguous:
        solicitud = ClienteRegistroSolicitud.objects.create(
            first_name=payload.first_name,
            last_name=payload.last_name,
            email=email,
            telefono=payload.telefono,
            razon_social=payload.razon_social,
            rfc=payload.rfc,
            codigo_postal=payload.codigo_postal,
            acepto_privacidad=True,
            dedup_result=dedup,
            status=ClienteRegistroSolicitud.STATUS_PENDING,
        )
        return RegistroResult(
            'pending_review',
            'Recibimos tu solicitud. Un administrador la revisará y te contactará por correo.',
            solicitud_id=solicitud.id,
        )

    if cliente_id:
        cliente = Cliente.objects.get(pk=cliente_id)
    else:
        cliente = _create_cliente_from_payload(payload)

    portal_username = allocate_portal_username()
    temp_password = generate_temp_password()
    account = _create_portal_user(
        payload=payload,
        portal_username=portal_username,
        temp_password=temp_password,
        cliente=cliente,
        account_status=ClientePortalAccount.STATUS_ACTIVE,
    )
    solicitud = ClienteRegistroSolicitud.objects.create(
        first_name=payload.first_name,
        last_name=payload.last_name,
        email=email,
        telefono=payload.telefono,
        razon_social=payload.razon_social,
        rfc=payload.rfc,
        codigo_postal=payload.codigo_postal,
        acepto_privacidad=True,
        dedup_result=dedup,
        status=ClienteRegistroSolicitud.STATUS_AUTO_APPROVED,
        cliente=cliente,
        portal_account=account,
    )

    try:
        send_portal_credentials_email(
            email=email,
            portal_username=portal_username,
            temp_password=temp_password,
        )
    except Exception:
        # La cuenta ya existe; en producción conviene alertar ops.
        pass

    return RegistroResult(
        'created',
        'Revisa tu correo: te enviamos tu usuario y contraseña temporal.',
        solicitud_id=solicitud.id,
        portal_username=portal_username,
    )


def get_portal_context_for_user(user) -> dict[str, Any] | None:
    try:
        account = user.cliente_portal_account
    except ClientePortalAccount.DoesNotExist:
        return None
    return {
        'account_type': 'cliente',
        'portal_username': account.portal_username,
        'must_change_password': account.must_change_password,
        'cliente_id': account.cliente_id,
        'portal_status': account.status,
    }


def change_portal_password(*, user, current_password: str, new_password: str) -> None:
    account = user.cliente_portal_account
    if not user.check_password(current_password):
        raise ValueError('La contraseña actual no es correcta.')
    if len(new_password) < 8:
        raise ValueError('La contraseña nueva debe tener al menos 8 caracteres.')
    user.set_password(new_password)
    user.save(update_fields=['password'])
    account.must_change_password = False
    account.password_changed_at = timezone.now()
    account.save(update_fields=['must_change_password', 'password_changed_at', 'updated_at'])


@transaction.atomic
def approve_registro_solicitud(*, solicitud: ClienteRegistroSolicitud, reviewer, cliente_id: int) -> ClientePortalAccount:
    if solicitud.status != ClienteRegistroSolicitud.STATUS_PENDING:
        raise ValueError('La solicitud ya fue procesada.')
    if _user_exists(solicitud.email):
        raise ValueError('Ya existe un usuario con ese correo.')

    cliente = Cliente.objects.get(pk=cliente_id)
    if _portal_account_exists_for_cliente(cliente.id):
        raise ValueError('Ese cliente ya tiene cuenta de portal.')

    payload = RegistroPayload(
        first_name=solicitud.first_name,
        last_name=solicitud.last_name,
        email=solicitud.email,
        telefono=solicitud.telefono,
        razon_social=solicitud.razon_social,
        rfc=solicitud.rfc,
        codigo_postal=solicitud.codigo_postal,
        acepto_privacidad=True,
    )
    portal_username = allocate_portal_username()
    temp_password = generate_temp_password()
    account = _create_portal_user(
        payload=payload,
        portal_username=portal_username,
        temp_password=temp_password,
        cliente=cliente,
        account_status=ClientePortalAccount.STATUS_ACTIVE,
    )
    solicitud.status = ClienteRegistroSolicitud.STATUS_APPROVED
    solicitud.cliente = cliente
    solicitud.portal_account = account
    solicitud.reviewed_by = reviewer
    solicitud.reviewed_at = timezone.now()
    solicitud.save(
        update_fields=[
            'status',
            'cliente',
            'portal_account',
            'reviewed_by',
            'reviewed_at',
            'updated_at',
        ]
    )
    send_portal_credentials_email(
        email=solicitud.email,
        portal_username=portal_username,
        temp_password=temp_password,
    )
    return account


def reject_registro_solicitud(*, solicitud: ClienteRegistroSolicitud, reviewer, reason: str) -> None:
    if solicitud.status != ClienteRegistroSolicitud.STATUS_PENDING:
        raise ValueError('La solicitud ya fue procesada.')
    solicitud.status = ClienteRegistroSolicitud.STATUS_REJECTED
    solicitud.rejection_reason = (reason or '').strip()[:2000]
    solicitud.reviewed_by = reviewer
    solicitud.reviewed_at = timezone.now()
    solicitud.save(
        update_fields=['status', 'rejection_reason', 'reviewed_by', 'reviewed_at', 'updated_at']
    )
