from django.contrib import admin
from .models import User, Zone, AuditLog


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['phone_number', 'full_name', 'role', 'zone', 'is_active', 'created_at']
    list_filter = ['role', 'is_active', 'zone']
    search_fields = ['phone_number', 'full_name']
    readonly_fields = ['id', 'created_at', 'updated_at', 'last_login']


@admin.register(Zone)
class ZoneAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'center_latitude', 'center_longitude', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name', 'code']


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'action', 'entity_type', 'entity_id', 'timestamp']
    list_filter = ['action', 'entity_type']
    search_fields = ['user__full_name', 'entity_id']
    readonly_fields = ['id', 'timestamp']
