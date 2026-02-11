"""
Serializers for Survey and Address models.
"""
from rest_framework import serializers
from .models import MasterAddress, SurveyResponse, DailyProgress
from accounts.serializers import UserSerializer


class MasterAddressSerializer(serializers.ModelSerializer):
    """Serializer for MasterAddress."""
    zone_name = serializers.CharField(source='zone.name', read_only=True)
    
    class Meta:
        model = MasterAddress
        fields = ['id', 'zone', 'zone_name', 'pincode', 'address_line1', 'address_line2',
                  'landmark', 'building_number', 'floor_number', 'status', 
                  'latitude', 'longitude', 'needs_review']
        read_only_fields = ['id']
    
    def validate_address_line1(self, value):
        """Ensure address starts with 'Door No.'"""
        if not value.strip().lower().startswith('door no.'):
            raise serializers.ValidationError(
                'Address must begin with "Door No." (e.g. Door No. 123, Street Name)'
            )
        return value


class MasterAddressUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating address status."""
    
    class Meta:
        model = MasterAddress
        fields = ['status', 'needs_review']


class SurveyResponseListSerializer(serializers.ModelSerializer):
    """Light serializer for survey list views."""
    surveyor_name = serializers.CharField(source='surveyor.full_name', read_only=True)
    zone_name = serializers.CharField(source='zone.name', read_only=True)
    
    class Meta:
        model = SurveyResponse
        fields = ['id', 'surveyor', 'surveyor_name', 'zone_name', 'address', 'status', 'head_name', 
                  'pincode', 'address_line', 'head_phone', 'total_members', 
                  'created_at', 'submitted_at', 'location_warning']


class SurveyResponseSerializer(serializers.ModelSerializer):
    """Full serializer for survey create/update."""
    surveyor_name = serializers.CharField(source='surveyor.full_name', read_only=True)
    zone_name = serializers.CharField(source='zone.name', read_only=True)
    verified_by_name = serializers.CharField(source='verified_by.full_name', read_only=True)
    is_editable = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = SurveyResponse
        fields = '__all__'
        read_only_fields = ['id', 'surveyor', 'zone', 'submitted_at', 'verified_at', 
                           'verified_by', 'audit_trail', 'location_warning']
        
    def create(self, validated_data):
        """Handle linking to MasterAddress."""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
             validated_data['surveyor'] = request.user
             validated_data['zone'] = request.user.zone
             
        # If address_id provided, link it
        # Note: frontend sends 'address' as ID because it's a ForeignKey in model
        # serializer handles it if field is PrimaryKeyRelatedField (default)
        
        return super().create(validated_data)
    
    def validate(self, data):
        """Apply dynamic validation rules from PRD."""
        errors = {}
        
        # Age < 18 → Occupation locked (should be empty or student)
        head_age = data.get('head_age', 0)
        head_occupation = data.get('head_occupation', '')
        
        if head_age and head_age < 18 and head_occupation and head_occupation.lower() not in ['', 'student', 'none']:
            errors['head_occupation'] = 'Occupation must be empty or "Student" for age under 18.'
        
        # Gender sum validation
        total = data.get('total_members', 0)
        male = data.get('male_members', 0)
        female = data.get('female_members', 0)
        other = data.get('other_members', 0)
        
        if total > 0 and (male + female + other) != total:
            errors['total_members'] = f'Gender sum ({male + female + other}) must equal total members ({total}).'
        
        # Phone digits validation
        head_phone = data.get('head_phone', '')
        if head_phone:
            digits = ''.join(filter(str.isdigit, head_phone))
            if len(digits) != 10:
                errors['head_phone'] = 'Phone number must be exactly 10 digits.'
        
        if errors:
            raise serializers.ValidationError(errors)
        
        return data


class SurveyCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new surveys."""
    
    class Meta:
        model = SurveyResponse
        exclude = ['surveyor', 'zone', 'submitted_at', 'verified_at', 
                   'verified_by', 'audit_trail', 'location_warning']
        # Allow these to be empty for drafts
        extra_kwargs = {
            'head_name': {'required': False, 'allow_blank': True},
            'head_gender': {'required': False, 'allow_blank': True},
            'head_age': {'required': False},
            'pincode': {'required': False, 'allow_blank': True},
            'address_line': {'required': False, 'allow_blank': True},
        }
    
    def validate(self, data):
        """Apply dynamic validation rules (skip for drafts)."""
        # Skip strict validation for drafts - allow incomplete data
        if data.get('status') == 'DRAFT':
            # Provide defaults for mandatory DB fields if missing
            if not data.get('head_name'):
                data['head_name'] = 'Draft'
            if not data.get('head_gender'):
                data['head_gender'] = 'OTHER'
            if not data.get('head_age'):
                data['head_age'] = 0
            if not data.get('pincode'):
                data['pincode'] = '000000'
            if not data.get('address_line'):
                data['address_line'] = 'Draft Address'
            return data
            
        # Full validation for submitted surveys
        errors = {}
        
        # 1. Required fields check (manually enforce since we relaxed extra_kwargs)
        required_fields = ['head_name', 'head_gender', 'head_age', 'pincode', 'address_line']
        for field in required_fields:
            if not data.get(field):
                errors[field] = 'This field is required.'
        
        head_age = data.get('head_age', 0)
        head_occupation = data.get('head_occupation', '')
        
        if head_age and head_age < 18 and head_occupation and head_occupation.lower() not in ['', 'student', 'none']:
            errors['head_occupation'] = 'Occupation must be empty or "Student" for age under 18.'
        
        total = data.get('total_members', 0)
        male = data.get('male_members', 0)
        female = data.get('female_members', 0)
        other = data.get('other_members', 0)
        
        if total > 0 and (male + female + other) != total:
            errors['total_members'] = f'Gender sum ({male + female + other}) must equal total members ({total}).'
        
        head_phone = data.get('head_phone', '')
        if head_phone:
            digits = ''.join(filter(str.isdigit, head_phone))
            if len(digits) != 10:
                errors['head_phone'] = 'Phone number must be exactly 10 digits.'
        
        if errors:
            raise serializers.ValidationError(errors)
        
        return data
        
        if head_age and head_age < 18 and head_occupation and head_occupation.lower() not in ['', 'student', 'none']:
            errors['head_occupation'] = 'Occupation must be empty or "Student" for age under 18.'
        
        total = data.get('total_members', 0)
        male = data.get('male_members', 0)
        female = data.get('female_members', 0)
        other = data.get('other_members', 0)
        
        if total > 0 and (male + female + other) != total:
            errors['total_members'] = f'Gender sum ({male + female + other}) must equal total members ({total}).'
        
        head_phone = data.get('head_phone', '')
        if head_phone:
            digits = ''.join(filter(str.isdigit, head_phone))
            if len(digits) != 10:
                errors['head_phone'] = 'Phone number must be exactly 10 digits.'
        
        if errors:
            raise serializers.ValidationError(errors)
        
        return data


class SurveySubmitSerializer(serializers.Serializer):
    """Serializer for survey submission with GPS."""
    gps_latitude = serializers.DecimalField(max_digits=10, decimal_places=7)
    gps_longitude = serializers.DecimalField(max_digits=10, decimal_places=7)


class DailyProgressSerializer(serializers.ModelSerializer):
    """Serializer for daily progress tracking."""
    surveyor_name = serializers.CharField(source='surveyor.full_name', read_only=True)
    completion_percentage = serializers.IntegerField(read_only=True)
    is_target_met = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = DailyProgress
        fields = ['id', 'surveyor', 'surveyor_name', 'date', 'surveys_completed',
                  'target', 'completion_percentage', 'is_target_met']
