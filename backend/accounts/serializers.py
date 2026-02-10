"""
Serializers for User management and authentication.
"""
from rest_framework import serializers
from .models import User, Zone, AuditLog


class ZoneSerializer(serializers.ModelSerializer):
    """Serializer for Zone model."""
    
    class Meta:
        model = Zone
        fields = ['id', 'name', 'code', 'center_latitude', 'center_longitude', 
                  'radius_meters', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class UserSerializer(serializers.ModelSerializer):
    """Full user serializer for admin operations."""
    zone_name = serializers.CharField(source='zone.name', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'phone_number', 'full_name', 'role', 'zone', 'zone_name',
                  'daily_target', 'is_active', 'created_at', 'last_login']
        read_only_fields = ['id', 'created_at', 'last_login']


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new users."""
    
    class Meta:
        model = User
        fields = ['phone_number', 'full_name', 'role', 'zone', 'daily_target']
    
    def validate_phone_number(self, value):
        """Ensure phone number is 10 digits."""
        # Remove any non-digit characters
        digits = ''.join(filter(str.isdigit, value))
        if len(digits) != 10:
            raise serializers.ValidationError('Phone number must be exactly 10 digits.')
        return '+91' + digits  # Add India country code
    
    def validate_zone(self, value):
        """Supervisors and Surveyors must have a zone."""
        return value
    
    def validate(self, data):
        """Cross-field validation."""
        role = data.get('role', 'SURVEYOR')
        zone = data.get('zone')
        
        if role in ['SUPERVISOR', 'SURVEYOR'] and not zone:
            raise serializers.ValidationError({
                'zone': 'Zone is required for Supervisors and Surveyors.'
            })
        
        return data


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user details (admin only)."""
    
    class Meta:
        model = User
        fields = ['full_name', 'role', 'zone', 'daily_target', 'is_active']


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for users to update their own profile."""
    
    class Meta:
        model = User
        fields = ['full_name']


class LoginSerializer(serializers.Serializer):
    """Serializer for login request."""
    firebase_token = serializers.CharField()


class LoginResponseSerializer(serializers.Serializer):
    """Serializer for login response."""
    success = serializers.BooleanField()
    user_id = serializers.UUIDField()
    full_name = serializers.CharField()
    role = serializers.CharField()
    zone_id = serializers.UUIDField(allow_null=True)
    zone_name = serializers.CharField(allow_null=True)
    daily_target = serializers.IntegerField()
    redirect_url = serializers.CharField()


class BulkUploadSerializer(serializers.Serializer):
    """Serializer for CSV bulk upload."""
    file = serializers.FileField()
    
    def validate_file(self, value):
        if not value.name.endswith('.csv'):
            raise serializers.ValidationError('File must be a CSV.')
        return value


class BulkUploadResultSerializer(serializers.Serializer):
    """Serializer for bulk upload results."""
    total_rows = serializers.IntegerField()
    successful = serializers.IntegerField()
    failed = serializers.IntegerField()
    errors = serializers.ListField(child=serializers.DictField())


class AuditLogSerializer(serializers.ModelSerializer):
    """Serializer for audit logs."""
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = ['id', 'user', 'user_name', 'action', 'entity_type', 
                  'entity_id', 'old_values', 'new_values', 'timestamp']
