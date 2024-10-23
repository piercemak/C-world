from django import forms 
from django.forms import ModelForm
from .models import *


modes = (
    ('driving', 'driving'),
    ('walking', 'walking'),
    ('bicycling', 'bicycling'),
    ('transit', 'transit')
)


class DistanceForm(ModelForm):
    
    from_location = forms.ModelChoiceField(label='Location From', queryset=Location.objects.all())
    to_location = forms.ModelChoiceField(label='Location To', queryset=Location.objects.all())
    mode = forms.ChoiceField(choices=modes)


    class Meta:
        model = Distance
        exclude = ['created_at', 'edited_at', 'distance_km', 'duration_mins', 'duration_traffic_mins']
