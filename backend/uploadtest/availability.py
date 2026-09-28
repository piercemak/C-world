"""Read-only, short-lived availability checks. Metadata never renumbers gaps."""
import os
import re
import hashlib
from concurrent.futures import ThreadPoolExecutor

from botocore.exceptions import ClientError
from django.core.cache import cache

from .hls import hls_media
from .views import get_s3_client


def season_availability(media, season):
    bucket = os.getenv("AWS_MEDIA_BUCKET", "all-shows")
    numbers = [int(ep["number"]) for ep in season["episodes"]]
    identity = f"{bucket}:{media['id']}:{media.get('assetId')}:{season['number']}:{numbers}"
    key = "availability:v1:" + hashlib.sha256(identity.encode()).hexdigest()
    cached = cache.get(key)
    if cached is not None:
        return cached
    client = get_s3_client()
    clean_id = media["id"].replace("-", "")
    prefix = f"{clean_id}/season{season['number']}-mp4s/"
    found = set()
    for page in client.get_paginator("list_objects_v2").paginate(Bucket=bucket, Prefix=prefix):
        for obj in page.get("Contents", []):
            name = obj["Key"][len(prefix):]
            match = re.match(r"S(\d+)E(\d+)_.*\.[mM][pP]4$", name)
            if match and name.startswith(f"S{season['number']:02d}E{int(match[2]):02d}_") and obj.get("Size", 0) > 0:
                found.add(int(match[2]))

    def check(number):
        if number in found:
            return str(number), True
        context = hls_media(media, season["number"], number)
        try:
            result = client.head_object(Bucket=bucket, Key=f"{context['playback']['hlsPrefix']}/master.m3u8")
            return str(number), result.get("ContentLength", 0) > 0
        except ClientError as exc:
            if exc.response.get("Error", {}).get("Code") in {"404", "NoSuchKey", "NotFound"}:
                return str(number), False
            raise

    with ThreadPoolExecutor(max_workers=8) as pool:
        result = {"mediaId": media["id"], "season": season["number"], "episodes": dict(pool.map(check, numbers))}
    cache.set(key, result, 60)
    return result
