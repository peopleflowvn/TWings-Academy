def get_username(request, credentials):
    """
    Tell django-axes which account a login attempt targeted (lockout is per username + IP).

    Axes passes the credentials under different keys depending on the code path: "username" when a
    failure is recorded (Django's user_login_failed signal) but USERNAME_FIELD ("email") when the
    backend checks for a lockout before authenticating. Both must resolve to the same value, or the
    lockout check never sees the recorded failures.
    """
    credentials = credentials or {}
    value = credentials.get("username") or credentials.get("email")
    return str(value).strip().lower() if value else None


def lockout_response(request, response=None, credentials=None, *args, **kwargs):
    """JSON 429 for the SPA instead of axes' default HTML page."""
    from django.http import JsonResponse

    return JsonResponse(
        {"detail": "Tài khoản tạm khóa do đăng nhập sai nhiều lần. Vui lòng thử lại sau 1 giờ."}, status=429
    )
