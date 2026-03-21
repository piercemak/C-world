from uploadtest.views import (
    get_signed_url,
    get_signed_episode_url,
    send_request_email,
    register_user,
    login_user,
    logout_user,
    me,
    profiles,
    profile_detail,
    progress,
    history,
)
from django.urls import path
from django.contrib import admin

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/signed-url/', get_signed_url),
    path('api/signed-episode-url/', get_signed_episode_url),
    path('api/send-request/', send_request_email),
    path("api/auth/register/", register_user),
    path("api/auth/login/", login_user),
    path("api/auth/logout/", logout_user),
    path("api/auth/me/", me),
    path("api/profiles/", profiles),
    path("api/profiles/<int:profile_id>/", profile_detail),
    path("api/progress/", progress),
    path("api/history/", history),
]
