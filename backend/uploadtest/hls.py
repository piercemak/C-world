"""Signed HLS manifests for movies and independently migrated episodes.

The media segments remain on CloudFront. The API only reads and rewrites the
small HLS manifests so each segment receives a short-lived CloudFront policy
URL without exposing the source MP4 or proxying video bytes through Django.
"""

import base64
import hashlib
import hmac
import json
import posixpath
from datetime import datetime, timezone
from urllib.parse import quote, urlencode
import os
import re
from botocore.exceptions import ClientError

from django.conf import settings
from django.http import HttpResponse
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .catalog import CatalogError, find_media, find_episode
from .views import get_s3_client, rsa_signer


HLS_TOKEN_TTL_SECONDS = 21600


def hls_media(media, season=None, episode=None, legacy=False):
    """Build an episode-scoped context; human-readable episode titles are metadata."""
    if media.get("type") != "movie":
        season, episode = int(season), int(episode)
        if season < 1 or episode < 1 or not find_episode(media, season, episode):
            raise ValueError("Episode not found")
    else:
        season = episode = None
    asset = str(media.get("assetId") or media["id"]).replace("-", "").lower()
    if not re.fullmatch(r"[a-z0-9_]+", asset):
        raise ValueError("Invalid media asset ID")
    prefix = f"hls/{asset}"
    if season is not None:
        prefix += f"/season-{season}/s{season:02d}e{episode:02d}"
    playback = {"type": "hls", "hlsPrefix": prefix, "master": "master.m3u8"}
    if legacy:
        playback = media.get("playback") or {}
        if season is not None or playback.get("type") != "hls":
            raise ValueError("Legacy HLS is not configured")
    return {**media, "playback": playback, "_season": season, "_episode": episode}


def resolve_hls_media(media, season=None, episode=None):
    context = hls_media(media, season, episode)
    try:
        get_s3_client().head_object(Bucket=os.getenv("AWS_MEDIA_BUCKET", "all-shows"),
                                   Key=_hls_key(context, "master.m3u8"))
        return context
    except ClientError as exc:
        if exc.response.get("Error", {}).get("Code") not in {"404", "NoSuchKey", "NotFound"}:
            raise
    if media.get("type") == "movie" and (media.get("playback") or {}).get("type") == "hls":
        return hls_media(media, legacy=True)
    return None


def _context_id(media):
    return f"{media['id']}:{_hls_prefix(media)}"


def _manifest_url(media, path, token):
    query = {"token": token, "layout": "canonical"}
    if media.get("_season") is not None:
        query.update(season=media["_season"], episode=media["_episode"])
    canonical = hls_media(media, media.get("_season"), media.get("_episode"))
    if _hls_prefix(canonical) != _hls_prefix(media):
        query["layout"] = "legacy"
    return f"{settings.CWORLD_PUBLIC_API_URL}/api/playback/hls/{media['id']}/{quote(path, safe='/')}?{urlencode(query)}"


def _hls_secret():
    return str(getattr(settings, "SECRET_KEY", "")).encode("utf-8")


def _hls_prefix(media):
    playback = media.get("playback") or {}
    prefix = playback.get("hlsPrefix") or f'{media.get("assetId")}/hls'
    return str(prefix).strip("/")


def _hls_key(media, manifest_path):
    prefix = _hls_prefix(media)
    clean_path = str(manifest_path or "master.m3u8").lstrip("/")
    if ".." in clean_path.split("/"):
        raise ValueError("Invalid HLS manifest path")
    return f"{prefix}/{clean_path}"


def _make_token(media_id, expires):
    payload = f"{media_id}:{int(expires)}"
    signature = hmac.new(_hls_secret(), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{int(expires)}.{signature}"


def _verify_token(media_id, token):
    try:
        expires_raw, signature = str(token or "").split(".", 1)
        expires = int(expires_raw)
    except (TypeError, ValueError):
        return False
    if expires <= int(datetime.now(timezone.utc).timestamp()):
        return False
    expected = _make_token(media_id, expires).split(".", 1)[1]
    return hmac.compare_digest(signature, expected)


def _cloudfront_policy_query(resource_path, expires):
    resource_url = f"https://{settings.CLOUDFRONT_DOMAIN}/{resource_path.lstrip('/')}"
    policy = {
        "Statement": [{
            "Resource": resource_url,
            "Condition": {"DateLessThan": {"AWS:EpochTime": int(expires)}},
        }],
    }
    policy_json = json.dumps(policy, separators=(",", ":"))
    signature = rsa_signer(policy_json)
    return urlencode({
        "Policy": base64.b64encode(policy_json.encode()).decode().translate(str.maketrans("+/=", "-~_")),
        "Signature": base64.b64encode(signature).decode().translate(str.maketrans("+/=", "-~_")),
        "Key-Pair-Id": settings.CLOUDFRONT_KEY_PAIR_ID,
    })


def _cloudfront_url(key, resource_path, expires):
    query = _cloudfront_policy_query(resource_path, expires)
    return f"https://{settings.CLOUDFRONT_DOMAIN}/{key.lstrip('/')}?{query}"


def build_hls_playback_payload(media):
    playback = media.get("playback") or {}
    ttl = max(300, int(playback.get("ttlSeconds") or HLS_TOKEN_TTL_SECONDS))
    expires = int(datetime.now(timezone.utc).timestamp()) + ttl
    token = _make_token(_context_id(media), expires)
    manifest = str(playback.get("master") or "master.m3u8").lstrip("/")
    url = _manifest_url(media, manifest, token)
    return {
        "mediaId": media["id"],
        "season": media.get("_season"),
        "episode": media.get("_episode"),
        "url": url,
        "playbackType": "hls",
        "expiresAt": datetime.fromtimestamp(expires, timezone.utc).isoformat().replace("+00:00", "Z"),
    }


def _rewrite_uri(uri, media, manifest_path, token, expires, policy_queries=None):
    raw = str(uri or "").strip()
    if not raw or raw.startswith("#") or raw.startswith("data:"):
        return raw
    if raw.startswith("http://") or raw.startswith("https://"):
        return raw

    current_dir = posixpath.dirname(str(manifest_path or ""))
    resolved = posixpath.normpath(posixpath.join(current_dir, raw))
    key = _hls_key(media, resolved)
    if resolved.lower().endswith(".m3u8"):
        return _manifest_url(media, resolved, token)
    resource_path = f"{_hls_prefix(media)}/*"
    if policy_queries is not None:
        # Every segment in this playlist shares the same package-scoped policy.
        # Loading the RSA key and signing for every segment can time out long VODs.
        if resource_path not in policy_queries:
            policy_queries[resource_path] = _cloudfront_policy_query(resource_path, expires)
        return f"https://{settings.CLOUDFRONT_DOMAIN}/{key.lstrip('/')}?{policy_queries[resource_path]}"
    return _cloudfront_url(key, resource_path, expires)


def _rewrite_manifest(text, media, manifest_path, token, expires):
    lines = []
    policy_queries = {}
    for line in str(text).splitlines():
        stripped = line.strip()
        if stripped.startswith("#") and 'URI="' in line:
            line = re.sub(r'URI="([^"]+)"', lambda match: 'URI="' + _rewrite_uri(match.group(1), media, manifest_path, token, expires, policy_queries) + '"', line)
        elif stripped and not stripped.startswith("#"):
            indent = line[: len(line) - len(line.lstrip())]
            line = f"{indent}{_rewrite_uri(stripped, media, manifest_path, token, expires, policy_queries)}"
        lines.append(line)
    return "\n".join(lines) + "\n"


@api_view(["POST"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def hls_playback_session(request):
    media_id = str(request.data.get("mediaId", request.data.get("media_id")) or "").strip()
    if not media_id:
        return Response({"error": "mediaId is required"}, status=status.HTTP_400_BAD_REQUEST)
    try:
        media = find_media(media_id)
    except CatalogError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    if not media:
        return Response({"error": "Media was not found"}, status=status.HTTP_404_NOT_FOUND)
    try:
        context = resolve_hls_media(media, request.data.get("season"), request.data.get("episode"))
        if not context:
            return Response({"error": "HLS has not been uploaded"}, status=status.HTTP_404_NOT_FOUND)
        return Response(build_hls_playback_payload(context))
    except (ValueError, TypeError):
        return Response({"error": "Invalid episode"}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@permission_classes([AllowAny])
def hls_manifest(request, media_id, manifest_path):
    token = request.query_params.get("token")
    try:
        media = find_media(media_id)
        if not media:
            return Response({"error": "HLS media was not found"}, status=status.HTTP_404_NOT_FOUND)
        layout = request.query_params.get("layout", "legacy")
        media = hls_media(media, request.query_params.get("season"), request.query_params.get("episode"), legacy=layout == "legacy")
        valid = _verify_token(_context_id(media), token)
        # Existing movie-pilot sessions remain valid during deployment.
        if not request.query_params.get("layout") and media.get("type") == "movie":
            valid = valid or _verify_token(media_id, token)
        if not valid:
            return Response({"error": "HLS session is missing or expired"}, status=status.HTTP_403_FORBIDDEN)
        token = _make_token(_context_id(media), int(str(token).split(".", 1)[0]))
        key = _hls_key(media, manifest_path)
        body = get_s3_client().get_object(
            Bucket=os.getenv("AWS_MEDIA_BUCKET", "all-shows"),
            Key=key,
        )["Body"].read().decode("utf-8")
        expires = int(str(token).split(".", 1)[0])
        rewritten = _rewrite_manifest(body, media, manifest_path, token, expires)
    except (ValueError, TypeError):
        return Response({"error": "Invalid HLS path or episode"}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as exc:
        return Response({"error": f"HLS manifest unavailable: {exc}"}, status=status.HTTP_502_BAD_GATEWAY)

    response = HttpResponse(rewritten, content_type="application/vnd.apple.mpegurl")
    response["Cache-Control"] = "private, no-store"
    return response
