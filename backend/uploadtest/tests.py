import json
from pathlib import Path
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from .catalog import reset_catalog_cache


CATALOG = {
    "schemaVersion": 1,
    "catalogRevision": "test-revision",
    "generatedAt": "2026-09-08T00:00:00Z",
    "items": [
        {
            "id": "test-show",
            "assetId": "testshow",
            "type": "show",
            "title": "Test Show",
            "description": "A test show.",
            "artwork": {"card": "https://example.com/card.jpg", "poster": "https://example.com/poster.jpg", "backdrop": "https://example.com/backdrop.jpg"},
            "metadata": {"creator": "", "rating": "", "year": "", "genres": [], "duration": "22m", "ageRating": ""},
            "subtitles": False,
            "seasons": [{
                "number": 1,
                "episodes": [{
                    "number": 1,
                    "title": "Pilot",
                    "description": "The test episode.",
                    "airDate": "",
                    "duration": "22m",
                    "playbackRef": {"mediaId": "test-show", "season": 1, "episode": 1},
                    "subtitles": [],
                }],
            }],
        },
        {
            "id": "test-movie",
            "assetId": "testmovie",
            "type": "movie",
            "title": "Test Movie",
            "description": "A test movie.",
            "artwork": {"card": "https://example.com/card.jpg", "poster": "https://example.com/poster.jpg", "backdrop": "https://example.com/backdrop.jpg"},
            "metadata": {"creator": "", "rating": "", "year": "", "genres": [], "duration": "1h", "ageRating": ""},
            "subtitles": False,
            "movieAsset": {"mediaId": "test-movie", "season": None, "episode": None},
        },
    ],
}


@override_settings(CWORLD_CATALOG_PATH="/tmp/cworld-test-catalog.json")
class CatalogApiTests(TestCase):
    def setUp(self):
        self.catalog_path = Path("/tmp/cworld-test-catalog.json")
        self.catalog_path.write_text(json.dumps(CATALOG), encoding="utf-8")
        reset_catalog_cache()
        self.user = User.objects.create_user(username="catalog-user", password="password123")
        self.token = Token.objects.create(user=self.user)
        self.client = APIClient()

    def tearDown(self):
        self.catalog_path.unlink(missing_ok=True)
        reset_catalog_cache()

    def test_catalog_list_and_detail(self):
        response = self.client.get("/api/catalog/v1/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["items"]), 2)
        detail = self.client.get("/api/catalog/v1/media/test-show/")
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.data["items"][0]["seasons"][0]["episodes"][0]["title"], "Pilot")

    def test_playback_requires_authentication(self):
        response = self.client.post("/api/playback/session/", {"mediaId": "test-show", "season": 1, "episode": 1}, format="json")
        self.assertEqual(response.status_code, 401)

    @patch("uploadtest.catalog_views.resolve_episode_s3_key", return_value="testshow/season1-mp4s/S01E01_testshow_Pilot.mp4")
    @patch("uploadtest.catalog_views.build_signed_cloudfront_url", return_value="https://cdn.example.com/signed")
    def test_playback_returns_signed_reference(self, _sign, _resolve):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")
        response = self.client.post("/api/playback/session/", {"mediaId": "test-show", "season": 1, "episode": 1}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["url"], "https://cdn.example.com/signed")
        self.assertEqual(response.data["mediaId"], "test-show")

    @patch("uploadtest.catalog_views.build_signed_cloudfront_url", return_value="https://cdn.example.com/movie")
    def test_movie_playback_uses_asset_id(self, sign):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")
        response = self.client.post("/api/playback/session/", {"mediaId": "test-movie"}, format="json")
        self.assertEqual(response.status_code, 200)
        sign.assert_called_once_with("testmovie/testmovie.mp4")

    def test_device_login_requires_approval_and_is_one_time(self):
        start = self.client.post("/api/auth/device/start/", {}, format="json")
        self.assertEqual(start.status_code, 200)
        self.assertTrue(start.data["pollToken"])
        self.assertRegex(start.data["deviceCode"], r"^[A-Z2-9]{4}-[A-Z2-9]{4}$")

        pending = self.client.post(
            "/api/auth/device/poll/",
            {"pollToken": start.data["pollToken"]},
            format="json",
        )
        self.assertEqual(pending.status_code, 202)
        self.assertEqual(pending.data["status"], "pending")

        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")
        approved = self.client.post(
            "/api/auth/device/approve/",
            {"deviceCode": start.data["deviceCode"].lower()},
            format="json",
        )
        self.assertEqual(approved.status_code, 200)

        completed = self.client.post(
            "/api/auth/device/poll/",
            {"pollToken": start.data["pollToken"]},
            format="json",
        )
        self.assertEqual(completed.status_code, 200)
        self.assertEqual(completed.data["status"], "approved")
        self.assertEqual(completed.data["token"], self.token.key)
        self.assertEqual(completed.data["user"]["username"], "catalog-user")

        consumed = self.client.post(
            "/api/auth/device/poll/",
            {"pollToken": start.data["pollToken"]},
            format="json",
        )
        self.assertEqual(consumed.status_code, 410)

    def test_device_login_qr_returns_png(self):
        start = self.client.post("/api/auth/device/start/", {}, format="json")
        response = self.client.get(
            "/api/auth/device/qr/",
            {"code": start.data["deviceCode"]},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "image/png")
        self.assertTrue(response.content.startswith(b"\x89PNG"))

# Create your tests here.
