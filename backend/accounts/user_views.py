"""
User management views for Admin operations.
Includes bulk CSV upload with validation.
"""
import csv
import io
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser

from .models import User, Zone, AuditLog
from .serializers import (
    UserSerializer, UserCreateSerializer, UserUpdateSerializer,
    ZoneSerializer, BulkUploadResultSerializer
)
from .permissions import IsAdmin


class UserViewSet(viewsets.ModelViewSet):
    """
    Admin-only user management ViewSet.
    Supports CRUD operations and bulk CSV upload.
    """
    queryset = User.objects.select_related('zone').all().order_by('id')
    permission_classes = [IsAdmin]
    pagination_class = None
    filterset_fields = ['role', 'zone']
    search_fields = ['full_name', 'phone_number']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        if self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserSerializer
    
    def perform_create(self, serializer):
        user = serializer.save()
        # Create audit log
        AuditLog.objects.create(
            user=self.request.user,
            action=AuditLog.Action.CREATE,
            entity_type='User',
            entity_id=str(user.id),
            new_values=UserSerializer(user).data
        )
        # TODO: Send SMS invitation
        self._send_invitation_sms(user)
    
    def perform_update(self, serializer):
        old_data = UserSerializer(self.get_object()).data
        user = serializer.save()
        new_data = UserSerializer(user).data
        
        AuditLog.objects.create(
            user=self.request.user,
            action=AuditLog.Action.UPDATE,
            entity_type='User',
            entity_id=str(user.id),
            old_values=old_data,
            new_values=new_data
        )
    
    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def bulk_upload(self, request):
        """
        Bulk user creation via CSV upload.
        
        CSV Format:
        Full Name,Phone Number,Role,Zone Code,Daily Target
        
        Validation:
        - Duplicate phone → reject row
        - Invalid zone → reject row
        - Missing required fields → reject row
        """
        file = request.FILES.get('file')
        
        if not file:
            return Response(
                {'error': 'No file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not file.name.endswith('.csv'):
            return Response(
                {'error': 'File must be a CSV'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Parse CSV
        try:
            decoded_file = file.read().decode('utf-8')
            reader = csv.DictReader(io.StringIO(decoded_file))
        except Exception as e:
            return Response(
                {'error': f'Error reading CSV: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        results = {
            'total_rows': 0,
            'successful': 0,
            'failed': 0,
            'errors': []
        }
        
        # Pre-fetch zones for validation
        zones = {z.code: z for z in Zone.objects.filter(is_active=True)}
        existing_phones = set(User.objects.values_list('phone_number', flat=True))
        
        created_users = []
        
        for row_num, row in enumerate(reader, start=2):  # Start at 2 (header is row 1)
            results['total_rows'] += 1
            
            try:
                # Validate required fields
                full_name = row.get('Full Name', '').strip()
                phone_number = row.get('Phone Number', '').strip()
                role = row.get('Role', 'SURVEYOR').strip().upper()
                zone_code = row.get('Zone Code', '').strip()
                daily_target = row.get('Daily Target', '10').strip()
                
                errors = []
                
                if not full_name:
                    errors.append('Full Name is required')
                
                if not phone_number:
                    errors.append('Phone Number is required')
                else:
                    # Normalize phone number
                    digits = ''.join(filter(str.isdigit, phone_number))
                    if len(digits) != 10:
                        errors.append('Phone Number must be 10 digits')
                    else:
                        phone_number = '+91' + digits
                        if phone_number in existing_phones:
                            errors.append(f'Phone Number {phone_number} already exists')
                
                if role not in ['ADMIN', 'SUPERVISOR', 'SURVEYOR']:
                    errors.append(f'Invalid Role: {role}')
                
                zone = None
                if role in ['SUPERVISOR', 'SURVEYOR']:
                    if not zone_code:
                        errors.append('Zone Code is required for Supervisors and Surveyors')
                    elif zone_code not in zones:
                        errors.append(f'Invalid Zone Code: {zone_code}')
                    else:
                        zone = zones[zone_code]
                
                try:
                    daily_target = int(daily_target)
                except ValueError:
                    errors.append('Daily Target must be a number')
                    daily_target = 10
                
                if errors:
                    results['failed'] += 1
                    results['errors'].append({
                        'row': row_num,
                        'data': row,
                        'errors': errors
                    })
                    continue
                
                # Create user
                user = User.objects.create(
                    phone_number=phone_number,
                    full_name=full_name,
                    role=role,
                    zone=zone,
                    daily_target=daily_target
                )
                
                existing_phones.add(phone_number)
                created_users.append(user)
                results['successful'] += 1
                
            except Exception as e:
                results['failed'] += 1
                results['errors'].append({
                    'row': row_num,
                    'data': row,
                    'errors': [str(e)]
                })
        
        # Create audit log for bulk upload
        AuditLog.objects.create(
            user=request.user,
            action=AuditLog.Action.CREATE,
            entity_type='BulkUserUpload',
            entity_id='bulk',
            new_values={
                'total': results['total_rows'],
                'successful': results['successful'],
                'failed': results['failed']
            }
        )
        
        # Send SMS invitations to created users
        for user in created_users:
            self._send_invitation_sms(user)
        
        return Response(results, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def block(self, request, pk=None):
        """Block a user (set is_active=False)."""
        user = self.get_object()
        old_status = user.is_active
        user.is_active = False
        user.save(update_fields=['is_active'])
        
        AuditLog.objects.create(
            user=request.user,
            action=AuditLog.Action.UPDATE,
            entity_type='User',
            entity_id=str(user.id),
            old_values={'is_active': old_status},
            new_values={'is_active': False}
        )
        
        return Response({'success': True, 'message': f'{user.full_name} has been blocked'})
    
    @action(detail=True, methods=['post'])
    def unblock(self, request, pk=None):
        """Unblock a user (set is_active=True)."""
        user = self.get_object()
        old_status = user.is_active
        user.is_active = True
        user.save(update_fields=['is_active'])
        
        AuditLog.objects.create(
            user=request.user,
            action=AuditLog.Action.UPDATE,
            entity_type='User',
            entity_id=str(user.id),
            old_values={'is_active': old_status},
            new_values={'is_active': True}
        )
        
        return Response({'success': True, 'message': f'{user.full_name} has been unblocked'})
    
    @action(detail=True, methods=['post'])
    def reassign_zone(self, request, pk=None):
        """Reassign user to a different zone."""
        user = self.get_object()
        new_zone_id = request.data.get('zone_id')
        
        if not new_zone_id:
            return Response(
                {'error': 'zone_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            new_zone = Zone.objects.get(id=new_zone_id, is_active=True)
        except Zone.DoesNotExist:
            return Response(
                {'error': 'Invalid zone_id'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        old_zone = user.zone
        user.zone = new_zone
        user.save(update_fields=['zone'])
        
        AuditLog.objects.create(
            user=request.user,
            action=AuditLog.Action.UPDATE,
            entity_type='User',
            entity_id=str(user.id),
            old_values={'zone_id': str(old_zone.id) if old_zone else None},
            new_values={'zone_id': str(new_zone.id)}
        )
        
        return Response({
            'success': True,
            'message': f'{user.full_name} reassigned to {new_zone.name}'
        })
    
    def _send_invitation_sms(self, user):
        """Send SMS invitation to new user."""
        from django.conf import settings
        
        if settings.SMS_CONFIG['PROVIDER'] == 'mock':
            # Mock SMS in development
            print(f"[MOCK SMS] To: {user.phone_number}")
            print(f"[MOCK SMS] Message: Welcome to Digital Census Portal. "
                  f"You have been registered as {user.role}. "
                  f"Download the app and login with your phone number.")
            return True
        
        # TODO: Implement actual SMS gateway integration
        return True


class ZoneViewSet(viewsets.ModelViewSet):
    """Zone management for Admins."""
    queryset = Zone.objects.all()
    serializer_class = ZoneSerializer
    permission_classes = [IsAdmin]
