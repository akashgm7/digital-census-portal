"""
Address URL configuration.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .address_views import MasterAddressViewSet

router = DefaultRouter()
router.register(r'', MasterAddressViewSet, basename='address')

urlpatterns = [
    path('', include(router.urls)),
]
