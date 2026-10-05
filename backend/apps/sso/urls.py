from django.urls import path

from . import views

urlpatterns = [
    path("authorize/", views.authorize, name="sso-authorize"),
    path("login/", views.login, name="sso-login"),
    path("token/", views.token, name="sso-token"),
    path("userinfo/", views.userinfo, name="sso-userinfo"),
]
