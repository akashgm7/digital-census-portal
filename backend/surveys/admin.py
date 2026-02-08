from django.contrib import admin
from .models import MasterAddress, SurveyResponse, DailyProgress


@admin.register(MasterAddress)
class MasterAddressAdmin(admin.ModelAdmin):
    list_display = ['address_line1', 'pincode', 'zone', 'status', 'needs_review']
    list_filter = ['zone', 'status', 'needs_review']
    search_fields = ['address_line1', 'pincode']


@admin.register(SurveyResponse)
class SurveyResponseAdmin(admin.ModelAdmin):
    list_display = ['id', 'head_name', 'surveyor', 'zone', 'status', 'submitted_at', 'location_warning']
    list_filter = ['status', 'zone', 'location_warning']
    search_fields = ['head_name', 'pincode']
    readonly_fields = ['id', 'audit_trail']


@admin.register(DailyProgress)
class DailyProgressAdmin(admin.ModelAdmin):
    list_display = ['surveyor', 'date', 'surveys_completed', 'target', 'completion_percentage']
    list_filter = ['date']
    search_fields = ['surveyor__full_name']
