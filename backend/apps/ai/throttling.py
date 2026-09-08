from rest_framework.throttling import UserRateThrottle


class AiChatRateThrottle(UserRateThrottle):
    """Limita `POST /api/ai/chat/` por usuario, aparte del `user` global.

    El endpoint es un proxy autenticado hacia un servicio de IA de pago
    (`AI_API_KEY`). El throttle global `user` (1000/hora) es demasiado holgado
    para tráfico que cuesta dinero por llamada: un solo usuario podría quemar
    cuota/factura. El `rate` sale de `DEFAULT_THROTTLE_RATES['ai_chat']`
    (default 30/hora, overridable con `THROTTLE_AI_CHAT_RATE` para CI o cuentas
    con necesidades especiales).
    """

    scope = 'ai_chat'
