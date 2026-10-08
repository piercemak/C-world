import os
from datetime import datetime, timedelta, timezone

from rest_framework import status
from .authentication import ExpiringTokenAuthentication
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .catalog import CatalogError, find_episode, find_media, load_catalog
from .hls import build_hls_playback_payload, resolve_hls_media
from .views import build_signed_cloudfront_url, resolve_episode_s3_key
from .availability import season_availability


def _catalog_envelope(catalog, items):
    return {
        "schemaVersion": catalog["schemaVersion"],
        "catalogRevision": catalog.get("catalogRevision", ""),
        "generatedAt": catalog.get("generatedAt", ""),
        "items": items,
    }


@api_view(["GET"])
def catalog_v1(request):
    try:
        catalog = load_catalog()
    except CatalogError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    response = Response(_catalog_envelope(catalog, catalog.get("items", [])))
    response["Cache-Control"] = "public, max-age=60, stale-while-revalidate=300"
    response["ETag"] = f'"{catalog.get("catalogRevision", "1")}"'
    return response


@api_view(["GET"])
def catalog_media_v1(request, media_id):
    try:
        catalog = load_catalog()
        media = find_media(media_id)
    except CatalogError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    if not media:
        return Response({"error": "Media not found"}, status=status.HTTP_404_NOT_FOUND)

    response = Response(_catalog_envelope(catalog, [media]))
    response["Cache-Control"] = "public, max-age=60, stale-while-revalidate=300"
    response["ETag"] = f'"{catalog.get("catalogRevision", "1")}-{media_id}"'
    return response


def _positive_int(value, field):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field} must be a positive integer") from None
    if parsed < 1:
        raise ValueError(f"{field} must be a positive integer")
    return parsed


@api_view(["GET"])
def episode_availability(request, media_id):
    try:
        media = find_media(media_id)
        if not media:
            media = next((item for item in load_catalog()["items"]
                          if item["id"].replace("-", "") == media_id.replace("-", "")), None)
        number = _positive_int(request.query_params.get("season"), "season")
        season = next((s for s in (media or {}).get("seasons", []) if s["number"] == number), None)
        if not season:
            return Response({"error": "Season not found"}, status=404)
        response = Response(season_availability(media, season))
        response["Cache-Control"] = "no-store"
        return response
    except ValueError as exc:
        return Response({"error": str(exc)}, status=400)
    except Exception:
        return Response({"error": "Availability could not be checked. Please try again."}, status=503)


@api_view(["POST"])
@authentication_classes([ExpiringTokenAuthentication])
@permission_classes([IsAuthenticated])
def playback_session(request):
    media_id = request.data.get("mediaId", request.data.get("media_id"))
    if not media_id:
        return Response({"error": "mediaId is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        media = find_media(media_id)
    except CatalogError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    if not media:
        return Response({"error": "Media not found"}, status=status.HTTP_404_NOT_FOUND)

    try:
        if media.get("type") == "movie":
            season = None
            episode = None
            object_key = f'{media["assetId"]}/{media["assetId"]}.mp4'
        else:
            season = _positive_int(request.data.get("season"), "season")
            episode = _positive_int(request.data.get("episode"), "episode")
            if not find_episode(media, season, episode):
                return Response({"error": "Episode not found"}, status=status.HTTP_404_NOT_FOUND)
        hls = resolve_hls_media(media, season, episode)
        if hls:
            return Response(build_hls_playback_payload(hls))
        if media.get("type") != "movie":
            object_key = resolve_episode_s3_key(
                media["id"],
                season,
                episode,
                os.getenv("AWS_MEDIA_BUCKET", "all-shows"),
            )
    except ValueError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as exc:
        return Response({"error": f"Playback lookup failed: {exc}"}, status=status.HTTP_502_BAD_GATEWAY)

    if not object_key:
        return Response({"error": "Media object not found"}, status=status.HTTP_404_NOT_FOUND)

    try:
        signed_url = build_signed_cloudfront_url(object_key)
    except Exception as exc:
        return Response({"error": f"Playback signing failed: {exc}"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    ttl_seconds = int(os.getenv("SIGNED_URL_TTL_SECONDS", "21600"))
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=ttl_seconds)
    return Response({
        "mediaId": media["id"],
        "season": season,
        "episode": episode,
        "url": signed_url,
        "expiresAt": expires_at.isoformat().replace("+00:00", "Z"),
    })
