import json
from pathlib import Path

from django.conf import settings


class CatalogError(Exception):
    """Raised when the published CWorld catalog cannot be loaded."""


_catalog_cache = {"path": None, "mtime_ns": None, "data": None}


def catalog_path():
    return Path(settings.CWORLD_CATALOG_PATH)


def reset_catalog_cache():
    _catalog_cache.update(path=None, mtime_ns=None, data=None)


def load_catalog():
    path = catalog_path()
    if not path.exists():
        raise CatalogError(f"CWorld catalog was not found at {path}.")

    try:
        mtime_ns = path.stat().st_mtime_ns
    except OSError as exc:
        raise CatalogError(f"CWorld catalog could not be inspected: {exc}") from exc

    if (
        _catalog_cache["path"] == path
        and _catalog_cache["mtime_ns"] == mtime_ns
        and _catalog_cache["data"] is not None
    ):
        return _catalog_cache["data"]

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise CatalogError(f"CWorld catalog could not be read: {exc}") from exc

    if not isinstance(data, dict) or data.get("schemaVersion") != 1:
        raise CatalogError("CWorld catalog is missing supported schemaVersion 1.")
    if not isinstance(data.get("items"), list):
        raise CatalogError("CWorld catalog must contain an items array.")

    _catalog_cache.update(path=path, mtime_ns=mtime_ns, data=data)
    return data


def find_media(media_id):
    requested_id = str(media_id or "").strip()
    if not requested_id:
        return None

    return next(
        (item for item in load_catalog().get("items", []) if item.get("id") == requested_id),
        None,
    )


def find_episode(media, season, episode):
    if not media or media.get("type") != "show":
        return None

    for season_item in media.get("seasons", []):
        if season_item.get("number") != season:
            continue
        return next(
            (item for item in season_item.get("episodes", []) if item.get("number") == episode),
            None,
        )
    return None
