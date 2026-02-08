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
        # Overall counts
        total_surveys = SurveyResponse.objects.count()
        submitted = SurveyResponse.objects.filter(status='SUBMITTED').count()
        verified = SurveyResponse.objects.filter(status='VERIFIED').count()
        flagged = SurveyResponse.objects.filter(status='FLAGGED').count()
        drafts = SurveyResponse.objects.filter(status='DRAFT').count()
        location_warnings = SurveyResponse.objects.filter(location_warning=True).count()
        
        # User counts
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        admins = User.objects.filter(role='ADMIN').count()
        supervisors = User.objects.filter(role='SUPERVISOR').count()
        surveyors = User.objects.filter(role='SURVEYOR').count()
        
        # Zone statistics
        zones = Zone.objects.filter(is_active=True).annotate(
            survey_count=Count('surveys'),
            surveyor_count=Count('users', filter=Q(users__role='SURVEYOR')),
            verified_count=Count('surveys', filter=Q(surveys__status='VERIFIED')),
        ).values('id', 'name', 'code', 'survey_count', 'surveyor_count', 'verified_count')
        
        # Velocity graph (last 7 days)
        end_date = date.today()
        start_date = end_date - timedelta(days=6)
        
        daily_submissions = SurveyResponse.objects.filter(
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
        leaderboard = DailyProgress.objects.filter(
            date=date.today()
        ).select_related('surveyor').order_by('-surveys_completed')[:10]
        
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
                'location_warnings': location_warnings,
            },
            'users': {
                'total': total_users,
                'active': active_users,
                'admins': admins,
                'supervisors': supervisors,
                'surveyors': surveyors,
            },
            'zones': list(zones),
            'velocity': velocity,
            'leaderboard': leaderboard_data
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
        location_warnings = zone_surveys.filter(location_warning=True).count()
        
        # Zone surveyors
        surveyors = User.objects.filter(
            zone=zone, 
            role='SURVEYOR',
            is_active=True
        ).annotate(
            survey_count=Count('surveys', filter=Q(surveys__status__in=['SUBMITTED', 'VERIFIED']))
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
                'location_warnings': location_warnings,
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
        drafts = my_surveys.filter(status='DRAFT').count()
        
        # Recent surveys
        recent = my_surveys.exclude(status='DRAFT').order_by('-submitted_at')[:5]
        recent_data = [{
            'id': str(s.id),
            'head_name': s.head_name,
            'status': s.status,
            'submitted_at': s.submitted_at,
            'editable': s.status == 'SUBMITTED'
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
                'drafts': drafts
            },
            'recent_surveys': recent_data
        })
