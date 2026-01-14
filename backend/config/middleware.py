class DisableCSRFFromAuthorizationMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)

    def process_view(self, request, view_func, view_args, view_kwargs):
        if not request.path.startswith('/api/'):
            return None

        auth = request.META.get('HTTP_AUTHORIZATION', '')
        if auth.lower().startswith('bearer '):
            setattr(request, '_dont_enforce_csrf_checks', True)
        return None
