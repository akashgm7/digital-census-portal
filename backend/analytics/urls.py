"""
Analytics URL configuration.
"""
from django.urls import path
from .views import AdminDashboardView, SupervisorDashboardView, SurveyorDashboardView

urlpatterns = [
    path('admin/', AdminDashboardView.as_view(), name='admin_dashboard'),
    path('supervisor/', SupervisorDashboardView.as_view(), name='supervisor_dashboard'),
    path('surveyor/', SurveyorDashboardView.as_view(), name='surveyor_dashboard'),
]
