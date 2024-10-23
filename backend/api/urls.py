from django.urls import path
from .views import *
from rest_framework.routers import DefaultRouter
from googlemapsAPP.views import *


router = DefaultRouter()
router.register('project', ProjectViewset, basename='project')
router.register('projectmanager', ProjectManagerViewset, basename='projectmanager')
router.register('locations', LocationsViewset, basename='locations')
router.register('geocoder', GeocodingViewset, basename='geocoder')
router.register('distance', DistanceView, basename='distance')
urlpatterns = router.urls



