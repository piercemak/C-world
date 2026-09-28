from copy import deepcopy
from unittest.mock import MagicMock, patch

from botocore.exceptions import ClientError
from django.core.cache import cache
from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory

from .availability import season_availability
from .catalog_views import episode_availability


class AvailabilityTests(SimpleTestCase):
    def setUp(self):
        cache.clear()
        self.media = {"id": "test-show", "assetId": "testshow", "type": "show",
                      "seasons": [{"number": 11, "episodes": [{"number": n} for n in [1, 2, 5, 6]]}]}
        self.season = self.media["seasons"][0]
        self.client = MagicMock()
        self.client.get_paginator.return_value.paginate.return_value = [
            {"Contents": [{"Key": "testshow/season11-mp4s/S11E01_testshow_one.mp4", "Size": 42}]},
            {"Contents": [{"Key": "testshow/season11-mp4s/S11E05_testshow_five.MP4", "Size": 42},
                          {"Key": "testshow/season11-mp4s/S11E02_cover.png", "Size": 42}]},
        ]
        self.client.head_object.side_effect = self.head
        self.patcher = patch("uploadtest.availability.get_s3_client", return_value=self.client)
        self.patcher.start()
        self.addCleanup(self.patcher.stop)
        self.addCleanup(cache.clear)

    def head(self, **kwargs):
        if kwargs["Key"].endswith("s11e06/master.m3u8"):
            return {"ContentLength": 405}
        raise ClientError({"Error": {"Code": "404"}}, "HeadObject")

    def test_mixed_hls_mp4_and_gaps_preserve_numbers(self):
        original = deepcopy(self.media)
        result = season_availability(self.media, self.season)
        self.assertEqual(result["episodes"], {"1": True, "2": False, "5": True, "6": True})
        self.assertEqual(self.media, original)
        self.assertEqual(self.client.head_object.call_count, 2)

    def test_cached_then_later_upload_detected(self):
        season_availability(self.media, self.season)
        self.client.head_object.reset_mock(side_effect=True)
        self.client.head_object.return_value = {"ContentLength": 405}
        self.assertFalse(season_availability(self.media, self.season)["episodes"]["2"])
        self.client.head_object.assert_not_called()
        cache.clear()
        self.assertTrue(season_availability(self.media, self.season)["episodes"]["2"])

    def test_access_denied_is_not_cached_as_missing(self):
        self.client.head_object.side_effect = ClientError({"Error": {"Code": "AccessDenied"}}, "HeadObject")
        with self.assertRaises(ClientError):
            season_availability(self.media, self.season)
        self.client.head_object.side_effect = self.head
        self.assertTrue(season_availability(self.media, self.season)["episodes"]["6"])

    def test_partial_hls_without_master_is_missing(self):
        self.client.head_object.side_effect = None
        self.client.head_object.return_value = {"ContentLength": 0}
        self.assertFalse(season_availability(self.media, self.season)["episodes"]["6"])

    @patch("uploadtest.catalog_views.find_media")
    def test_endpoint(self, find):
        find.return_value = self.media
        request = APIRequestFactory().get("/availability/?season=11")
        result = episode_availability(request, "test-show")
        self.assertEqual(result.status_code, 200)
        self.assertFalse(result.data["episodes"]["2"])
        self.assertEqual(result["Cache-Control"], "no-store")
        bad = episode_availability(APIRequestFactory().get("/availability/?season=no"), "test-show")
        self.assertEqual(bad.status_code, 400)
        missing = episode_availability(APIRequestFactory().get("/availability/?season=12"), "test-show")
        self.assertEqual(missing.status_code, 404)

    @patch("uploadtest.catalog_views.find_media")
    def test_endpoint_failure_is_unknown(self, find):
        find.return_value = self.media
        self.client.head_object.side_effect = RuntimeError("network unavailable")
        result = episode_availability(APIRequestFactory().get("/availability/?season=11"), "test-show")
        self.assertEqual(result.status_code, 503)
        self.assertNotIn("episodes", result.data)
