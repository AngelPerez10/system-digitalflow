class DisableCSRFFromAuthorizationMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)

    def process_view(self, request, view_func, view_args, view_kwargs):
        # In this project the API is stateless and authenticated via
        # Authorization: Bearer <JWT>. CSRF protection is not applicable to
        # these endpoints because the browser will not automatically attach
        # credentials that could be abused cross-site.
        # Keep CSRF enabled for non-API routes like /admin/.
        if request.path.startswith('/api/'):
            setattr(request, '_dont_enforce_csrf_checks', True)
        return None
