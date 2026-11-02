import os
import json
from urllib.parse import urlencode
from urllib.request import urlopen
from django.core.cache import cache
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def request_search(request):
    query = str(request.query_params.get("q", "")).strip()[:150]
    if len(query) < 2:
        return Response({"results": []})
    key = os.getenv("TMDB_API_KEY", "")
    if not key:
        return Response({"error": "Title search is not configured yet."}, status=503)
    cache_key = "request-search:" + query.lower()
    saved = cache.get(cache_key)
    if saved is not None:
        return Response(saved)
    try:
        url = "https://api.themoviedb.org/3/search/multi?" + urlencode({"api_key": key, "query": query, "include_adult": "false"})
        with urlopen(url, timeout=8) as response:
            data = json.load(response)
        results = []
        for item in data.get("results", []):
            if item.get("media_type") not in ("movie", "tv"):
                continue
            results.append({"id": item["id"], "type": item["media_type"],
                "title": item.get("title") or item.get("name") or "Untitled",
                "year": (item.get("release_date") or item.get("first_air_date") or "")[:4],
                "poster": "https://image.tmdb.org/t/p/w342" + item["poster_path"] if item.get("poster_path") else None})
        result = {"results": results}
        cache.set(cache_key, result, 300)
        return Response(result)
    except Exception:
        return Response({"error": "Title search is temporarily unavailable. Please try again."}, status=502)
