"""
User management URL configuration.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .user_views import UserViewSet, ZoneViewSet

router = DefaultRouter()
# IMPORTANT: Register zones BEFORE users (empty string catches all otherwise)
router.register(r'zones', ZoneViewSet, basename='zone')
router.register(r'', UserViewSet, basename='user')

urlpatterns = [
    path('', include(router.urls)),
]
