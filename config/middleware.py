class HeadersMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        response['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
        # Original supplied themes use inline styles. Scripts remain local only.
        response['Content-Security-Policy'] = (
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "img-src 'self' data: blob: https:; media-src 'self' blob: https:; "
            "font-src 'self' data: https://fonts.gstatic.com; connect-src 'self'; "
            "frame-src 'self' https://www.google.com https://maps.google.com https://www.youtube.com https://www.youtube-nocookie.com; "
            "object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'"
        )
        if request.path.startswith(('/dashboard/', '/accounts/', '/admin/')) or request.GET.get('to'):
            response['Cache-Control'] = 'private, no-store'
        return response
