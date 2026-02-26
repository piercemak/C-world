from django.conf import settings
from django.contrib.auth import authenticate
from rest_framework.decorators import api_view, authentication_classes, permission_classes # type: ignore
from rest_framework.response import Response # type: ignore
from rest_framework import status # type: ignore
from rest_framework.authentication import TokenAuthentication # type: ignore
from rest_framework.permissions import IsAuthenticated # type: ignore
from rest_framework.authtoken.models import Token # type: ignore
from django.core.mail import send_mail
from datetime import datetime, timedelta
import base64
import json
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.backends import default_backend
from urllib.parse import quote_plus
import os
from .serializers import (
    RegisterSerializer,
    UserSerializer,
    ProfileSerializer,
    WatchProgressSerializer,
    WatchHistorySerializer,
)
from .models import Profile, WatchProgress, WatchHistory



CLOUDFRONT_DOMAIN = settings.CLOUDFRONT_DOMAIN

def rsa_signer(message: str):
    key_data = os.getenv("CLOUDFRONT_PRIVATE_KEY")
    if not key_data:
        raise ValueError("Missing CLOUDFRONT_PRIVATE_KEY environment variable")

    private_key = serialization.load_pem_private_key(
        key_data.encode("utf-8"),
        password=None,
        backend=default_backend()
    )

    return private_key.sign(
        message.encode('utf-8'),
        padding.PKCS1v15(),
        hashes.SHA1()
    )

@api_view(['GET'])
def get_signed_url(request):
    key = request.query_params.get('key')
    if not key:
        return Response({'error': 'Missing key parameter'}, status=400)

    resource_url = f"https://{CLOUDFRONT_DOMAIN}/{key}"
    expires = int((datetime.utcnow() + timedelta(hours=1)).timestamp())

    policy = {
        "Statement": [{
            "Resource": resource_url,
            "Condition": {"DateLessThan": {"AWS:EpochTime": expires}}
        }]
    }
    policy_json = json.dumps(policy).replace(" ", "")
    policy_b64 = base64.b64encode(policy_json.encode()).decode()

    signature = rsa_signer(policy_json)
    signature_b64 = base64.b64encode(signature).decode()

    key_pair_id = settings.CLOUDFRONT_KEY_PAIR_ID

    signed_url = (
        f"{resource_url}?Policy={quote_plus(policy_b64)}"
        f"&Signature={quote_plus(signature_b64)}"
        f"&Key-Pair-Id={quote_plus(key_pair_id)}"
    )

    return Response({'url': signed_url})


@api_view(['POST'])
def send_request_email(request):
    media_request = request.data.get('mediaRequest')
    language_subs = request.data.get('languageSubs')

    message = f"Media Request: {media_request}\nLanguage/Subtitles: {language_subs}"
    
    send_mail(
        subject="New Media Request",
        message=message,
        from_email="cworldrequests@gmail.com", 
        recipient_list=["cworldrequests@gmail.com"],
        fail_silently=False,
    )

    return Response({"success": True})


@api_view(["POST"])
def register_user(request):
    serializer = RegisterSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = serializer.save()
    # Create a default profile so the profile picker has content after signup.
    Profile.objects.create(user=user, name=user.username)
    token, _ = Token.objects.get_or_create(user=user)

    return Response(
        {"token": token.key, "user": UserSerializer(user).data},
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
def login_user(request):
    username = request.data.get("username")
    password = request.data.get("password")

    if not username or not password:
        return Response(
            {"error": "Username and password are required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = authenticate(username=username, password=password)
    if not user:
        return Response(
            {"error": "Invalid credentials"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    # Accounts created outside the register endpoint may not have a profile yet.
    # Ensure at least one profile exists so progress/history sync can attach to it.
    if not Profile.objects.filter(user=user).exists():
        Profile.objects.create(user=user, name=user.username)

    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key, "user": UserSerializer(user).data})


@api_view(["POST"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def logout_user(request):
    Token.objects.filter(user=request.user).delete()
    return Response({"success": True})


@api_view(["GET"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def me(request):
    return Response({"user": UserSerializer(request.user).data})


@api_view(["GET", "POST"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def profiles(request):
    if request.method == "GET":
        queryset = Profile.objects.filter(user=request.user)
        return Response(ProfileSerializer(queryset, many=True).data)

    serializer = ProfileSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    profile = serializer.save(user=request.user)
    return Response(ProfileSerializer(profile).data, status=status.HTTP_201_CREATED)


@api_view(["PATCH", "DELETE"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def profile_detail(request, profile_id):
    try:
        profile = Profile.objects.get(id=profile_id, user=request.user)
    except Profile.DoesNotExist:
        return Response({"error": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "DELETE":
        profile.delete()
        return Response({"success": True})

    serializer = ProfileSerializer(profile, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    serializer.save()
    return Response(serializer.data)


def _get_active_profile(request):
    profile_id = request.headers.get("X-Profile-Id") or request.query_params.get("profile_id")
    if not profile_id:
        return None, Response(
            {"error": "X-Profile-Id header is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )
    try:
        profile = Profile.objects.get(id=profile_id, user=request.user)
    except (ValueError, Profile.DoesNotExist):
        return None, Response(
            {"error": "Invalid profile"},
            status=status.HTTP_404_NOT_FOUND,
        )
    return profile, None


@api_view(["GET", "POST"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def progress(request):
    profile, error_response = _get_active_profile(request)
    if error_response:
        return error_response

    if request.method == "GET":
        queryset = WatchProgress.objects.filter(profile=profile)
        return Response(WatchProgressSerializer(queryset, many=True).data)

    show_id = request.data.get("show_id")
    if not show_id:
        return Response(
            {"error": "show_id is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    season = request.data.get("season")
    episode = request.data.get("episode")
    current_time = float(request.data.get("current_time", 0) or 0)
    duration = float(request.data.get("duration", 0) or 0)

    obj, _ = WatchProgress.objects.update_or_create(
        profile=profile,
        show_id=show_id,
        season=season if season is not None else None,
        episode=episode if episode is not None else None,
        defaults={"current_time": current_time, "duration": duration},
    )
    return Response(WatchProgressSerializer(obj).data)


@api_view(["GET", "POST"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def history(request):
    profile, error_response = _get_active_profile(request)
    if error_response:
        return error_response

    if request.method == "GET":
        queryset = WatchHistory.objects.filter(profile=profile)
        return Response(WatchHistorySerializer(queryset, many=True).data)

    show_id = request.data.get("show_id")
    if not show_id:
        return Response(
            {"error": "show_id is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )
    season = request.data.get("season")
    episode = request.data.get("episode")

    obj, _ = WatchHistory.objects.update_or_create(
        profile=profile,
        show_id=show_id,
        defaults={
            "season": season if season is not None else None,
            "episode": episode if episode is not None else None,
        },
    )
    return Response(WatchHistorySerializer(obj).data)
