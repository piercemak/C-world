from django.contrib import admin
from .models import *
from googlemapsAPP.models import *

admin.site.register(Project)
admin.site.register(ProjectManager)
admin.site.register(Location)
