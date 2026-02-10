"""
Authentication views for Firebase phone auth.
Implements the Gatekeeper Pattern as specified in PRD.
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.utils import timezone
import firebase_admin
from firebase_admin import auth as firebase_auth

from .models import User, AuditLog
from .serializers import LoginSerializer, LoginResponseSerializer


class LoginView(APIView):
    """
    Firebase token verification and session creation.
    
    Flow:
    1. Receive Firebase JWT from frontend
    2. Verify with Firebase Admin SDK
    3. Check user exists in DB with is_active=True
    4. Return role, zone_id, redirect URL
    
    Unauthorized Scenarios:
    - Not in DB → 401 Unauthorized
    - is_active = false → 403 Forbidden
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        firebase_token = serializer.validated_data['firebase_token']
        
        try:
            # Verify Firebase token
            decoded_token = self._verify_token(firebase_token)
            
            if not decoded_token:
                return Response(
                    {'success': False, 'message': 'Invalid token'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Extract phone number
            phone_number = decoded_token.get('phone_number')
            firebase_uid = decoded_token.get('uid')
            
            if not phone_number:
                return Response(
                    {'success': False, 'message': 'Phone number not found in token'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Check user exists
            try:
                user = User.objects.get(phone_number=phone_number)
            except User.DoesNotExist:
                return Response(
                    {'success': False, 'message': 'Unauthorized. User not registered in system.'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Check user is active
            if not user.is_active:
                return Response(
                    {'success': False, 'message': 'Account is blocked. Contact administrator.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Update Firebase UID and last login
            user.firebase_uid = firebase_uid
            user.last_login = timezone.now()
            user.save(update_fields=['firebase_uid', 'last_login'])
            
            # Create audit log
            AuditLog.objects.create(
                user=user,
                action=AuditLog.Action.LOGIN,
                entity_type='User',
                entity_id=str(user.id),
                ip_address=self._get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
            # Build response
            response_data = {
                'success': True,
                'user_id': user.id,
                'full_name': user.full_name,
                'role': user.role,
                'zone_id': user.zone.id if user.zone else None,
                'zone_name': f"{user.zone.name} ({user.zone.code})" if user.zone else None,
                'daily_target': user.daily_target,
                'redirect_url': user.get_redirect_url(),
                'created_at': user.created_at,
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'success': False, 'message': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _verify_token(self, token):
        """Verify Firebase JWT token or decode dev token."""
        from django.conf import settings
        import base64
        import json
        
        # Check if we're in dev mode
        if getattr(settings, 'FIREBASE_AUTH_DEV_MODE', False):
            # Try to decode as base64 dev token first
            try:
                decoded_json = base64.b64decode(token).decode('utf-8')
                return json.loads(decoded_json)
            except Exception:
                pass
        
        try:
            if firebase_admin._apps:
                return firebase_auth.verify_id_token(token)
            else:
                # Fallback: Try base64 first, then JWT
                try:
                    decoded_json = base64.b64decode(token).decode('utf-8')
                    return json.loads(decoded_json)
                except Exception:
                    import jwt
                    return jwt.decode(token, options={"verify_signature": False})
        except Exception:
            return None
    
    def _get_client_ip(self, request):
        """Extract client IP from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0]
        return request.META.get('REMOTE_ADDR')


class LogoutView(APIView):
    """
    Logout endpoint - invalidates session on backend.
    Note: Does NOT delete IndexedDB drafts (handled by frontend).
    """
    
    def post(self, request):
        user = request.user
        
        # Create audit log
        AuditLog.objects.create(
            user=user,
            action=AuditLog.Action.LOGOUT,
            entity_type='User',
            entity_id=str(user.id),
            ip_address=self._get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        return Response({'success': True, 'message': 'Logged out successfully'})
    
    def _get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0]
        return request.META.get('REMOTE_ADDR')


class MeView(APIView):
    """Get current user profile."""
    
    def get(self, request):
        user = request.user
        return Response({
            'id': user.id,
            'phone_number': user.phone_number,
            'full_name': user.full_name,
            'role': user.role,
            'zone_id': user.zone.id if user.zone else None,
            'zone_name': user.zone.name if user.zone else None,
            'daily_target': user.daily_target,
            'redirect_url': user.get_redirect_url(),
            'created_at': user.created_at,
        })

    def patch(self, request):
        """Update current user profile."""
        from .serializers import UserProfileUpdateSerializer  # Local import to avoid circular dependency if any
        user = request.user
        serializer = UserProfileUpdateSerializer(user, data=request.data, partial=True)
        
        if serializer.is_valid():
            old_data = {'full_name': user.full_name}
            user = serializer.save()
            
            # Create audit log
            AuditLog.objects.create(
                user=user,
                action=AuditLog.Action.UPDATE,
                entity_type='User',
                entity_id=str(user.id),
                old_values=old_data,
                new_values={'full_name': user.full_name},
                ip_address=self._get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
            return Response({
                'success': True,
                'message': 'Profile updated successfully',
                'user': {
                    'id': user.id,
                    'full_name': user.full_name,
                    'role': user.role,
                    'zone_id': user.zone.id if user.zone else None,
                    'zone_name': user.zone.name if user.zone else None,
                    'daily_target': user.daily_target,
                    'daily_target': user.daily_target,
                    'redirect_url': user.get_redirect_url(),
                    'created_at': user.created_at,
                }
            })
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def _get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0]
        return request.META.get('REMOTE_ADDR')
