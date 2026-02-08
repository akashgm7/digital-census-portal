"""
User and Zone models for the Digital Census Portal.
Implements strict RBAC with ADMIN, SUPERVISOR, SURVEYOR roles.
"""
import uuid
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models
from django.utils import timezone


class Zone(models.Model):
    """
    Geographic zone for census operations.
    Supervisors and Surveyors are assigned to specific zones.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, unique=True)
    center_latitude = models.DecimalField(max_digits=10, decimal_places=7)
    center_longitude = models.DecimalField(max_digits=10, decimal_places=7)
    radius_meters = models.PositiveIntegerField(default=500)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'zones'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code})"


class UserManager(BaseUserManager):
    """Custom user manager for phone-based authentication."""
    
    def create_user(self, phone_number, full_name, role='SURVEYOR', **extra_fields):
        if not phone_number:
            raise ValueError('Phone number is required')
        
        user = self.model(
            phone_number=phone_number,
            full_name=full_name,
            role=role,
            **extra_fields
        )
        user.set_unusable_password()
        user.save(using=self._db)
        return user
    
    def create_superuser(self, phone_number, full_name, **extra_fields):
        extra_fields.setdefault('role', 'ADMIN')
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        
        return self.create_user(phone_number, full_name, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom user model with phone-based authentication and role-based access.
    Uses UUID primary key for security.
    """
    class Role(models.TextChoices):
        ADMIN = 'ADMIN', 'Administrator'
        SUPERVISOR = 'SUPERVISOR', 'Supervisor'
        SURVEYOR = 'SURVEYOR', 'Surveyor'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phone_number = models.CharField(max_length=15, unique=True, db_index=True)
    full_name = models.CharField(max_length=255)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.SURVEYOR)
    zone = models.ForeignKey(
        Zone, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='users'
    )
    daily_target = models.PositiveIntegerField(default=10)
    
    # Status fields
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_login = models.DateTimeField(null=True, blank=True)
    
    # Firebase UID for token verification
    firebase_uid = models.CharField(max_length=128, null=True, blank=True, unique=True)
    
    objects = UserManager()
    
    USERNAME_FIELD = 'phone_number'
    REQUIRED_FIELDS = ['full_name']
    
    class Meta:
        db_table = 'users'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['phone_number']),
            models.Index(fields=['role']),
            models.Index(fields=['zone']),
        ]
    
    def __str__(self):
        return f"{self.full_name} ({self.phone_number})"
    
    @property
    def is_admin(self):
        return self.role == self.Role.ADMIN
    
    @property
    def is_supervisor(self):
        return self.role == self.Role.SUPERVISOR
    
    @property
    def is_surveyor(self):
        return self.role == self.Role.SURVEYOR
    
    def get_redirect_url(self):
        """Return the appropriate dashboard URL based on role."""
        redirects = {
            'ADMIN': '/admin/dashboard',
            'SUPERVISOR': '/supervisor/dashboard',
            'SURVEYOR': '/surveyor/dashboard',
        }
        return redirects.get(self.role, '/login')


class AuditLog(models.Model):
    """
    Audit trail for all user actions.
    Required for government compliance.
    """
    class Action(models.TextChoices):
        CREATE = 'CREATE', 'Created'
        UPDATE = 'UPDATE', 'Updated'
        DELETE = 'DELETE', 'Deleted'
        LOGIN = 'LOGIN', 'Logged In'
        LOGOUT = 'LOGOUT', 'Logged Out'
        VERIFY = 'VERIFY', 'Verified'
        SUBMIT = 'SUBMIT', 'Submitted'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='audit_logs')
    action = models.CharField(max_length=20, choices=Action.choices)
    entity_type = models.CharField(max_length=100)
    entity_id = models.CharField(max_length=100)
    old_values = models.JSONField(null=True, blank=True)
    new_values = models.JSONField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'audit_logs'
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.user} - {self.action} - {self.entity_type}"
