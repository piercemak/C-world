from uploadtest.views import get_signed_url
from uploadtest.views import send_request_email
from django.urls import path, include
from django.contrib import admin

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/signed-url/', get_signed_url),
    path('api/send-request/', send_request_email),
]
