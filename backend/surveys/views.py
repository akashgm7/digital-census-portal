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
    SurveyCreateSerializer, SurveySubmitSerializer, DailyProgressSerializer
)
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
        if self.action in ['create']:
            return [IsSurveyor()]
        if self.action in ['verify']:
            return [IsAdminOrSupervisor()]
        return [IsSupervisorOrSurveyor()]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return SurveyResponseListSerializer
        if self.action == 'create':
            return SurveyCreateSerializer
        return SurveyResponseSerializer
    
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
        
        # Calculate distance from zone center
        zone = survey.zone
        zone_lat = float(zone.center_latitude)
        zone_lng = float(zone.center_longitude)
        
        distance = self._calculate_distance(gps_lat, gps_lng, zone_lat, zone_lng)
        
        # Geo-fence check (5 meters threshold)
        threshold = getattr(settings, 'GEOFENCE_WARNING_DISTANCE_METERS', 5)
        location_warning = distance > threshold
        
        # Update survey
        survey.gps_latitude = gps_lat
        survey.gps_longitude = gps_lng
        survey.location_warning = location_warning
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
        ).exclude(status=SurveyResponse.Status.DRAFT).order_by('-submitted_at')
        
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
