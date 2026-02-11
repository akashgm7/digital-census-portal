"""
Survey views with strict data isolation and geo-fencing.
"""
import math
from datetime import date
from django.utils import timezone
from django.conf import settings
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import SurveyResponse, DailyProgress
from .serializers import (
    SurveyResponseSerializer, SurveyResponseListSerializer,
    SurveyCreateSerializer, SurveySubmitSerializer, DailyProgressSerializer,
    MasterAddressSerializer, MasterAddressUpdateSerializer
)
from .models import SurveyResponse, DailyProgress, MasterAddress

from accounts.models import AuditLog
from accounts.permissions import (
    IsSurveyor, IsAdminOrSupervisor, IsSupervisorOrSurveyor,
    IsOwnerOrAdmin, IsZoneRestricted, DataIsolationMixin
)


class SurveyViewSet(DataIsolationMixin, viewsets.ModelViewSet):
    """
    Survey CRUD with strict data isolation:
    - Surveyor: Only their own surveys
    - Supervisor: Only surveys in their zone
    - Admin: All surveys
    """
    queryset = SurveyResponse.objects.select_related('surveyor', 'zone', 'verified_by').all()
    
    def get_permissions(self):
        if self.action in ['create', 'destroy']:
            return [IsSurveyor()]
        if self.action in ['verify', 'flag']:
            return [IsAdminOrSupervisor()]
        return [IsSupervisorOrSurveyor()]
    
    def perform_destroy(self, instance):
        """Delete survey with validation - only own non-verified surveys."""
        user = self.request.user
        
        # Only surveyor can delete their own surveys
        if instance.surveyor != user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You can only delete your own surveys.')
        
        # Verified surveys cannot be deleted
        if instance.status == SurveyResponse.Status.VERIFIED:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Verified surveys cannot be deleted.')
        
        # Create audit log before deletion
        AuditLog.objects.create(
            user=user,
            action=AuditLog.Action.DELETE if hasattr(AuditLog.Action, 'DELETE') else AuditLog.Action.SUBMIT,
            entity_type='SurveyResponse',
            entity_id=str(instance.id)
        )
        
        instance.delete()
    
    def get_serializer_class(self):
        if self.action == 'list':
            return SurveyResponseListSerializer
        if self.action == 'create':
            return SurveyCreateSerializer
        return SurveyResponseSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by Status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            if ',' in status_filter:
                statuses = status_filter.split(',')
                queryset = queryset.filter(status__in=statuses)
            else:
                queryset = queryset.filter(status=status_filter)
            
        # Filter by Zone
        zone_id = self.request.query_params.get('zone')
        if zone_id:
            queryset = queryset.filter(zone_id=zone_id)
            
        # Filter by Supervisor (Show surveys from their zone)
        supervisor_id = self.request.query_params.get('supervisor')
        if supervisor_id:
            from accounts.models import User
            try:
                supervisor = User.objects.get(id=supervisor_id, role='SUPERVISOR')
                if supervisor.zone:
                    queryset = queryset.filter(zone=supervisor.zone)
            except User.DoesNotExist:
                pass
                
        return queryset
    
    def perform_create(self, serializer):
        """Create survey with surveyor and zone from user."""
        user = self.request.user
        
        survey = serializer.save(
            surveyor=user,
            zone=user.zone,
            status=SurveyResponse.Status.DRAFT
        )
        
        # Add audit entry
        survey.add_audit_entry(user, 'CREATED')
    
    def perform_update(self, serializer):
        """Update survey with validation and audit logging."""
        survey = self.get_object()
        user = self.request.user
        
        # Check if survey is editable
        if not survey.is_editable:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Verified surveys cannot be edited.')
        
        # Only surveyor can edit their own unverified surveys
        if user.role == 'SURVEYOR' and survey.surveyor != user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You can only edit your own surveys.')
        
        # Track changes for audit
        old_data = SurveyResponseSerializer(survey).data
        updated_survey = serializer.save()
        new_data = SurveyResponseSerializer(updated_survey).data
        
        # Find changed fields
        changes = {}
        for key in new_data:
            if key not in ['audit_trail', 'updated_at'] and old_data.get(key) != new_data.get(key):
                changes[key] = {'old': old_data.get(key), 'new': new_data.get(key)}
        
        if changes:
            updated_survey.add_audit_entry(user, 'UPDATED', changes)
    
    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """
        Submit a draft survey with GPS capture and geo-fencing.
        
        Geo-fencing:
        - Capture GPS on submit
        - Compare with zone center
        - If >5 meters, accept but mark location_warning=true
        """
        survey = self.get_object()
        user = request.user
        
        # Only surveyor can submit
        if user.role == 'SURVEYOR' and survey.surveyor != user:
            return Response(
                {'error': 'You can only submit your own surveys.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if draft
        if survey.status != SurveyResponse.Status.DRAFT:
            return Response(
                {'error': 'Only draft surveys can be submitted.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate GPS data
        serializer = SurveySubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        gps_lat = float(serializer.validated_data['gps_latitude'])
        gps_lng = float(serializer.validated_data['gps_longitude'])
        
        # Calculate distance from zone center (with null-safety)
        zone = survey.zone
        location_warning = False
        distance = 0
        
        if zone and zone.center_latitude is not None and zone.center_longitude is not None:
            try:
                zone_lat = float(zone.center_latitude)
                zone_lng = float(zone.center_longitude)
                distance = self._calculate_distance(gps_lat, gps_lng, zone_lat, zone_lng)
                
                # Geo-fence check (Use Zone Radius)
                threshold = zone.radius_meters if zone.radius_meters else getattr(settings, 'GEOFENCE_WARNING_DISTANCE_METERS', 5)
                location_warning = distance > threshold
            except (ValueError, TypeError):
                # If coordinate conversion fails, flag as location warning
                location_warning = True
                distance = 0
        else:
            # Zone has no center coordinates - flag for review
            location_warning = True
        
        # Update survey
        survey.gps_latitude = gps_lat
        survey.gps_longitude = gps_lng
        survey.location_warning = location_warning
        
        # Auto-flag if new/unknown house (no master address linked)
        # Auto-flag logic
        if not survey.address:
            # New/Unknown House -> Always Flag
            survey.status = SurveyResponse.Status.FLAGGED
            survey.add_audit_entry(user, 'FLAGGED', {'reason': 'New/Unknown address'})
        elif location_warning:
            # Matched Address but Wrong Location -> Flag
            survey.status = SurveyResponse.Status.FLAGGED
            survey.add_audit_entry(user, 'FLAGGED', {'reason': 'Location warning (GPS mismatch)'})
        else:
            # Matched Address and Good Location -> Submitted
            survey.status = SurveyResponse.Status.SUBMITTED
            
        survey.submitted_at = timezone.now()
        survey.save()
        
        # Update daily progress
        self._update_daily_progress(user)
        
        # Add audit entry
        survey.add_audit_entry(user, 'SUBMITTED', {
            'gps': f'{gps_lat}, {gps_lng}',
            'distance_from_zone': f'{distance:.2f}m',
            'location_warning': location_warning
        })
        
        # Create audit log
        AuditLog.objects.create(
            user=user,
            action=AuditLog.Action.SUBMIT,
            entity_type='SurveyResponse',
            entity_id=str(survey.id)
        )
        
        return Response({
            'success': True,
            'message': 'Survey submitted successfully.',
            'location_warning': location_warning,
            'distance_from_zone': f'{distance:.2f} meters'
        })
    
    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        """
        Supervisor/Admin verification - locks the survey permanently.
        """
        survey = self.get_object()
        user = request.user
        
        # Check zone restriction for supervisors
        if user.role == 'SUPERVISOR' and survey.zone != user.zone:
            return Response(
                {'error': 'You can only verify surveys in your zone.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if submitted
        if survey.status != SurveyResponse.Status.SUBMITTED:
            return Response(
                {'error': 'Only submitted surveys can be verified.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify survey
        survey.status = SurveyResponse.Status.VERIFIED
        survey.verified_at = timezone.now()
        survey.verified_by = user
        survey.save()
        
        # Add audit entry
        survey.add_audit_entry(user, 'VERIFIED')
        
        # Create audit log
        AuditLog.objects.create(
            user=user,
            action=AuditLog.Action.VERIFY,
            entity_type='SurveyResponse',
            entity_id=str(survey.id)
        )
        
        return Response({
            'success': True,
            'message': 'Survey verified and locked successfully.'
        })
    
    @action(detail=True, methods=['post'])
    def flag(self, request, pk=None):
        """Flag a survey for review."""
        survey = self.get_object()
        user = request.user
        
        reason = request.data.get('reason', '')
        
        survey.status = SurveyResponse.Status.FLAGGED
        survey.save()
        
        survey.add_audit_entry(user, 'FLAGGED', {'reason': reason})
        
        return Response({
            'success': True,
            'message': 'Survey flagged for review.'
        })
    
    @action(detail=False, methods=['get'])
    def history(self, request):
        """
        Get surveyor's own survey history.
        Yellow = Submitted (editable)
        Green = Verified (read-only)
        """
        if request.user.role != 'SURVEYOR':
            return Response(
                {'error': 'Only surveyors can access history.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        surveys = SurveyResponse.objects.filter(
            surveyor=request.user
        ).order_by('-updated_at')
        
        serializer = SurveyResponseListSerializer(surveys, many=True)
        
        # Add color coding
        data = serializer.data
        for item in data:
            if item['status'] == 'VERIFIED':
                item['color'] = 'green'
                item['editable'] = False
            else:
                item['color'] = 'yellow'
                item['editable'] = True
        
        return Response(data)
    
    @action(detail=False, methods=['get'])
    def daily_progress(self, request):
        """Get current day's progress for surveyor."""
        if request.user.role != 'SURVEYOR':
            return Response(
                {'error': 'Only surveyors can access daily progress.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        today = date.today()
        
        progress, created = DailyProgress.objects.get_or_create(
            surveyor=request.user,
            date=today,
            defaults={'target': request.user.daily_target}
        )
        
        serializer = DailyProgressSerializer(progress)
        return Response(serializer.data)
    
    def _calculate_distance(self, lat1, lon1, lat2, lon2):
        """Calculate distance between two GPS points using Haversine formula."""
        R = 6371000  # Earth's radius in meters
        
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)
        
        a = math.sin(delta_phi/2)**2 + \
            math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        
        return R * c  # Distance in meters
    
    def _update_daily_progress(self, user):
        """Update daily progress when survey is submitted."""
        today = date.today()
        
        progress, created = DailyProgress.objects.get_or_create(
            surveyor=user,
            date=today,
            defaults={'target': user.daily_target}
        )
        
        progress.surveys_completed += 1
        progress.save()


class AddressViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Master Address List with Pincode Validation.
    """
    queryset = MasterAddress.objects.all()
    serializer_class = MasterAddressSerializer
    permission_classes = [IsSupervisorOrSurveyor]
    
    def get_queryset(self):
        """Filter addresses by zone/pincode."""
        queryset = super().get_queryset()
        user = self.request.user
        
        # Filter by Zone
        if user.zone:
            queryset = queryset.filter(zone=user.zone)
            
        # Optional Pincode Filter
        pincode = self.request.query_params.get('pincode')
        if pincode:
            queryset = queryset.filter(pincode=pincode)
            
        return queryset
    
    @action(detail=False, methods=['get'])
    def validate_pincode(self, request):
        """
        Validate if the pincode belongs to the user's assigned zone.
        """
        pincode = request.query_params.get('pincode')
        if not pincode:
            return Response({'valid': False, 'error': 'Pincode is required'}, status=400)
        
        user = request.user
        if not user.zone:
            return Response({'valid': False, 'error': 'User not assigned to any zone'}, status=400)
            
        # Check if zone code matches pincode
        # Assuming Zone code IS the pincode or contains it
        is_valid = user.zone.code == pincode
        
        return Response({
            'valid': is_valid,
            'zone': user.zone.name,
            'assigned_pincode': user.zone.code
        })

