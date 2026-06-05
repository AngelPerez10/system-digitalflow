"""
Shared SSRF guards for remote image fetches (PDF/Excel embedding).
"""
from __future__ import annotations

import ipaddress
import logging
import os
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

_allowed_embed_hosts_env = os.environ.get('IMG_EMBED_ALLOW_HOSTS', '').strip()
IMG_EMBED_ALLOW_HOSTS = {
    h.strip().lower()
    for h in (_allowed_embed_hosts_env.split(',') if _allowed_embed_hosts_env else [])
    if h.strip()
}


def is_cloudinary_host(host: str) -> bool:
    host = (host or '').lower()
    return host.endswith('cloudinary.com')


def is_syscom_image_host(host: str) -> bool:
    """SYSCOM product photos (www.syscom.mx, ftp3.syscom.mx, etc.)."""
    host = (host or '').lower()
    return host == 'syscom.mx' or host.endswith('.syscom.mx')


def is_intrax_image_host(host: str) -> bool:
    """Intrax catalog / WooCommerce media."""
    host = (host or '').lower()
    return host == 'intrax.mx' or host.endswith('.intrax.mx')


def _is_private_or_local_host(host: str) -> bool:
    """Block localhost, loopback, link-local, and private/reserved IPs."""
    if not host:
        return True
    host = host.lower()
    if host in ('localhost', '127.0.0.1', '::1', '0.0.0.0'):
        return True
    try:
        addr = ipaddress.ip_address(host)
        return (
            addr.is_private
            or addr.is_loopback
            or addr.is_link_local
            or addr.is_reserved
            or addr.is_multicast
        )
    except ValueError:
        pass
    if host.endswith('.local') or host.endswith('.internal'):
        return True
    return False


def is_embed_url_allowed(url: str) -> bool:
    """
    Allow only data: URLs and approved remote hosts (Cloudinary/allowlist),
    to avoid SSRF when embedding remote images.
    """
    if not isinstance(url, str) or not url:
        return False
    if url.startswith('data:'):
        return True
    if not (url.startswith('http://') or url.startswith('https://')):
        return False
    try:
        host = (urlparse(url).hostname or '').lower()
    except Exception:
        logger.exception('Failed to parse URL for SSRF check')
        return False
    if _is_private_or_local_host(host):
        return False
    return (
        host in IMG_EMBED_ALLOW_HOSTS
        or is_cloudinary_host(host)
        or is_syscom_image_host(host)
        or is_intrax_image_host(host)
    )
