from django.conf import settings
from django.contrib.auth import authenticate
from django.db import IntegrityError, transaction
from django.http import HttpResponse
from django.utils import timezone
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
import hashlib
import io
import secrets
import boto3
import qrcode
from .serializers import (
    RegisterSerializer,
    UserSerializer,
    ProfileSerializer,
    WatchProgressSerializer,
    WatchHistorySerializer,
)
from .models import DeviceLoginSession, Profile, WatchProgress, WatchHistory



CLOUDFRONT_DOMAIN = settings.CLOUDFRONT_DOMAIN
DEVICE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def _hash_device_value(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _new_device_code() -> str:
    first = "".join(secrets.choice(DEVICE_CODE_ALPHABET) for _ in range(4))
    second = "".join(secrets.choice(DEVICE_CODE_ALPHABET) for _ in range(4))
    return f"{first}-{second}"


def _canonical_device_code(value: str) -> str:
    return "".join(str(value or "").upper().split()).replace("-", "")


def _ensure_user_profile(user):
    if not Profile.objects.filter(user=user).exists():
        Profile.objects.create(user=user, name=user.username)


@api_view(["POST"])
def device_login_start(request):
    now = timezone.now()
    ttl_seconds = max(60, int(getattr(settings, "CWORLD_DEVICE_LOGIN_TTL_SECONDS", 300)))

    DeviceLoginSession.objects.filter(
        status__in=[DeviceLoginSession.STATUS_PENDING, DeviceLoginSession.STATUS_APPROVED],
        expires_at__lte=now,
    ).update(status=DeviceLoginSession.STATUS_CONSUMED, consumed_at=now)

    for _ in range(3):
        poll_token = secrets.token_urlsafe(32)
        device_code = _new_device_code()
        try:
            session = DeviceLoginSession.objects.create(
                poll_token_hash=_hash_device_value(poll_token),
                user_code_hash=_hash_device_value(_canonical_device_code(device_code)),
                expires_at=now + timedelta(seconds=ttl_seconds),
            )
            break
        except IntegrityError:
            continue
    else:
        return Response(
            {"error": "Unable to create a device login session."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    verification_url = f"{settings.CWORLD_PUBLIC_WEB_URL}/device?code={device_code}"
    qr_url = f"{settings.CWORLD_PUBLIC_API_URL}/api/auth/device/qr/?code={device_code}"
    return Response({
        "status": DeviceLoginSession.STATUS_PENDING,
        "pollToken": poll_token,
        "deviceCode": device_code,
        "verificationUrl": verification_url,
        "qrUrl": qr_url,
        "expiresIn": ttl_seconds,
        "expiresAt": session.expires_at.isoformat(),
    })


@api_view(["POST"])
def device_login_poll(request):
    poll_token = (request.data.get("pollToken") or request.data.get("poll_token") or "").strip()
    if not poll_token:
        return Response(
            {"error": "pollToken is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    now = timezone.now()
    try:
        with transaction.atomic():
            session = DeviceLoginSession.objects.select_for_update().select_related("user").get(
                poll_token_hash=_hash_device_value(poll_token)
            )
            if session.expires_at <= now:
                session.status = DeviceLoginSession.STATUS_CONSUMED
                session.consumed_at = now
                session.save(update_fields=["status", "consumed_at"])
                return Response(
                    {"status": "expired", "error": "This device code has expired."},
                    status=status.HTTP_410_GONE,
                )

            if session.status == DeviceLoginSession.STATUS_PENDING:
                return Response({"status": DeviceLoginSession.STATUS_PENDING}, status=status.HTTP_202_ACCEPTED)

            if session.status != DeviceLoginSession.STATUS_APPROVED or session.user is None:
                return Response(
                    {"status": "expired", "error": "This device login is no longer available."},
                    status=status.HTTP_410_GONE,
                )

            user = session.user
            _ensure_user_profile(user)
            token, _ = Token.objects.get_or_create(user=user)
            session.status = DeviceLoginSession.STATUS_CONSUMED
            session.consumed_at = now
            session.save(update_fields=["status", "consumed_at"])
    except DeviceLoginSession.DoesNotExist:
        return Response(
            {"error": "Invalid device login session."},
            status=status.HTTP_404_NOT_FOUND,
        )

    return Response({
        "status": DeviceLoginSession.STATUS_APPROVED,
        "token": token.key,
        "user": UserSerializer(user).data,
    })


@api_view(["POST"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def device_login_approve(request):
    device_code = _canonical_device_code(request.data.get("deviceCode") or request.data.get("code"))
    if not device_code:
        return Response(
            {"error": "deviceCode is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    now = timezone.now()
    try:
        with transaction.atomic():
            session = DeviceLoginSession.objects.select_for_update().get(
                user_code_hash=_hash_device_value(device_code)
            )
            if session.expires_at <= now:
                session.status = DeviceLoginSession.STATUS_CONSUMED
                session.consumed_at = now
                session.save(update_fields=["status", "consumed_at"])
                return Response(
                    {"error": "This device code has expired."},
                    status=status.HTTP_410_GONE,
                )
            if session.status == DeviceLoginSession.STATUS_CONSUMED:
                return Response(
                    {"error": "This device code has already been used."},
                    status=status.HTTP_410_GONE,
                )
            if session.status == DeviceLoginSession.STATUS_APPROVED:
                if session.user_id != request.user.id:
                    return Response(
                        {"error": "This device code has already been approved."},
                        status=status.HTTP_409_CONFLICT,
                    )
                return Response(
                    {"status": "approved"},
                    status=status.HTTP_200_OK,
                )

            session.user = request.user
            session.status = DeviceLoginSession.STATUS_APPROVED
            session.approved_at = now
            session.save(update_fields=["user", "status", "approved_at"])
    except DeviceLoginSession.DoesNotExist:
        return Response(
            {"error": "Invalid device code."},
            status=status.HTTP_404_NOT_FOUND,
        )

    return Response({"status": DeviceLoginSession.STATUS_APPROVED})


@api_view(["GET"])
def device_login_qr(request):
    device_code = _canonical_device_code(request.query_params.get("code"))
    if not device_code:
        return Response(
            {"error": "code is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        session = DeviceLoginSession.objects.get(
            user_code_hash=_hash_device_value(device_code)
        )
    except DeviceLoginSession.DoesNotExist:
        return Response({"error": "Invalid device code."}, status=status.HTTP_404_NOT_FOUND)

    if session.expires_at <= timezone.now() or session.status != DeviceLoginSession.STATUS_PENDING:
        return Response({"error": "This device code is no longer available."}, status=status.HTTP_410_GONE)

    verification_url = f"{settings.CWORLD_PUBLIC_WEB_URL}/device?code={device_code}"
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=8,
        border=4,
    )
    qr.add_data(verification_url)
    qr.make(fit=True)
    image = qr.make_image(fill_color="black", back_color="white")
    output = io.BytesIO()
    image.save(output, format="PNG")
    response = HttpResponse(output.getvalue(), content_type="image/png")
    response["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    return response

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


def build_signed_cloudfront_url(key: str):
    resource_url = f"https://{CLOUDFRONT_DOMAIN}/{key}"
    signed_url_ttl_seconds = int(os.getenv("SIGNED_URL_TTL_SECONDS", "21600"))
    expires = int((datetime.utcnow() + timedelta(seconds=signed_url_ttl_seconds)).timestamp())

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

    return (
        f"{resource_url}?Policy={quote_plus(policy_b64)}"
        f"&Signature={quote_plus(signature_b64)}"
        f"&Key-Pair-Id={quote_plus(key_pair_id)}"
    )


def get_s3_client():
    return boto3.client(
        "s3",
        region_name=getattr(settings, "AWS_REGION_NAME", None),
        aws_access_key_id=getattr(settings, "AWS_ACCESS_KEY_ID", None),
        aws_secret_access_key=getattr(settings, "AWS_SECRET_ACCESS_KEY", None),
    )


def resolve_episode_s3_key(show_id: str, season: int, episode: int, bucket_name: str):
    clean_show_id = (show_id or "").replace("-", "")
    if not clean_show_id:
        return ""

    season_str = f"S{season:02d}"
    episode_str = f"E{episode:02d}"
    season_folder = f"{clean_show_id}/season{season}-mp4s/"
    preferred_prefix = f"{season_folder}{season_str}{episode_str}_{clean_show_id}_"
    fallback_prefix = f"{season_folder}{season_str}{episode_str}_"

    s3_client = get_s3_client()

    for prefix in (preferred_prefix, fallback_prefix):
        response = s3_client.list_objects_v2(
            Bucket=bucket_name,
            Prefix=prefix,
            MaxKeys=50,
        )
        contents = response.get("Contents", [])
        matches = [
            item["Key"]
            for item in contents
            if item.get("Key", "").lower().endswith(".mp4")
        ]
        if matches:
            return sorted(matches, key=lambda key: (len(key), key))[0]

    return ""

@api_view(['GET'])
def get_signed_url(request):
    key = request.query_params.get('key')
    if not key:
        return Response({'error': 'Missing key parameter'}, status=400)
    return Response({'url': build_signed_cloudfront_url(key)})


@api_view(['GET'])
def get_signed_episode_url(request):
    show_id = request.query_params.get('show_id')
    season_raw = request.query_params.get('season')
    episode_raw = request.query_params.get('episode')
    bucket_name = request.query_params.get('bucket') or "all-shows"

    if not show_id or season_raw is None or episode_raw is None:
        return Response(
            {'error': 'show_id, season, and episode are required'},
            status=400,
        )

    try:
        season = int(season_raw)
        episode = int(episode_raw)
    except (TypeError, ValueError):
        return Response({'error': 'season and episode must be integers'}, status=400)

    try:
        key = resolve_episode_s3_key(show_id, season, episode, bucket_name)
    except Exception as exc:
        return Response(
            {'error': f'Failed to resolve episode key: {exc}'},
            status=500,
        )

    if not key:
        return Response({'error': 'Episode media not found'}, status=404)

    return Response({'url': build_signed_cloudfront_url(key), 'key': key})


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


@api_view(["GET", "POST", "DELETE"])
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

    if request.method == "DELETE":
        deleted_count, _ = WatchHistory.objects.filter(
            profile=profile,
            show_id=show_id,
        ).delete()
        return Response({"deleted": deleted_count > 0}, status=status.HTTP_200_OK)

    obj, _ = WatchHistory.objects.update_or_create(
        profile=profile,
        show_id=show_id,
        defaults={
            "season": season if season is not None else None,
            "episode": episode if episode is not None else None,
        },
    )
    return Response(WatchHistorySerializer(obj).data)
