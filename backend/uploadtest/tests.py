import json
from pathlib import Path
from unittest.mock import patch
from botocore.exceptions import ClientError
from io import BytesIO
from urllib.parse import urlsplit, parse_qs, urlencode

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
        self.hls_s3 = patch("uploadtest.hls.get_s3_client").start().return_value
        self.addCleanup(patch.stopall)
        self.hls_s3.head_object.side_effect = ClientError({"Error": {"Code": "404"}}, "HeadObject")

    def test_episode_hls_discovery_and_manifest_signing(self):
        self.hls_s3.head_object.side_effect = None
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")
        response = self.client.post("/api/playback/session/", {"mediaId": "test-show", "season": 1, "episode": 1}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["playbackType"], "hls")
        self.assertEqual((response.data["season"], response.data["episode"]), (1, 1))
        self.assertEqual(self.hls_s3.head_object.call_args.kwargs["Key"], "hls/testshow/season-1/s01e01/master.m3u8")
        url = urlsplit(response.data["url"])
        self.hls_s3.get_object.return_value = {"Body": BytesIO(b'#EXTM3U\n#EXT-X-MAP:URI="init.mp4"\nseg_00001.m4s\n')}
        with override_settings(CLOUDFRONT_DOMAIN="cdn.example.com", CLOUDFRONT_KEY_PAIR_ID="test"), patch("uploadtest.hls.rsa_signer", return_value=b"signature"):
            manifest = self.client.get(url.path + "?" + url.query)
        self.assertEqual(manifest.status_code, 200)
        text = manifest.content.decode()
        self.assertIn("hls/testshow/season-1/s01e01/init.mp4?Policy=", text)
        self.assertIn("hls/testshow/season-1/s01e01/seg_00001.m4s?Policy=", text)
        self.assertEqual(self.hls_s3.get_object.call_args.kwargs["Key"], "hls/testshow/season-1/s01e01/master.m3u8")

    def test_hls_token_cannot_be_reused_for_another_episode(self):
        from .hls import hls_media, build_hls_playback_payload
        media = json.loads(json.dumps(CATALOG["items"][0]))
        media["seasons"][0]["episodes"].append({"number": 2})
        url = urlsplit(build_hls_playback_payload(hls_media(media, 1, 1))["url"])
        query = {key: values[0] for key, values in parse_qs(url.query).items()}
        query["episode"] = "2"
        with patch("uploadtest.hls.find_media", return_value=media):
            response = self.client.get(url.path + "?" + urlencode(query))
        self.assertEqual(response.status_code, 403)
        self.hls_s3.get_object.assert_not_called()

    def test_child_playlists_keep_episode_context_and_block_traversal(self):
        from .hls import hls_media, _rewrite_manifest, _make_token, _hls_key
        media = hls_media(CATALOG["items"][0], 1, 1)
        token = _make_token("test-show:hls/testshow/season-1/s01e01", 9999999999)
        rewritten = _rewrite_manifest('#EXTM3U\n#EXT-X-MEDIA:TYPE=AUDIO,URI="audio/aac/index.m3u8"\nvideo/index.m3u8\n', media, "master.m3u8", token, 9999999999)
        self.assertIn("audio/aac/index.m3u8?token=", rewritten)
        self.assertIn("video/index.m3u8?token=", rewritten)
        self.assertEqual(rewritten.count("season=1&episode=1"), 2)
        with self.assertRaises(ValueError):
            _hls_key(media, "../s01e02/master.m3u8")

    def test_existing_movie_pilot_is_preserved(self):
        from .hls import resolve_hls_media, build_hls_playback_payload
        media = {**CATALOG["items"][1], "playback": {"type": "hls", "hlsPrefix": "testmovie/hls"}}
        context = resolve_hls_media(media)
        self.assertEqual(context["playback"]["hlsPrefix"], "testmovie/hls")
        self.assertIn("layout=legacy", build_hls_playback_payload(context)["url"])

    def test_movie_hls_discovery(self):
        self.hls_s3.head_object.side_effect = None
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")
        response = self.client.post("/api/playback/session/", {"mediaId": "test-movie"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["playbackType"], "hls")
        self.assertEqual(self.hls_s3.head_object.call_args.kwargs["Key"], "hls/testmovie/master.m3u8")

    def test_hls_permission_error_is_not_treated_as_missing(self):
        self.hls_s3.head_object.side_effect = ClientError({"Error": {"Code": "403"}}, "HeadObject")
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")
        response = self.client.post("/api/playback/session/", {"mediaId": "test-movie"}, format="json")
        self.assertEqual(response.status_code, 502)

    def test_browser_episode_endpoint_uses_same_hls_convention(self):
        self.hls_s3.head_object.side_effect = None
        response = self.client.get("/api/signed-episode-url/", {"show_id": "testshow", "season": 1, "episode": 1})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["playbackType"], "hls")

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
        self.assertEqual(pending.status_code, 200)
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
