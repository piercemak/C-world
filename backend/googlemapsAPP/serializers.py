from rest_framework import serializers
from .models import *


class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = ('id', 'club', 'name', 'zipcode', 'city', 'country', 'address', 'lat', 'lng', 'place_id')



class DistanceSerializer(serializers.ModelSerializer):
    from_location_name = serializers.CharField(source='from_location.name', read_only=True)
    to_location_name = serializers.CharField(source='to_location.name', read_only=True)

    class Meta:
        model = Distance
        fields = ['id', 'from_location', 'to_location', 'from_location_name', 'to_location_name', 'mode', 'distance_km', 'duration_mins', 'duration_traffic_mins']
        read_only_fields = ['distance_km', 'duration_mins', 'duration_traffic_mins']  
