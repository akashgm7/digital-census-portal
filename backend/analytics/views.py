"""
Analytics views for Admin and Supervisor dashboards.
Surveyors have NO access to analytics.
"""
from datetime import date, timedelta
from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from rest_framework.views import APIView
from rest_framework.response import Response

from surveys.models import SurveyResponse, DailyProgress
from accounts.models import User, Zone
from accounts.permissions import IsAdmin, IsAdminOrSupervisor


class AdminDashboardView(APIView):
    """
    Admin-only dashboard with full system visibility.
    - National analytics
    - Zone-to-zone comparison
    - All surveyors visibility
    """
    permission_classes = [IsAdmin]
    
    def get(self, request):
        # Filters
        zone_id = request.query_params.get('zone_id')
        supervisor_id = request.query_params.get('supervisor_id')
        
        # Base QuerySets
        surveys_qs = SurveyResponse.objects.all()
        users_qs = User.objects.all()
        daily_progress_qs = DailyProgress.objects.filter(date=date.today())
        
        # Apply Filters
        selected_zone = None
        
        if supervisor_id:
            try:
                supervisor = User.objects.get(id=supervisor_id, role='SUPERVISOR')
                if supervisor.zone:
                    selected_zone = supervisor.zone
                    # Filter by Supervisor's Zone
                    surveys_qs = surveys_qs.filter(zone=selected_zone)
                    users_qs = users_qs.filter(zone=selected_zone)
                    daily_progress_qs = daily_progress_qs.filter(surveyor__zone=selected_zone)
            except User.DoesNotExist:
                pass
        
        if zone_id:
            # Zone filter overrides supervisor's zone if both present (or intersects? let's stick to override/specific)
            surveys_qs = surveys_qs.filter(zone_id=zone_id)
            users_qs = users_qs.filter(zone_id=zone_id)
            daily_progress_qs = daily_progress_qs.filter(surveyor__zone_id=zone_id)
            try:
                selected_zone = Zone.objects.get(id=zone_id)
            except Zone.DoesNotExist:
                pass

        # Overall counts
        total_surveys = surveys_qs.count()
        submitted = surveys_qs.filter(status='SUBMITTED').count()
        verified = surveys_qs.filter(status='VERIFIED').count()
        flagged = surveys_qs.filter(status='FLAGGED').count()
        drafts = surveys_qs.filter(status='DRAFT').count()
        new_houses = surveys_qs.filter(status='FLAGGED', address__isnull=True).count()
        location_warnings = surveys_qs.filter(status='FLAGGED', location_warning=True).count()
        
        # User counts
        total_users = users_qs.count()
        active_users = users_qs.filter(is_active=True).count()
        admins = users_qs.filter(role='ADMIN').count()
        supervisors = users_qs.filter(role='SUPERVISOR').count()
        surveyors = users_qs.filter(role='SURVEYOR').count()
        
        # Zone statistics (Only relevant if NO specific zone selected, otherwise show just that one)
        # If filtering by zone, this list might be just 1 item or we can skip it.
        # Let's keep it but filter it too if zone selected.
        zones_qs = Zone.objects.filter(is_active=True)
        if selected_zone:
            zones_qs = zones_qs.filter(id=selected_zone.id)
            
        zones_data = zones_qs.annotate(
            survey_count=Count('surveys', distinct=True),
            surveyor_count=Count('users', filter=Q(users__role='SURVEYOR'), distinct=True),
            verified_count=Count('surveys', filter=Q(surveys__status='VERIFIED'), distinct=True),
        ).values('id', 'name', 'code', 'survey_count', 'surveyor_count', 'verified_count')
        
        # Velocity graph (last 7 days)
        end_date = date.today()
        start_date = end_date - timedelta(days=6)
        
        daily_submissions = surveys_qs.filter(
            submitted_at__date__gte=start_date,
            submitted_at__date__lte=end_date
        ).annotate(
            day=TruncDate('submitted_at')
        ).values('day').annotate(
            count=Count('id')
        ).order_by('day')
        
        velocity_data = {str(d['day']): d['count'] for d in daily_submissions}
        
        # Fill in missing days
        velocity = []
        for i in range(7):
            day = start_date + timedelta(days=i)
            velocity.append({
                'date': str(day),
                'count': velocity_data.get(str(day), 0)
            })
        
        # Leaderboard (top 10 surveyors by submissions)
        leaderboard = daily_progress_qs.select_related('surveyor').order_by('-surveys_completed')[:10]
        
        leaderboard_data = [{
            'surveyor_id': str(p.surveyor.id),
            'surveyor_name': p.surveyor.full_name,
            'zone_name': p.surveyor.zone.name if p.surveyor.zone else 'N/A',
            'completed': p.surveys_completed,
            'target': p.target,
            'percentage': p.completion_percentage
        } for p in leaderboard]
        
        return Response({
            'overview': {
                'total_surveys': total_surveys,
                'submitted': submitted,
                'verified': verified,
                'flagged': flagged,
                'drafts': drafts,
                'new_houses': new_houses,
                'location_warnings': location_warnings,
            },
            'users': {
                'total': total_users,
                'active': active_users,
                'admins': admins,
                'supervisors': supervisors,
                'surveyors': surveyors,
            },
            'zones': list(zones_data),
            'velocity': velocity,
            'leaderboard': leaderboard_data,
            'filter_meta': {
                'zone': selected_zone.name if selected_zone else 'All',
                'zone_id': str(selected_zone.id) if selected_zone else None
            }
        })


class SupervisorDashboardView(APIView):
    """
    Supervisor dashboard - zone-restricted.
    - Zone-specific analytics
    - All surveyors in zone
    - Zone leaderboard
    """
    permission_classes = [IsAdminOrSupervisor]
    
    def get(self, request):
        user = request.user
        zone = user.zone
        
        if user.role == 'SUPERVISOR' and not zone:
            return Response({'error': 'No zone assigned.'}, status=400)
        
        # For admins, optionally filter by zone
        zone_id = request.query_params.get('zone_id')
        if user.role == 'ADMIN' and zone_id:
            try:
                zone = Zone.objects.get(id=zone_id)
            except Zone.DoesNotExist:
                return Response({'error': 'Zone not found.'}, status=404)
        
        # Zone survey counts
        zone_surveys = SurveyResponse.objects.filter(zone=zone)
        total = zone_surveys.count()
        submitted = zone_surveys.filter(status='SUBMITTED').count()
        verified = zone_surveys.filter(status='VERIFIED').count()
        flagged = zone_surveys.filter(status='FLAGGED').count()
        
        # Alerts should only show actionable items (FLAGGED statuses)
        # New Houses = Flagged & No Address
        new_houses_count = zone_surveys.filter(status='FLAGGED', address__isnull=True).count()
        # Location Warnings = Flagged & Has Warning (Mutually exclusive with above based on submit logic)
        location_warnings_count = zone_surveys.filter(status='FLAGGED', location_warning=True).count()
        
        # Zone surveyors
        surveyors = User.objects.filter(
            zone=zone, 
            role='SURVEYOR',
            is_active=True
        ).annotate(
            survey_count=Count('surveys', filter=Q(surveys__status__in=['SUBMITTED', 'VERIFIED', 'FLAGGED']), distinct=True)
        ).values('id', 'full_name', 'phone_number', 'daily_target', 'survey_count')
        
        # Velocity (last 7 days)
        end_date = date.today()
        start_date = end_date - timedelta(days=6)
        
        daily = zone_surveys.filter(
            submitted_at__date__gte=start_date
        ).annotate(
            day=TruncDate('submitted_at')
        ).values('day').annotate(count=Count('id')).order_by('day')
        
        velocity_data = {str(d['day']): d['count'] for d in daily}
        velocity = []
        for i in range(7):
            day = start_date + timedelta(days=i)
            velocity.append({'date': str(day), 'count': velocity_data.get(str(day), 0)})
        
        # Zone leaderboard
        leaderboard = DailyProgress.objects.filter(
            date=date.today(),
            surveyor__zone=zone
        ).select_related('surveyor').order_by('-surveys_completed')
        
        leaderboard_data = [{
            'surveyor_name': p.surveyor.full_name,
            'completed': p.surveys_completed,
            'target': p.target,
            'percentage': p.completion_percentage
        } for p in leaderboard]
        
        return Response({
            'zone': {
                'id': str(zone.id),
                'name': zone.name,
                'code': zone.code
            },
            'overview': {
                'total': total,
                'submitted': submitted,
                'verified': verified,
                'flagged': flagged,
                'pending_verification': submitted + flagged,
                'drafts': zone_surveys.filter(status='DRAFT').count(),
                'location_warnings': location_warnings_count,
                'new_houses': new_houses_count,
            },
            'surveyors': list(surveyors),
            'velocity': velocity,
            'leaderboard': leaderboard_data
        })


class SurveyorDashboardView(APIView):
    """
    Surveyor dashboard - self-restricted.
    Daily target progress, personal stats.
    """
    
    def get(self, request):
        user = request.user
        
        if user.role != 'SURVEYOR':
            return Response({'error': 'Surveyor access only.'}, status=403)
        
        # Today's progress
        today = date.today()
        progress, _ = DailyProgress.objects.get_or_create(
            surveyor=user,
            date=today,
            defaults={'target': user.daily_target}
        )
        
        # Personal stats
        my_surveys = SurveyResponse.objects.filter(surveyor=user)
        total = my_surveys.count()
        submitted = my_surveys.filter(status='SUBMITTED').count()
        verified = my_surveys.filter(status='VERIFIED').count()
        flagged = my_surveys.filter(status='FLAGGED').count()
        drafts = my_surveys.filter(status='DRAFT').count()
        
        # Alerts/Actionable
        new_houses = my_surveys.filter(status='FLAGGED', address__isnull=True).count()
        location_warnings = my_surveys.filter(status='FLAGGED', location_warning=True).count()
        
        # Recent surveys
        recent = my_surveys.exclude(status='DRAFT').order_by('-submitted_at')[:5]
        recent_data = [{
            'id': str(s.id),
            'head_name': s.head_name,
            'status': s.status,
            'submitted_at': s.submitted_at,
            'editable': s.status != 'VERIFIED'
        } for s in recent]
        
        return Response({
            'user': {
                'name': user.full_name,
                'zone': user.zone.name if user.zone else 'N/A',
                'daily_target': user.daily_target
            },
            'today': {
                'completed': progress.surveys_completed,
                'target': progress.target,
                'percentage': progress.completion_percentage,
                'target_met': progress.is_target_met
            },
            'stats': {
                'total': total,
                'submitted': submitted,
                'verified': verified,
                'flagged': flagged,
                'drafts': drafts,
                'new_houses': new_houses,
                'location_warnings': location_warnings
            },
            'recent_surveys': recent_data
        })
