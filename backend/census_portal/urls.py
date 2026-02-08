"""
URL configuration for census_portal project.
"""
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse


def api_root(request):
    """Root endpoint - returns API info"""
    return JsonResponse({
        "name": "Digital Census Portal API",
        "version": "1.0",
        "status": "running",
        "endpoints": {
            "health": "/api/v1/health/",
            "auth": "/api/v1/auth/",
            "users": "/api/v1/users/",
            "surveys": "/api/v1/surveys/",
            "addresses": "/api/v1/addresses/",
            "analytics": "/api/v1/analytics/"
        }
    })


def health_check(request):
    """Health check endpoint with diagnostics"""
    from django.contrib.auth import get_user_model
    from django.conf import settings
    
    try:
        User = get_user_model()
        user_count = User.objects.count()
        db_engine = settings.DATABASES['default']['ENGINE']
        dev_mode = getattr(settings, 'FIREBASE_AUTH_DEV_MODE', False)
        
        return JsonResponse({
            "status": "healthy", 
            "users": user_count,
            "db": db_engine,
            "dev_mode": dev_mode
        })
    except Exception as e:
        return JsonResponse({
            "status": "error",
            "error": str(e)
        }, status=500)


def seed_users(request):
    """Temporary endpoint to migrate DB and seed users manually"""
    from django.core.management import call_command
    from django.http import JsonResponse
    try:
        call_command('migrate')
        call_command('seed_initial_data')
        return JsonResponse({'status': 'success', 'message': 'Database migrated and users seeded successfully'})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)

urlpatterns = [
    path('', api_root, name='api_root'),
    path('admin/', admin.site.urls),
    path('api/v1/health/', health_check, name='health_check'),
    path('api/v1/seed_users/', seed_users, name='seed_users'),
    path('api/v1/auth/', include('accounts.urls')),
    path('api/v1/users/', include('accounts.user_urls')),
    path('api/v1/surveys/', include('surveys.urls')),
    path('api/v1/addresses/', include('surveys.address_urls')),
    path('api/v1/analytics/', include('analytics.urls')),
]
