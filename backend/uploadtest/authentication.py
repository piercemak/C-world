from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from rest_framework.authentication import TokenAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.throttling import SimpleRateThrottle
from rest_framework.authtoken.models import Token


def token_is_expired(token):
    ttl_seconds = max(3600, int(getattr(settings, "CWORLD_TOKEN_TTL_SECONDS", 2592000)))
    return token.created + timedelta(seconds=ttl_seconds) <= timezone.now()


def fresh_token_for_user(user):
    token = Token.objects.filter(user=user).first()
    if token and token_is_expired(token):
        token.delete()
        token = None
    return token or Token.objects.create(user=user)


class ExpiringTokenAuthentication(TokenAuthentication):
    def authenticate_credentials(self, key):
        user, token = super().authenticate_credentials(key)
        if token_is_expired(token):
            token.delete()
            raise AuthenticationFailed("Your session has expired. Please sign in again.")
        return user, token


class AccountRateThrottle(SimpleRateThrottle):
    scope = "account"

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}
