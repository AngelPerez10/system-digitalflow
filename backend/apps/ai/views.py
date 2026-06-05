import http.client
import json
import logging
import os
import time
from urllib.parse import urlparse

from django.http import StreamingHttpResponse
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

logger = logging.getLogger(__name__)


def _get_ai_config():
    base_url = (os.environ.get('AI_API_URL') or 'https://bun-ai-api-51jw.onrender.com').rstrip('/')
    api_key = os.environ.get('AI_API_KEY')
    return base_url, api_key


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chat(request):
    base_url, api_key = _get_ai_config()
    if not api_key:
        return Response({'detail': 'AI_API_KEY is not configured'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    messages = request.data.get('messages')
    if not isinstance(messages, list) or len(messages) == 0:
        return Response({'detail': 'messages must be a non-empty array'}, status=status.HTTP_400_BAD_REQUEST)

    payload = json.dumps({'messages': messages}).encode('utf-8')

    parsed = urlparse(f'{base_url}/chat')
    if parsed.scheme != 'https':
        return Response({'detail': 'AI_API_URL must be https'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    host = parsed.hostname
    if not host:
        return Response({'detail': 'AI_API_URL is invalid'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    port = parsed.port or 443
    path = parsed.path or '/chat'

    upstream_timeout_s = int(os.environ.get('AI_API_UPSTREAM_TIMEOUT_S') or '120')
    upstream_retries = int(os.environ.get('AI_API_UPSTREAM_RETRIES') or '2')
    upstream_retry_backoff_s = float(os.environ.get('AI_API_UPSTREAM_RETRY_BACKOFF_S') or '0.8')
    conn = None
    upstream = None

    for attempt in range(upstream_retries + 1):
        try:
            conn = http.client.HTTPSConnection(host, port=port, timeout=upstream_timeout_s)
            conn.request(
                'POST',
                path,
                body=payload,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {api_key}',
                    'Accept': 'text/event-stream',
                },
            )
            upstream = conn.getresponse()

            if upstream.status in (502, 503, 504) and attempt < upstream_retries:
                try:
                    upstream.read()
                except Exception:
                    logger.exception("Failed to read upstream response during retry cleanup")
                try:
                    conn.close()
                except Exception:
                    logger.exception("Failed to close connection during retry cleanup")
                time.sleep(upstream_retry_backoff_s * (2 ** attempt))
                continue

            # Disable read timeout for long-lived SSE streams.
            # Keep connect timeout above for faster failures.
            if getattr(conn, 'sock', None) is not None:
                conn.sock.settimeout(None)
            break
        except TimeoutError:
            if attempt >= upstream_retries:
                return Response({'detail': 'El servicio de IA no responde. Intente de nuevo en unos minutos.'}, status=status.HTTP_504_GATEWAY_TIMEOUT)
            time.sleep(upstream_retry_backoff_s * (2 ** attempt))
            continue
        except OSError:
            if attempt >= upstream_retries:
                return Response({'detail': 'No se pudo conectar al servicio de IA.'}, status=status.HTTP_502_BAD_GATEWAY)
            time.sleep(upstream_retry_backoff_s * (2 ** attempt))
            continue

    if upstream is None or conn is None:
        return Response({'detail': 'No se pudo conectar al servicio de IA.'}, status=status.HTTP_502_BAD_GATEWAY)

    if upstream.status >= 400:
        try:
            detail = upstream.read().decode('utf-8', errors='ignore')
        except Exception:
            logger.exception("Failed to read upstream error response body")
            detail = ''
        try:
            conn.close()
        except Exception:
            logger.exception("Failed to close connection after upstream error")
        return Response(
            {'detail': 'Upstream AI API error', 'status': upstream.status, 'reason': getattr(upstream, 'reason', ''), 'body': detail},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    def stream():
        try:
            while True:
                chunk = upstream.readline()
                if not chunk:
                    break
                yield chunk
        except GeneratorExit:
            return
        finally:
            try:
                try:
                    upstream.close()
                except Exception:
                    logger.exception("Failed to close upstream connection in stream cleanup")
                conn.close()
            except Exception:
                logger.exception("Failed to close HTTP connection in stream cleanup")

    resp = StreamingHttpResponse(stream(), content_type='text/event-stream; charset=utf-8')
    resp['Cache-Control'] = 'no-cache'
    resp['X-Accel-Buffering'] = 'no'
    return resp
