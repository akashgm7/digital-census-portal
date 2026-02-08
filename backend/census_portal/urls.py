"""
URL configuration for census_portal project.
"""
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse


def health_check(request):
    """Health check endpoint"""
    return JsonResponse({'status': 'healthy', 'service': 'Digital Census Portal'})


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/health/', health_check, name='health_check'),
    path('api/v1/auth/', include('accounts.urls')),
    path('api/v1/users/', include('accounts.user_urls')),
    path('api/v1/surveys/', include('surveys.urls')),
    path('api/v1/addresses/', include('surveys.address_urls')),
    path('api/v1/analytics/', include('analytics.urls')),
]
