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
    device_login_start,
    device_login_poll,
    device_login_approve,
    device_login_qr,
)
from uploadtest.catalog_views import catalog_media_v1, catalog_v1, playback_session
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
    path("api/auth/device/start/", device_login_start),
    path("api/auth/device/poll/", device_login_poll),
    path("api/auth/device/approve/", device_login_approve),
    path("api/auth/device/qr/", device_login_qr),
    path("api/profiles/", profiles),
    path("api/profiles/<int:profile_id>/", profile_detail),
    path("api/progress/", progress),
    path("api/history/", history),
    path("api/catalog/v1/", catalog_v1),
    path("api/catalog/v1/media/<str:media_id>/", catalog_media_v1),
    path("api/playback/session/", playback_session),
]
