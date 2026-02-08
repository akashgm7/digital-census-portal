"""
Firebase Authentication backend for Django REST Framework.
Verifies Firebase JWT tokens and maps to Django users.
"""
from rest_framework import authentication, exceptions
from django.conf import settings
import os


# Initialize Firebase Admin SDK (only once)
def _init_firebase():
    """Initialize Firebase only if not in dev mode and credentials available."""
    # Check if we're in dev mode
    if getattr(settings, 'FIREBASE_AUTH_DEV_MODE', False):
        return False
    
    import firebase_admin
    from firebase_admin import credentials
    
    if firebase_admin._apps:
        return True
    
    # Check if we have a service account file
    service_account_path = os.path.join(settings.BASE_DIR, 'firebase-service-account.json')
    
    if os.path.exists(service_account_path):
        cred = credentials.Certificate(service_account_path)
        firebase_admin.initialize_app(cred)
        return True
    elif settings.FIREBASE_CONFIG.get('PRIVATE_KEY'):
        # Use environment variables only if private key is set
        cred = credentials.Certificate({
            "type": "service_account",
            "project_id": settings.FIREBASE_CONFIG['PROJECT_ID'],
            "private_key_id": settings.FIREBASE_CONFIG['PRIVATE_KEY_ID'],
            "private_key": settings.FIREBASE_CONFIG['PRIVATE_KEY'],
            "client_email": settings.FIREBASE_CONFIG['CLIENT_EMAIL'],
            "client_id": settings.FIREBASE_CONFIG['CLIENT_ID'],
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
        })
        firebase_admin.initialize_app(cred)
        return True
    
    return False

# Try to initialize, but don't fail if in dev mode
FIREBASE_INITIALIZED = _init_firebase()


class FirebaseAuthentication(authentication.BaseAuthentication):
    """
    Custom authentication class that verifies Firebase JWT tokens.
    
    Flow:
    1. Extract token from Authorization header
    2. Verify token with Firebase Admin SDK
    3. Map Firebase UID/phone to Django user
    4. Return user if valid and active
    """
    
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        
        if not auth_header.startswith('Bearer '):
            return None
        
        token = auth_header.split('Bearer ')[1]
        
        if not token:
            return None
        
        try:
            # Verify Firebase token
            decoded_token = self._verify_firebase_token(token)
            
            if not decoded_token:
                return None
            
            # Get user from database
            user = self._get_user_from_token(decoded_token)
            
            if not user:
                raise exceptions.AuthenticationFailed('User not found in system.')
            
            if not user.is_active:
                raise exceptions.AuthenticationFailed('User account is blocked.')
            
            return (user, decoded_token)
            
        except exceptions.AuthenticationFailed:
            raise
        except Exception as e:
            raise exceptions.AuthenticationFailed(f'Invalid token: {str(e)}')
    
    def _verify_firebase_token(self, token):
        """Verify Firebase JWT token."""
        try:
            # Check if Firebase is initialized
            if not FIREBASE_INITIALIZED:
                # Development mode - decode without verification
                return self._decode_dev_token(token)
            
            from firebase_admin import auth
            decoded_token = auth.verify_id_token(token)
            return decoded_token
        except Exception as e:
            raise exceptions.AuthenticationFailed(f'Token verification failed: {str(e)}')
    
    def _decode_dev_token(self, token):
        """
        Development mode token decoder.
        Decodes base64 JSON tokens used in dev mode.
        """
        import base64
        import json
        try:
            # First try base64 JSON decode (our dev token format)
            decoded_json = base64.b64decode(token).decode('utf-8')
            return json.loads(decoded_json)
        except Exception:
            pass
        
        # Fallback to JWT decode
        import jwt
        try:
            decoded = jwt.decode(token, options={"verify_signature": False})
            return decoded
        except:
            return None
    
    def _get_user_from_token(self, decoded_token):
        """Get Django user from Firebase token claims."""
        from .models import User
        
        # Firebase phone auth stores phone in 'phone_number' claim
        phone_number = decoded_token.get('phone_number')
        firebase_uid = decoded_token.get('uid') or decoded_token.get('user_id')
        
        if phone_number:
            try:
                user = User.objects.get(phone_number=phone_number)
                # Update Firebase UID if not set
                if firebase_uid and not user.firebase_uid:
                    user.firebase_uid = firebase_uid
                    user.save(update_fields=['firebase_uid'])
                return user
            except User.DoesNotExist:
                return None
        
        if firebase_uid:
            try:
                return User.objects.get(firebase_uid=firebase_uid)
            except User.DoesNotExist:
                return None
        
        return None
    
    def authenticate_header(self, request):
        return 'Bearer'
