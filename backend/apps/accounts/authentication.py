from rest_framework.authentication import SessionAuthentication


class StaffSessionAuthentication(SessionAuthentication):
    """
    Session auth that answers 401 (not 403) when there is no session, so the SPA can tell an expired
    login apart from a missing permission and send the user back to the sign-in form.
    """

    def authenticate_header(self, request):
        return 'Session realm="twings"'
