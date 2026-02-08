"""
Survey models for the Digital Census Portal.
Implements MasterAddress and SurveyResponse with audit trail.
"""
import uuid
from django.db import models
from django.conf import settings
from accounts.models import User, Zone


class MasterAddress(models.Model):
    """
    Master address database for census operations.
    Pre-loaded by administration, validated against zone/pincode.
    """
    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        DEMOLISHED = 'DEMOLISHED', 'Demolished'
        NEW = 'NEW', 'New Structure'
        MODIFIED = 'MODIFIED', 'Modified'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    zone = models.ForeignKey(Zone, on_delete=models.CASCADE, related_name='addresses')
    pincode = models.CharField(max_length=10, db_index=True)
    address_line1 = models.CharField(max_length=255)
    address_line2 = models.CharField(max_length=255, blank=True)
    landmark = models.CharField(max_length=255, blank=True)
    building_number = models.CharField(max_length=50, blank=True)
    floor_number = models.CharField(max_length=20, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    
    # Geo coordinates
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    
    # Metadata
    needs_review = models.BooleanField(default=False)  # Flag for backend review
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'master_addresses'
        ordering = ['pincode', 'address_line1']
        indexes = [
            models.Index(fields=['pincode']),
            models.Index(fields=['zone', 'pincode']),
        ]
    
    def __str__(self):
        return f"{self.address_line1}, {self.pincode}"


class SurveyResponse(models.Model):
    """
    Survey response submitted by surveyors.
    Includes all household data, GPS capture, and audit trail.
    """
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        SUBMITTED = 'SUBMITTED', 'Submitted'
        VERIFIED = 'VERIFIED', 'Verified'
        FLAGGED = 'FLAGGED', 'Flagged'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Relationships
    surveyor = models.ForeignKey(User, on_delete=models.PROTECT, related_name='surveys')
    zone = models.ForeignKey(Zone, on_delete=models.PROTECT, related_name='surveys')
    address = models.ForeignKey(
        MasterAddress, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='surveys'
    )
    
    # Status tracking
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    
    # Location fields
    pincode = models.CharField(max_length=10)
    address_line = models.TextField()
    
    # GPS capture (on submit)
    gps_latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    gps_longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    location_warning = models.BooleanField(default=False)  # True if >5m from zone center
    
    # ===== HOUSEHOLD DATA =====
    
    # Head of household
    head_name = models.CharField(max_length=255)
    head_gender = models.CharField(max_length=10, choices=[
        ('MALE', 'Male'),
        ('FEMALE', 'Female'),
        ('OTHER', 'Other'),
    ])
    head_age = models.PositiveIntegerField()
    head_phone = models.CharField(max_length=15, blank=True)
    head_aadhar = models.CharField(max_length=12, blank=True)  # Encrypted in production
    head_occupation = models.CharField(max_length=100, blank=True)
    head_education = models.CharField(max_length=100, blank=True)
    
    # Family composition
    total_members = models.PositiveIntegerField(default=1)
    male_members = models.PositiveIntegerField(default=0)
    female_members = models.PositiveIntegerField(default=0)
    other_members = models.PositiveIntegerField(default=0)
    children_under_5 = models.PositiveIntegerField(default=0)
    children_5_to_18 = models.PositiveIntegerField(default=0)
    senior_citizens = models.PositiveIntegerField(default=0)
    
    # Economic indicators
    annual_income = models.CharField(max_length=50, blank=True)  # Income bracket
    ration_card_type = models.CharField(max_length=50, blank=True)
    owns_vehicle = models.BooleanField(default=False)
    vehicle_type = models.CharField(max_length=50, blank=True)
    
    # Housing
    ownership_type = models.CharField(max_length=50, blank=True)  # Own, Rent, etc.
    house_type = models.CharField(max_length=50, blank=True)  # Pucca, Kutcha, etc.
    rooms_count = models.PositiveIntegerField(default=1)
    has_electricity = models.BooleanField(default=True)
    has_water_connection = models.BooleanField(default=False)
    has_toilet = models.BooleanField(default=False)
    has_lpg = models.BooleanField(default=False)
    
    # Government schemes
    schemes_availed = models.JSONField(default=list, blank=True)
    
    # ===== MEMBER DETAILS (JSON array) =====
    family_members = models.JSONField(default=list, blank=True)
    # Each member: { name, relation, gender, age, education, occupation, phone, aadhar }
    
    # ===== TIMESTAMPS & AUDIT =====
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='verified_surveys'
    )
    
    # Audit trail (JSON log of all edits)
    audit_trail = models.JSONField(default=list, blank=True)
    
    class Meta:
        db_table = 'survey_responses'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['surveyor']),
            models.Index(fields=['zone']),
            models.Index(fields=['status']),
            models.Index(fields=['submitted_at']),
            models.Index(fields=['pincode']),
        ]
    
    def __str__(self):
        return f"Survey {self.id} - {self.head_name} ({self.status})"
    
    @property
    def is_editable(self):
        """Survey is editable only if not verified."""
        return self.status != self.Status.VERIFIED
    
    @property
    def survey_date(self):
        """Return the date of submission or creation."""
        return (self.submitted_at or self.created_at).date()
    
    def add_audit_entry(self, user, action, changes=None):
        """Add an entry to the audit trail."""
        from django.utils import timezone
        entry = {
            'timestamp': timezone.now().isoformat(),
            'user_id': str(user.id),
            'user_name': user.full_name,
            'action': action,
            'changes': changes or {}
        }
        self.audit_trail.append(entry)
        self.save(update_fields=['audit_trail'])


class DailyProgress(models.Model):
    """
    Daily progress tracking for surveyors.
    Reset at midnight server time (IST).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    surveyor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='daily_progress')
    date = models.DateField()
    surveys_completed = models.PositiveIntegerField(default=0)
    target = models.PositiveIntegerField()
    
    class Meta:
        db_table = 'daily_progress'
        unique_together = ['surveyor', 'date']
        ordering = ['-date']
    
    def __str__(self):
        return f"{self.surveyor.full_name} - {self.date}: {self.surveys_completed}/{self.target}"
    
    @property
    def completion_percentage(self):
        if self.target == 0:
            return 0
        return min(100, int((self.surveys_completed / self.target) * 100))
    
    @property
    def is_target_met(self):
        return self.surveys_completed >= self.target
