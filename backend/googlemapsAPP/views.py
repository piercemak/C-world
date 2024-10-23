from rest_framework.response import Response
from rest_framework import viewsets, permissions, status
from django.views import View
from .models import *
from .serializers import *
import googlemaps as gmaps_client
from django.shortcuts import render, redirect
from django.conf import settings    #Need the API key from Google 
from rest_framework.decorators import action
import logging
from .forms import *
from datetime import datetime
from django.shortcuts import get_object_or_404
from django.core.exceptions import ValidationError
from django.core.exceptions import MultipleObjectsReturned
from rest_framework.pagination import PageNumberPagination




logger = logging.getLogger(__name__) 



class LocationsViewset(viewsets.ViewSet):
    permission_classes = [permissions.AllowAny]
    queryset = Location.objects.all()
    serializer_class = LocationSerializer 

    def list(self, request):
        queryset = Location.objects.all()
        serializer = self.serializer_class(queryset, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        location = self.queryset.get(pk=pk)
        serializer = self.serializer_class(location)
        return Response(serializer.data)
    

    def destroy(self, request, pk=None):
        try:
            location_instance = get_object_or_404(Location, pk=pk)
            location_instance.delete()
            return Response({"message": "Location record deleted successfully"}, status=status.HTTP_204_NO_CONTENT)
        
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": "Something went wrong: " + str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    



class DistanceView(viewsets.ModelViewSet):
    queryset = Distance.objects.all()
    serializer_class = DistanceSerializer
    permission_classes = [permissions.AllowAny]


    def retrieve(self, request, pk=None):
        #form = DistanceForm
        distances = Distance.objects.all()

        try:
            instance = self.queryset.get(pk=pk)  # Ensure you get a single instance
        except Distance.DoesNotExist:
            return Response({'error': 'Distance not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = self.serializer_class(instance)  # Pass a single instance, not a queryset
        return Response(serializer.data)
    

    def create(self, request, pk=None):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            try:
                # Extract IDs directly using integer conversion to avoid type issues
                from_location_id = int(request.data['from_location'])
                to_location_id = int(request.data['to_location'])

                # Retrieve the actual Location objects based on the IDs
                from_location_info = Location.objects.get(pk=from_location_id)
                to_location_info = Location.objects.get(pk=to_location_id)
            except ValueError:
                # Handle the case where conversion to integer fails
                return Response({'error': 'Invalid location IDs provided. They must be integers.'}, status=status.HTTP_400_BAD_REQUEST)
            except Location.DoesNotExist:
                # Handle the case where one or both locations do not exist
                return Response({'error': 'One or both locations not found.'}, status=status.HTTP_404_NOT_FOUND)
            except MultipleObjectsReturned:
                # Handle the case where the query returns multiple objects for a given ID
                return Response({'error': 'More than one location found for the given identifier.'}, status=status.HTTP_400_BAD_REQUEST)

            mode = serializer.validated_data['mode']
            gmaps = gmaps_client.Client(key=settings.GOOGLE_API_KEY)

            # Generate the address strings
            from_address = f"{from_location_info.address}, {from_location_info.zipcode}, {from_location_info.city}, {from_location_info.country}"
            to_address = f"{to_location_info.address}, {to_location_info.zipcode}, {to_location_info.city}, {to_location_info.country}"

            calculate = gmaps.distance_matrix(from_address, to_address, mode=mode, departure_time=datetime.now())
            print(calculate)

            # Check the top-level status of the API response
            if calculate['status'] != 'OK':
                return Response({'error': 'Google Maps API error: ' + calculate['status']}, status=status.HTTP_400_BAD_REQUEST)

            elements = calculate['rows'][0]['elements'][0]
            if elements['status'] == 'ZERO_RESULTS':
                error_message = f"No route could be found between {from_location_info.name} and {to_location_info.name}."
                return Response({'error': error_message}, status=status.HTTP_400_BAD_REQUEST)

            if 'duration' in elements:
                duration_seconds = elements['duration']['value']
                distance_meters = elements['distance']['value']
                duration_minutes = duration_seconds / 60
                distance_kilometers = distance_meters / 1000

                if 'duration_in_traffic' in elements:
                    duration_in_traffic_seconds = elements['duration_in_traffic']['value']
                    duration_in_traffic_minutes = duration_in_traffic_seconds / 60
                else:
                    duration_in_traffic_minutes = None

                obj = Distance(
                    from_location=from_location_info,
                    to_location=to_location_info,
                    mode=mode,
                    distance_km=distance_kilometers,
                    duration_mins=duration_minutes,
                    duration_traffic_mins=duration_in_traffic_minutes
                )
                obj.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            else:
                return Response({'error': 'No duration data found in response.'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



    def destroy(self, request, pk=None):
        try:
            distance_instance = get_object_or_404(Distance, pk=pk)
            distance_instance.delete()
            return Response({"message": "Distance record deleted successfully"}, status=status.HTTP_204_NO_CONTENT)
        
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": "Something went wrong: " + str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)






class GeocodingViewset(viewsets.ModelViewSet):
    permission_classes = [permissions.AllowAny]
    queryset = Location.objects.all()
    serializer_class = LocationSerializer

    def retrieve(self, request, pk=None):
        location = Location.objects.get(pk=pk)

        if location.lat and location.lng and location.place_id != None:
            lat = location.lat
            lng = location.lng
            place_id = location.place_id
            label = "from my database"


        elif location.address and location.country and location.zipcode and location.city != None:
            addystring = str(location.address)+", "+str(location.zipcode)+", "+str(location.country)+", "+str(location.city)

            gmaps = gmaps_client.Client(key = settings.GOOGLE_API_KEY)
            result = gmaps.geocode(addystring)[0]
            lat = result.get('geometry', {}).get('location', {}).get('lat', None)
            lng = result.get('geometry', {}).get('location', {}).get('lng', None)            
            place_id = result.get('place_id', {})
            label = "from my api call"
            
            location.lat = lat
            location.lng = lng
            location.place_id = place_id
            location.save()
            serializer = self.serializer_class(location)
            return Response(serializer.data)


        else:
            result = ""
            lat = ""
            lng = ""
            place_id = ""
            label = "no call made"

        context = {
            'location':location,
            'lat':lat,
            'lng':lng,
            'place_id':place_id,
            'label':label

        }

        
  

class MapView(View):

    def retrieve(self, request, pk=None):
        eligible_locations = Location.objects.filter(place_id__isnull=False)
        locs = []

        for i in eligible_locations:
            data = {
                'lat': float(i.lat),
                'lng': float(i.lng),
                'name': i.name, 
            }

            locs.append(data)