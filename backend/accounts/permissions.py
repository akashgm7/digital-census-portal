"""
Role-based permission classes for the Digital Census Portal.
Enforces strict RBAC on backend - never trust frontend alone.
"""
from rest_framework import permissions


class IsAdmin(permissions.BasePermission):
    """
    Permission class for ADMIN role only.
    Full system visibility.
    """
    message = 'Admin access required.'
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'ADMIN'
        )


class IsSupervisor(permissions.BasePermission):
    """
    Permission class for SUPERVISOR role.
    Zone-restricted access.
    """
    message = 'Supervisor access required.'
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'SUPERVISOR'
        )


class IsSurveyor(permissions.BasePermission):
    """
    Permission class for SURVEYOR role.
    Self-restricted access only.
    """
    message = 'Surveyor access required.'
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'SURVEYOR'
        )


class IsAdminOrSupervisor(permissions.BasePermission):
    """
    Permission for ADMIN or SUPERVISOR roles.
    Used for analytics and verification endpoints.
    """
    message = 'Admin or Supervisor access required.'
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role in ['ADMIN', 'SUPERVISOR']
        )


class IsSupervisorOrSurveyor(permissions.BasePermission):
    """
    Permission for SUPERVISOR or SURVEYOR roles.
    Used for survey-related endpoints.
    """
    message = 'Supervisor or Surveyor access required.'
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role in ['SUPERVISOR', 'SURVEYOR']
        )


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Object-level permission to only allow owners or admins.
    Used for survey editing - surveyors can only edit their own.
    """
    message = 'You do not have permission to access this resource.'
    
    def has_object_permission(self, request, view, obj):
        if request.user.role == 'ADMIN':
            return True
        
        # Check if the object has a surveyor field
        if hasattr(obj, 'surveyor'):
            return obj.surveyor == request.user
        
        # Check if the object has a user field
        if hasattr(obj, 'user'):
            return obj.user == request.user
        
        return False


class IsZoneRestricted(permissions.BasePermission):
    """
    Permission that enforces zone-based access for supervisors.
    Supervisors can only access resources in their assigned zone.
    """
    message = 'Access denied. Resource not in your zone.'
    
    def has_object_permission(self, request, view, obj):
        if request.user.role == 'ADMIN':
            return True
        
        if request.user.role == 'SUPERVISOR':
            # Check if object has a zone field
            if hasattr(obj, 'zone'):
                return obj.zone == request.user.zone
            if hasattr(obj, 'zone_id'):
                return obj.zone_id == request.user.zone_id
        
        return True  # Surveyors handled by IsOwnerOrAdmin


class DataIsolationMixin:
    """
    Mixin for ViewSets to enforce data isolation.
    
    - Surveyor: WHERE surveyor_id = request.user
    - Supervisor: WHERE zone_id = request.user.zone_id
    - Admin: No restriction
    """
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        if not user.is_authenticated:
            return queryset.none()
        
        if user.role == 'ADMIN':
            return queryset
        
        if user.role == 'SUPERVISOR':
            # Filter by zone
            if hasattr(queryset.model, 'zone'):
                return queryset.filter(zone=user.zone)
            if hasattr(queryset.model, 'zone_id'):
                return queryset.filter(zone_id=user.zone_id)
        
        if user.role == 'SURVEYOR':
            # Filter by surveyor (owner)
            if hasattr(queryset.model, 'surveyor'):
                return queryset.filter(surveyor=user)
            if hasattr(queryset.model, 'user'):
                return queryset.filter(user=user)
        
        return queryset.none()
