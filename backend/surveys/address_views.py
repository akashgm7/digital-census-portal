"""
Address views for pincode validation and address management.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import MasterAddress
from .serializers import MasterAddressSerializer, MasterAddressUpdateSerializer
from accounts.permissions import IsSurveyor, IsAdmin, IsAdminOrSupervisor, DataIsolationMixin
from rest_framework.permissions import IsAuthenticated


class MasterAddressViewSet(viewsets.ModelViewSet):
    """
    Address management with zone/pincode validation.
    
    Surveyors can:
    - List addresses for their pincode/zone
    - Mark address status (new/demolished/modified)
    
    Admins can:
    - Full CRUD on addresses
    """
    queryset = MasterAddress.objects.select_related('zone').all()
    pagination_class = None  # Return all addresses without pagination
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdmin()]
        return [IsAuthenticated()]
    
    def get_serializer_class(self):
        if self.action in ['update', 'partial_update', 'mark_status']:
            return MasterAddressUpdateSerializer
        return MasterAddressSerializer
    
    def get_queryset(self):
        """
        Admin: all addresses
        Supervisor/Surveyor: only their zone's addresses
        """
        queryset = super().get_queryset()
        user = self.request.user
        
        if not user.is_authenticated:
            return queryset.none()
        
        # Admin sees everything, others see only their zone
        if user.role != 'ADMIN' and user.zone:
            queryset = queryset.filter(zone=user.zone)
        elif user.role != 'ADMIN' and not user.zone:
            return queryset.none()
        
        # Filter by pincode if provided
        pincode = self.request.query_params.get('pincode')
        if pincode:
            queryset = queryset.filter(pincode=pincode)
        
        # Filter by status if provided, else exclude demolished
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        else:
            queryset = queryset.exclude(status='DEMOLISHED')
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def validate_pincode(self, request):
        """
        Validate pincode against surveyor's assigned zone.
        Returns addresses if valid, error if not in zone.
        """
        pincode = request.query_params.get('pincode')
        user = request.user
        
        if not pincode:
            return Response(
                {'error': 'Pincode is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if pincode matches user's zone code in a case-insensitive way (just to be safe)
        if user.role != 'ADMIN':
            # Check if user has a zone and if the pincode matches
            if not user.zone or user.zone.code != pincode:
                 return Response(
                    {'error': f'Pincode {pincode} does not match your assigned zone ({user.zone.code if user.zone else "No Zone"}).'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Fetch addresses if they exist (for suggestions)
            addresses = MasterAddress.objects.filter(
                zone=user.zone,
                pincode=pincode
            ).exclude(status='DEMOLISHED')

        else:
            addresses = MasterAddress.objects.filter(pincode=pincode).exclude(status='DEMOLISHED')
        
        serializer = MasterAddressSerializer(addresses, many=True)
        return Response({
            'valid': True,
            'pincode': pincode,
            'addresses': serializer.data
        })
    
    @action(detail=True, methods=['post'])
    def mark_status(self, request, pk=None):
        """
        Mark address status (new/demolished/modified).
        Flags for backend review.
        """
        address = self.get_object()
        user = request.user
        
        new_status = request.data.get('status')
        
        if new_status not in ['NEW', 'DEMOLISHED', 'MODIFIED']:
            return Response(
                {'error': 'Invalid status. Must be NEW, DEMOLISHED, or MODIFIED.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        old_status = address.status
        address.status = new_status
        address.needs_review = True
        address.save()
        
        return Response({
            'success': True,
            'message': f'Address marked as {new_status}. Flagged for review.',
            'old_status': old_status,
            'new_status': new_status
        })
